from django.conf import settings
from django.db import models
from django.utils import timezone


class Transaction(models.Model):
    TX_TYPES = (
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('transfer', 'Transfer'),
    )

    CHANNELS = (
        ('internal', 'Internal'),
        ('mpesa', 'M-Pesa'),
    )

    STATUSES = (
        ('pending', 'Pending'),
        ('successful', 'Successful'),
        ('failed', 'Failed'),
    )

    tx_type = models.CharField(max_length=20, choices=TX_TYPES)
    channel = models.CharField(max_length=20, choices=CHANNELS, default='internal')
    status = models.CharField(max_length=20, choices=STATUSES, default='pending')

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_transactions'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_transactions'
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True)  # mpesa code or internal ref
    narration = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.tx_type} - {self.amount} - {self.status}"
