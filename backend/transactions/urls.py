from django.urls import path
from .views import DepositAPIView

urlpatterns = [
    path('transactions/deposit/', DepositAPIView.as_view(), name='deposit'),
]
