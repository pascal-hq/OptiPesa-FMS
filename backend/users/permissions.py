from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrManager(BasePermission):
    """
    Allows access only to users with role admin or manager.
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, "role", "") in ["admin", "manager"])


class IsAdminOrManagerOrReadOnly(BasePermission):
    """
    Admin/Manager can write. Everyone authenticated can read.
    """
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return True

        return getattr(user, "role", "") in ["admin", "manager"]
