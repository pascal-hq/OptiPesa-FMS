from rest_framework.routers import DefaultRouter
from departments.views import DepartmentViewSet
from employees.views import EmployeeViewSet
from services.views import ServiceViewSet

router = DefaultRouter()
router.register(r"departments", DepartmentViewSet, basename="departments")
router.register(r"employees", EmployeeViewSet, basename="employees")
router.register(r"services", ServiceViewSet, basename="services")

urlpatterns = router.urls
