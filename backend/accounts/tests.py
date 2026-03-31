from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.models import Account

User = get_user_model()

class AccountModelTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="test1234",
            role="staff"
        )

    def test_account_auto_created_on_user_creation(self):
        # Account should be auto-created via signal
        self.assertTrue(Account.objects.filter(user=self.user).exists())

    def test_account_initial_balance_is_zero(self):
        account = Account.objects.get(user=self.user)
        self.assertEqual(account.balance, 0)

    def test_account_number_is_unique(self):
        user2 = User.objects.create_user(
            username="testuser2",
            password="test1234",
            role="staff"
        )
        account1 = Account.objects.get(user=self.user)
        account2 = Account.objects.get(user=user2)
        self.assertNotEqual(account1.account_number, account2.account_number)

    def test_account_str(self):
        account = Account.objects.get(user=self.user)
        self.assertIn("testuser", str(account))