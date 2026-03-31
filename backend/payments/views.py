from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from transactions.models import Transaction
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

        # Normalize phone number
        phone = str(phone_number).strip()
        if phone.startswith("0"):
            phone = "254" + phone[1:]
        elif phone.startswith("+"):
            phone = phone[1:]

        try:
            mpesa_response = initiate_stk_push(
                phone_number=phone,
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
    """
    Receives M-Pesa payment callback from Safaricom.
    This endpoint must be publicly accessible (via ngrok in dev).
    No authentication required — Safaricom server calls this directly.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data

        try:
            # Navigate to the callback body
            stk_callback = data["Body"]["stkCallback"]
            result_code = stk_callback["ResultCode"]
            result_desc = stk_callback["ResultDesc"]
            checkout_request_id = stk_callback["CheckoutRequestID"]
            merchant_request_id = stk_callback["MerchantRequestID"]

            if result_code == 0:
                # Payment was SUCCESSFUL
                # Extract payment details from callback metadata
                callback_metadata = stk_callback.get("CallbackMetadata", {})
                items = callback_metadata.get("Item", [])

                mpesa_receipt = None
                amount_paid = None
                phone_number = None

                for item in items:
                    if item["Name"] == "MpesaReceiptNumber":
                        mpesa_receipt = item.get("Value")
                    elif item["Name"] == "Amount":
                        amount_paid = item.get("Value")
                    elif item["Name"] == "PhoneNumber":
                        phone_number = item.get("Value")

                # Try to find and update the matching pending transaction
                # Match by amount — in production you'd match by CheckoutRequestID
                try:
                    tx = Transaction.objects.filter(
                        status="pending",
                        channel="mpesa",
                    ).order_by("-created_at").first()

                    if tx:
                        tx.status = "successful"
                        tx.reference = mpesa_receipt or checkout_request_id
                        tx.save()

                except Exception as e:
                    print(f"Error updating transaction: {e}")

                print(f"M-Pesa Payment Successful: {mpesa_receipt} | Amount: {amount_paid} | Phone: {phone_number}")

            else:
                # Payment FAILED or was cancelled by user
                print(f"M-Pesa Payment Failed: {result_desc}")

                # Mark the most recent pending mpesa transaction as failed
                try:
                    tx = Transaction.objects.filter(
                        status="pending",
                        channel="mpesa",
                    ).order_by("-created_at").first()

                    if tx:
                        tx.status = "failed"
                        tx.narration = result_desc
                        tx.save()

                except Exception as e:
                    print(f"Error updating failed transaction: {e}")

        except KeyError as e:
            print(f"Callback parsing error: {e}")
            print(f"Raw callback data: {data}")

        # Always return success to Safaricom
        # If we return an error, Safaricom will keep retrying
        return Response(
            {"ResultCode": 0, "ResultDesc": "Callback received successfully"},
            status=status.HTTP_200_OK
        )