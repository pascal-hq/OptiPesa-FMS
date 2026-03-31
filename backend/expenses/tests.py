from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from departments.models import Department
from expenses.models import Expense

User = get_user_model()

class ExpenseModelTest(TestCase):

    def setUp(self):
        self.dept = Department.objects.create(name="Salon")
        self.user = User.objects.create_user(
            username="admin", password="admin1234", role="admin"
        )

    def test_create_expense(self):
        expense = Expense.objects.create(
            department=self.dept,
            amount=2500,
            description="Electricity bill",
            expense_date="2026-03-01",
            recorded_by=self.user
        )
        self.assertEqual(expense.amount, 2500)
        self.assertEqual(expense.description, "Electricity bill")

    def test_expense_str(self):
        expense = Expense.objects.create(
            department=self.dept,
            amount=1500,
            description="Supplies",
            expense_date="2026-03-01"
        )
        self.assertIn("Salon", str(expense))
        self.assertIn("1500", str(expense))


class ExpenseAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin", password="admin1234", role="admin"
        )
        self.staff = User.objects.create_user(
            username="staff", password="staff1234", role="staff"
        )
        self.dept = Department.objects.create(name="Salon")

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_create_expense(self):
        self._auth(self.admin)
        res = self.client.post("/api/expenses/", {
            "department": self.dept.id,
            "amount": "2500.00",
            "description": "Electricity",
            "expense_date": "2026-03-01"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_recorded_by_set_automatically(self):
        self._auth(self.admin)
        res = self.client.post("/api/expenses/", {
            "department": self.dept.id,
            "amount": "1000.00",
            "description": "Water bill",
            "expense_date": "2026-03-01"
        })
        self.assertEqual(res.data["recorded_by_username"], "admin")

    def test_invalid_amount_rejected(self):
        self._auth(self.admin)
        res = self.client.post("/api/expenses/", {
            "department": self.dept.id,
            "amount": "-100.00",
            "description": "Invalid",
            "expense_date": "2026-03-01"
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_can_create_expense(self):
        self._auth(self.staff)
        res = self.client.post("/api/expenses/", {
            "department": self.dept.id,
            "amount": "500.00",
            "description": "Supplies",
            "expense_date": "2026-03-01"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)