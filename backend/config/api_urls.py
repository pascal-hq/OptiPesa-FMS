from rest_framework.routers import DefaultRouter
from departments.views import DepartmentViewSet
from employees.views import EmployeeViewSet
from services.views import ServiceViewSet
from expenses.views import ExpenseViewSet


router = DefaultRouter()
router.register(r"departments", DepartmentViewSet, basename="departments")
router.register(r"employees", EmployeeViewSet, basename="employees")
router.register(r"services", ServiceViewSet, basename="services")
router.register(r"expenses", ExpenseViewSet, basename="expenses")

urlpatterns = router.urls
