from rest_framework import viewsets
from .models import Service
from .serializers import ServiceSerializer
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdminOnly

class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.select_related("department").all().order_by("name")
    serializer_class = ServiceSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAdminOnly()]