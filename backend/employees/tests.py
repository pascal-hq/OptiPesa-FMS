from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from departments.models import Department
from employees.models import Employee

User = get_user_model()

class EmployeeModelTest(TestCase):

    def setUp(self):
        self.dept = Department.objects.create(name="Salon")

    def test_create_employee(self):
        emp = Employee.objects.create(
            department=self.dept,
            full_name="Jane Wambui",
            phone="0712345678",
            email="jane@test.com"
        )
        self.assertEqual(emp.full_name, "Jane Wambui")
        self.assertTrue(emp.is_active)

    def test_employee_str(self):
        emp = Employee.objects.create(
            department=self.dept,
            full_name="John Doe"
        )
        self.assertEqual(str(emp), "John Doe (Salon)")

    def test_duplicate_employee_same_dept_raises_error(self):
        Employee.objects.create(department=self.dept, full_name="Jane Wambui")
        with self.assertRaises(Exception):
            Employee.objects.create(department=self.dept, full_name="Jane Wambui")


class EmployeeAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin", password="admin1234", role="admin"
        )
        self.staff = User.objects.create_user(
            username="staff", password="staff1234", role="staff"
        )
        self.dept = Department.objects.create(name="Salon")
        self.emp = Employee.objects.create(
            department=self.dept,
            full_name="Jane Wambui"
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_admin_can_create_employee(self):
        self._auth(self.admin)
        res = self.client.post("/api/employees/", {
            "department": self.dept.id,
            "full_name": "New Employee",
            "is_active": True
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_staff_cannot_create_employee(self):
        self._auth(self.staff)
        res = self.client.post("/api/employees/", {
            "department": self.dept.id,
            "full_name": "New Employee"
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_employees(self):
        self._auth(self.staff)
        res = self.client.get("/api/employees/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_deactivate_employee(self):
        self._auth(self.admin)
        res = self.client.patch(
            f"/api/employees/{self.emp.id}/",
            {"is_active": False}
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["is_active"])