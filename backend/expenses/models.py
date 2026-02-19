from django.conf import settings
from django.db import models
from departments.models import Department


class Expense(models.Model):
    CATEGORY_CHOICES = (
        ("rent", "Rent"),
        ("utilities", "Utilities"),
        ("supplies", "Supplies/Products"),
        ("salaries", "Salaries/Wages"),
        ("maintenance", "Maintenance"),
        ("marketing", "Marketing"),
        ("other", "Other"),
    )

    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="expenses")
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="expenses_recorded")

    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="other")
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.department.name} - {self.category} - {self.amount}"
