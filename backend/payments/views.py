from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .serializers import STKPushSerializer
from .utils import initiate_stk_push


class STKPushAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = STKPushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone_number = serializer.validated_data["phone_number"]
        amount = serializer.validated_data["amount"]
        account_reference = serializer.validated_data.get("account_reference") or "OptiPesa"
        description = serializer.validated_data.get("description") or "OptiPesa Payment"

        try:
            mpesa_response = initiate_stk_push(
                phone_number=phone_number,
                amount=amount,
                account_reference=account_reference,
                description=description,
            )
        except Exception as e:
            return Response(
                {"detail": f"M-Pesa STK Push failed: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        return Response(mpesa_response, status=status.HTTP_200_OK)
class STKCallbackAPIView(APIView):
    permission_classes = [permissions.AllowAny]  # Safaricom server won't send JWT

    def post(self, request):
        data = request.data  # This will contain Body.stkCallback...

        # TODO: here we'll:
        # - read ResultCode, ResultDesc
        # - get CheckoutRequestID, MerchantRequestID
        # - if success: update related Transaction, mark as successful, credit wallet
        # - if fail: mark as failed

        # For now we just log and return success
        print("M-Pesa STK Callback:", data)

        return Response({"ResultCode": 0, "ResultDesc": "Callback received successfully"}, status=status.HTTP_200_OK)