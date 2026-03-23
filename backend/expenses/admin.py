from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("id", "department", "amount", "expense_date", "recorded_by", "created_at")
    list_filter = ("department", "expense_date", "created_at")
    search_fields = ("description", "department__name", "recorded_by__username")
    ordering = ("-expense_date", "-created_at")