from rest_framework import viewsets
from .models import Service
from .serializers import ServiceSerializer
from users.permissions import IsAdminOrManagerOrReadOnly


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.select_related("department").all().order_by("name")
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrManagerOrReadOnly]
