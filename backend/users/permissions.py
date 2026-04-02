from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminOrManager(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and
            getattr(user, "role", "") in ["admin", "manager"]
        )

class IsAdminOrManagerOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return getattr(user, "role", "") in ["admin", "manager"]

class IsAdminOnly(BasePermission):
    """
    Only admin role or superuser can access.
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and
            (user.is_superuser or getattr(user, "role", "") == "admin")
        )