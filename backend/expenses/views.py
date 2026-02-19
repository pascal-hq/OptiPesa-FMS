from rest_framework import viewsets
from .models import Expense
from .serializers import ExpenseSerializer
from users.permissions import IsAdminOrManager


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related("department", "recorded_by").all().order_by("-expense_date")
    serializer_class = ExpenseSerializer
    permission_classes = [IsAdminOrManager]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)
