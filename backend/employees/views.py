from rest_framework import viewsets, permissions
from .models import Employee
from .serializers import EmployeeSerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("department").all().order_by("full_name")
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]
