from rest_framework import viewsets, permissions
from .models import Service
from .serializers import ServiceSerializer

class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.select_related("department").all().order_by("name")
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]
