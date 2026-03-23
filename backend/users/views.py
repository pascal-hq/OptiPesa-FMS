from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({
            "id": u.id,
            "username": u.username,
            "role": getattr(u, "role", ""),
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
        })