from django.conf import settings
from django.db import models
from departments.models import Department


class Expense(models.Model):
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="expenses",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255)
    expense_date = models.DateField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses_recorded",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-expense_date", "-created_at"]

    def __str__(self):
        return f"{self.department.name} - {self.amount} on {self.expense_date}"