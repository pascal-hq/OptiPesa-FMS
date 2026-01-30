from django.db import models
from departments.models import Department

class Expense(models.Model):
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='expenses'
    )
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    expense_date = models.DateField()
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.category} - {self.amount}"
