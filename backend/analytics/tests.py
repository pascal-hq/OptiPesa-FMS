from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from departments.models import Department
from employees.models import Employee
from services.models import Service
from expenses.models import Expense
from transactions.services import create_sale, create_deposit

User = get_user_model()

class AnalyticsAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin", password="admin1234", role="admin"
        )
        self.dept = Department.objects.create(name="Salon")
        self.emp = Employee.objects.create(
            department=self.dept, full_name="Jane Wambui"
        )
        self.svc = Service.objects.create(
            department=self.dept, name="Haircut", price=500
        )
        # Create some sales
        create_sale(
            receiver=self.admin,
            amount=5000,
            department=self.dept,
            employee=self.emp,
            service=self.svc
        )
        create_sale(
            receiver=self.admin,
            amount=3000,
            department=self.dept,
            employee=self.emp,
        )
        # Create an expense
        Expense.objects.create(
            department=self.dept,
            amount=2000,
            description="Supplies",
            expense_date="2026-03-01"
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_overview_returns_correct_totals(self):
        self._auth(self.admin)
        res = self.client.get("/api/analytics/overview/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(str(res.data["total_revenue"]), "8000")
        self.assertEqual(str(res.data["total_expenses"]), "2000")
        self.assertEqual(str(res.data["net_profit"]), "6000")
        self.assertEqual(res.data["sales_count"], 2)

    def test_performance_returns_best_department(self):
        self._auth(self.admin)
        res = self.client.get("/api/analytics/performance/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data["best_department"])
        self.assertEqual(
            res.data["best_department"]["department__name"], "Salon"
        )

    def test_performance_returns_best_employee(self):
        self._auth(self.admin)
        res = self.client.get("/api/analytics/performance/")
        self.assertIsNotNone(res.data["best_employee"])
        self.assertEqual(
            res.data["best_employee"]["employee__full_name"], "Jane Wambui"
        )

    def test_trends_returns_data(self):
        self._auth(self.admin)
        res = self.client.get("/api/analytics/trends/?period=month")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("sales_trend", res.data)
        self.assertIn("expenses_trend", res.data)

    def test_overview_with_date_filter(self):
        self._auth(self.admin)
        res = self.client.get(
            "/api/analytics/overview/?start_date=2026-01-01&end_date=2026-12-31"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_access_analytics(self):
        res = self.client.get("/api/analytics/overview/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)