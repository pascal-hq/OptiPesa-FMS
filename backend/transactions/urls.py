from django.urls import path
from .views import DepositAPIView, TransferAPIView, WithdrawAPIView, TransactionHistoryAPIView, SaleAPIView

urlpatterns = [
    path('transactions/deposit/', DepositAPIView.as_view(), name='deposit'),
    path('transactions/transfer/', TransferAPIView.as_view(), name='transfer'),
    path('transactions/withdraw/', WithdrawAPIView.as_view(), name='withdraw'),
    path('transactions/', TransactionHistoryAPIView.as_view(), name='tx-history'),
    path('transactions/sale/', SaleAPIView.as_view(), name='sale'),

]
