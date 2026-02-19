from django.contrib import admin
from .models import Expense

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("department", "category", "amount", "expense_date", "recorded_by")
    list_filter = ("department", "category", "expense_date")
    search_fields = ("description",)
