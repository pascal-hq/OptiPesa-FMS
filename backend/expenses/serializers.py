from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    recorded_by_username = serializers.CharField(source="recorded_by.username", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "department",
            "department_name",
            "amount",
            "description",
            "expense_date",
            "recorded_by",
            "recorded_by_username",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "department_name",
            "recorded_by",
            "recorded_by_username",
            "created_at",
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value