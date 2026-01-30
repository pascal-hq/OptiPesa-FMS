from django.db import models
from departments.models import Department
from employees.models import Employee
from services.models import Service

class Transaction(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transaction {self.id} - {self.amount}"

class Payment(models.Model):
    PAYMENT_METHODS = (
        ('cash', 'Cash'),
        ('mpesa', 'M-Pesa'),
        ('card', 'Card'),
    )

    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.CASCADE,
        related_name='payment'
    )
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    reference_code = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, default='completed')
    payment_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.method} - {self.transaction.id}"
