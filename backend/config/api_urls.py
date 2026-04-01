from django.urls import path
from rest_framework.routers import DefaultRouter
from departments.views import DepartmentViewSet
from employees.views import EmployeeViewSet
from services.views import ServiceViewSet
from expenses.views import ExpenseViewSet
from users.views import (
    MeAPIView,
    UserListCreateAPIView,
    UserDetailAPIView,
    ChangePasswordAPIView
)
from transactions.views import (
    DepositAPIView,
    TransferAPIView,
    WithdrawAPIView,
    TransactionHistoryAPIView,
    SaleAPIView,
    TransactionReceiptAPIView,
)

router = DefaultRouter()
router.register(r"departments", DepartmentViewSet, basename="departments")
router.register(r"employees", EmployeeViewSet, basename="employees")
router.register(r"services", ServiceViewSet, basename="services")
router.register(r"expenses", ExpenseViewSet, basename="expenses")

urlpatterns = router.urls + [
    path("me/", MeAPIView.as_view(), name="me"),
    path("users/", UserListCreateAPIView.as_view(), name="users"),
    path("users/<int:pk>/", UserDetailAPIView.as_view(), name="user-detail"),
    path("change-password/", ChangePasswordAPIView.as_view(), name="change-password"),
    path("transactions/receipt/<int:pk>/", TransactionReceiptAPIView.as_view(), name="transaction-receipt"),
]