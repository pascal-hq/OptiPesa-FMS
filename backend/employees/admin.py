from django.contrib import admin
from .models import Employee

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("full_name", "department", "phone", "is_active")
    list_filter = ("department", "is_active")
    search_fields = ("full_name", "phone", "email")
