from django.db import models
from departments.models import Department

class Service(models.Model):
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="services")
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    duration_minutes = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("department", "name")

    def __str__(self):
        return f"{self.name} - {self.department.name}"
