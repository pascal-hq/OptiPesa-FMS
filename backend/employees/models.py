from django.db import models
from departments.models import Department

class Employee(models.Model):
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="employees")
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    hired_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("department", "full_name")

    def __str__(self):
        return f"{self.full_name} ({self.department.name})"
