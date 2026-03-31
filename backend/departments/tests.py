from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from departments.models import Department

User = get_user_model()

class DepartmentModelTest(TestCase):

    def test_create_department(self):
        dept = Department.objects.create(
            name="Salon",
            description="Hair styling services"
        )
        self.assertEqual(dept.name, "Salon")
        self.assertTrue(dept.is_active)

    def test_department_str(self):
        dept = Department.objects.create(name="Spa")
        self.assertEqual(str(dept), "Spa")

    def test_duplicate_department_name_raises_error(self):
        Department.objects.create(name="Barbershop")
        with self.assertRaises(Exception):
            Department.objects.create(name="Barbershop")


class DepartmentAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin", password="admin1234", role="admin"
        )
        self.staff = User.objects.create_user(
            username="staff", password="staff1234", role="staff"
        )
        self.dept = Department.objects.create(name="Salon", description="Hair")

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_admin_can_create_department(self):
        self._auth(self.admin)
        res = self.client.post("/api/departments/", {"name": "Spa", "description": "Spa services"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_staff_cannot_create_department(self):
        self._auth(self.staff)
        res = self.client.post("/api/departments/", {"name": "NewDept"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_departments(self):
        self._auth(self.staff)
        res = self.client.get("/api/departments/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_update_department(self):
        self._auth(self.admin)
        res = self.client.patch(f"/api/departments/{self.dept.id}/", {"name": "Updated Salon"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Updated Salon")

    def test_delete_department(self):
        self._auth(self.admin)
        res = self.client.delete(f"/api/departments/{self.dept.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_unauthenticated_cannot_access(self):
        res = self.client.get("/api/departments/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)