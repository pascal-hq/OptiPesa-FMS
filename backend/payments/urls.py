from django.urls import path
from .views import STKPushAPIView, STKCallbackAPIView

urlpatterns = [
    path("mpesa/stk-push/", STKPushAPIView.as_view(), name="mpesa-stk-push"),
    path("mpesa/callback/", STKCallbackAPIView.as_view(), name="mpesa-stk-callback"),
]