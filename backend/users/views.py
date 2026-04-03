from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import get_user_model
from users.permissions import IsAdminOrManager, IsAdminOnly

User = get_user_model()


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


class ChangePasswordAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get("current_password", "").strip()
        new_password = request.data.get("new_password", "").strip()
        confirm_password = request.data.get("confirm_password", "").strip()

        if not current_password:
            return Response(
                {"detail": "Current password is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not user.check_password(current_password):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not new_password:
            return Response(
                {"detail": "New password is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(new_password) < 6:
            return Response(
                {"detail": "New password must be at least 6 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if new_password != confirm_password:
            return Response(
                {"detail": "New passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if current_password == new_password:
            return Response(
                {"detail": "New password must be different from current password."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        return Response(
            {"detail": "Password changed successfully. Please log in again."},
            status=status.HTTP_200_OK
        )


class UserListCreateAPIView(APIView):
    """
    GET  — Admin and Manager can list users.
           Manager can see staff and other managers but NOT admins.
    POST — Admin can create any role.
           Manager can only create staff.
    """
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        requesting_role = getattr(request.user, "role", "")
        users = User.objects.all().order_by("username")

        data = []
        for u in users:
            target_role = getattr(u, "role", "")

            # Manager cannot see admin accounts
            if requesting_role == "manager" and (
                target_role == "admin" or u.is_superuser
            ):
                continue

            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "date_joined": u.date_joined.isoformat(),
            })

        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        requesting_role = getattr(request.user, "role", "")
        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "").strip()
        role = request.data.get("role", "staff").strip()

        if not username:
            return Response(
                {"detail": "Username is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not password:
            return Response(
                {"detail": "Password is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(password) < 6:
            return Response(
                {"detail": "Password must be at least 6 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if User.objects.filter(username=username).exists():
            return Response(
                {"detail": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if role not in ["admin", "manager", "staff"]:
            return Response(
                {"detail": "Invalid role. Must be admin, manager or staff."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Manager can only create staff accounts
        if requesting_role == "manager" and role != "staff":
            return Response(
                {"detail": "Managers can only create staff accounts."},
                status=status.HTTP_403_FORBIDDEN
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=role
        )

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
            },
            status=status.HTTP_201_CREATED
        )


class UserDetailAPIView(APIView):
    """
    GET    — Admin and Manager can view a user.
             Manager cannot view admin accounts.
    PATCH  — Admin can edit anyone.
             Manager can only edit staff accounts.
             Manager cannot edit managers or admins.
    DELETE — Admin can delete staff and managers (not other admins).
             Manager can only delete staff accounts.
             Nobody can delete their own account.
             Nobody can delete an admin account.
    """
    permission_classes = [IsAdminOrManager]

    def get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_user(pk)
        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        requesting_role = getattr(request.user, "role", "")
        target_role = getattr(user, "role", "")

        # Manager cannot view admin accounts
        if requesting_role == "manager" and (
            target_role == "admin" or user.is_superuser
        ):
            return Response(
                {"detail": "You do not have permission to view this account."},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "date_joined": user.date_joined.isoformat(),
        })

    def patch(self, request, pk):
        user = self.get_user(pk)
        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        requesting_role = getattr(request.user, "role", "")
        target_role = getattr(user, "role", "")

        # Manager can only edit staff accounts
        if requesting_role == "manager" and target_role != "staff":
            return Response(
                {"detail": "Managers can only edit staff accounts."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Prevent changing your own role
        if user == request.user and "role" in request.data:
            return Response(
                {"detail": "You cannot change your own role."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Manager cannot assign admin or manager roles
        if requesting_role == "manager" and "role" in request.data:
            new_role = request.data["role"]
            if new_role in ["admin", "manager"]:
                return Response(
                    {"detail": "Managers can only assign the staff role."},
                    status=status.HTTP_403_FORBIDDEN
                )

        if "username" in request.data:
            new_username = request.data["username"].strip()
            if User.objects.filter(username=new_username).exclude(pk=pk).exists():
                return Response(
                    {"detail": "Username already taken."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.username = new_username

        if "email" in request.data:
            user.email = request.data["email"].strip()

        if "role" in request.data:
            role = request.data["role"]
            if role not in ["admin", "manager", "staff"]:
                return Response(
                    {"detail": "Invalid role."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.role = role

        if "is_active" in request.data:
            user.is_active = request.data["is_active"]

        if "password" in request.data:
            new_password = request.data["password"].strip()
            if new_password:
                if len(new_password) < 6:
                    return Response(
                        {"detail": "Password must be at least 6 characters."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                user.set_password(new_password)

        user.save()

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        })

    def delete(self, request, pk):
        user = self.get_user(pk)
        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        requesting_role = getattr(request.user, "role", "")
        target_role = getattr(user, "role", "")

        # Nobody can delete their own account
        if user == request.user:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Nobody can delete an admin account
        if target_role == "admin" or user.is_superuser:
            return Response(
                {"detail": "Admin accounts cannot be deleted."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Manager can only delete staff accounts
        if requesting_role == "manager" and target_role != "staff":
            return Response(
                {"detail": "Managers can only delete staff accounts."},
                status=status.HTTP_403_FORBIDDEN
            )

        user.delete()
        return Response(
            {"detail": "User deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )