from django.contrib import admin
from .models import Service

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "department", "price", "duration_minutes", "is_active")
    list_filter = ("department", "is_active")
    search_fields = ("name",)
