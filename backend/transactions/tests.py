from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from departments.models import Department
from employees.models import Employee
from services.models import Service
from transactions.models import Transaction
from transactions.services import (
    create_deposit, create_withdrawal,
    create_transfer, create_sale
)
from accounts.models import Account

User = get_user_model()

class TransactionServicesTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="test1234", role="staff"
        )
        self.user2 = User.objects.create_user(
            username="testuser2", password="test1234", role="staff"
        )
        self.dept = Department.objects.create(name="Salon")
        self.account = Account.objects.get(user=self.user)
        self.account2 = Account.objects.get(user=self.user2)

    def test_deposit_increases_balance(self):
        create_deposit(receiver=self.user, amount=5000)
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, 5000)

    def test_deposit_creates_transaction(self):
        tx = create_deposit(receiver=self.user, amount=3000)
        self.assertEqual(tx.tx_type, "deposit")
        self.assertEqual(tx.status, "successful")
        self.assertEqual(tx.amount, 3000)

    def test_withdrawal_decreases_balance(self):
        create_deposit(receiver=self.user, amount=5000)
        create_withdrawal(sender=self.user, amount=2000)
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, 3000)

    def test_withdrawal_insufficient_balance_raises_error(self):
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            create_withdrawal(sender=self.user, amount=9999)

    def test_transfer_moves_funds(self):
        create_deposit(receiver=self.user, amount=5000)
        create_transfer(sender=self.user, receiver=self.user2, amount=2000)
        self.account.refresh_from_db()
        self.account2.refresh_from_db()
        self.assertEqual(self.account.balance, 3000)
        self.assertEqual(self.account2.balance, 2000)

    def test_transfer_same_user_raises_error(self):
        from django.core.exceptions import ValidationError
        create_deposit(receiver=self.user, amount=5000)
        with self.assertRaises(ValidationError):
            create_transfer(sender=self.user, receiver=self.user, amount=1000)

    def test_sale_creates_transaction(self):
        tx = create_sale(receiver=self.user, amount=1500)
        self.assertEqual(tx.tx_type, "sale")
        self.assertEqual(tx.status, "successful")
        self.assertEqual(tx.amount, 1500)

    def test_sale_zero_amount_raises_error(self):
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            create_sale(receiver=self.user, amount=0)


class TransactionAPITest(TestCase):

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
            department=self.dept, full_name="Jane Wambui"
        )
        self.svc = Service.objects.create(
            department=self.dept, name="Haircut", price=500
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_staff_can_record_sale(self):
        self._auth(self.staff)
        res = self.client.post("/api/transactions/sale/", {
            "department": self.dept.id,
            "employee": self.emp.id,
            "service": self.svc.id,
            "amount": "1500.00",
            "channel": "internal"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["tx_type"], "sale")

    def test_admin_can_deposit(self):
        self._auth(self.admin)
        res = self.client.post("/api/transactions/deposit/", {
            "receiver_username": "staff",
            "amount": "5000.00"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_admin_can_see_all_transactions(self):
        self._auth(self.admin)
        res = self.client.get("/api/transactions/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_access_transactions(self):
        res = self.client.get("/api/transactions/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)