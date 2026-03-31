from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class UserModelTest(TestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="adminuser",
            password="admin1234",
            role="admin"
        )
        self.staff = User.objects.create_user(
            username="staffuser",
            password="staff1234",
            role="staff"
        )
        self.manager = User.objects.create_user(
            username="manageruser",
            password="manager1234",
            role="manager"
        )

    def test_user_created_with_correct_role(self):
        self.assertEqual(self.admin.role, "admin")
        self.assertEqual(self.staff.role, "staff")
        self.assertEqual(self.manager.role, "manager")

    def test_default_role_is_staff(self):
        user = User.objects.create_user(
            username="defaultuser",
            password="default1234"
        )
        self.assertEqual(user.role, "staff")

    def test_user_str(self):
        self.assertEqual(str(self.admin), "adminuser - admin")
        self.assertEqual(str(self.staff), "staffuser - staff")

    def test_user_is_authenticated(self):
        self.assertTrue(self.admin.is_authenticated)
        self.assertTrue(self.staff.is_authenticated)