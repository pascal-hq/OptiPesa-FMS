from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from departments.models import Department
from services.models import Service

User = get_user_model()

class ServiceModelTest(TestCase):

    def setUp(self):
        self.dept = Department.objects.create(name="Salon")

    def test_create_service(self):
        svc = Service.objects.create(
            department=self.dept,
            name="Haircut",
            price=500
        )
        self.assertEqual(svc.name, "Haircut")
        self.assertEqual(svc.price, 500)
        self.assertTrue(svc.is_active)

    def test_service_str(self):
        svc = Service.objects.create(
            department=self.dept,
            name="Massage",
            price=1500
        )
        self.assertEqual(str(svc), "Massage - Salon")

    def test_duplicate_service_same_dept_raises_error(self):
        Service.objects.create(department=self.dept, name="Haircut", price=500)
        with self.assertRaises(Exception):
            Service.objects.create(department=self.dept, name="Haircut", price=600)


class ServiceAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin", password="admin1234", role="admin"
        )
        self.dept = Department.objects.create(name="Salon")

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_create_service(self):
        self._auth(self.admin)
        res = self.client.post("/api/services/", {
            "department": self.dept.id,
            "name": "Haircut",
            "price": "500.00",
            "is_active": True
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_list_services(self):
        self._auth(self.admin)
        res = self.client.get("/api/services/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_update_service_price(self):
        self._auth(self.admin)
        svc = Service.objects.create(
            department=self.dept, name="Haircut", price=500
        )
        res = self.client.patch(f"/api/services/{svc.id}/", {"price": "700.00"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(str(res.data["price"]), "700.00")