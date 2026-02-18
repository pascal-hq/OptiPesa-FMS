from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from users.models import User
from .serializers import DepositSerializer, TransferSerializer, WithdrawSerializer
from .services import create_deposit, create_transfer, create_withdrawal
from .models import Transaction


class DepositAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        receiver_username = serializer.validated_data["receiver_username"]
        amount = serializer.validated_data["amount"]
        narration = serializer.validated_data.get("narration", "")

        try:
            receiver = User.objects.get(username=receiver_username)
        except User.DoesNotExist:
            return Response(
                {"detail": "Receiver not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        tx = create_deposit(
            receiver=receiver,
            amount=amount,
            channel="internal",
            narration=narration
        )

        return Response(
            {
                "message": "Deposit successful",
                "transaction_id": tx.id,
                "tx_type": tx.tx_type,
                "status": tx.status,
                "amount": str(tx.amount),
                "receiver": receiver.username,
            },
            status=status.HTTP_201_CREATED
        )
class TransferAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        receiver_username = serializer.validated_data["receiver_username"]
        amount = serializer.validated_data["amount"]
        narration = serializer.validated_data.get("narration", "")

        try:
            receiver = User.objects.get(username=receiver_username)
        except User.DoesNotExist:
            return Response({"detail": "Receiver not found."}, status=status.HTTP_404_NOT_FOUND)

        tx = create_transfer(
            sender=request.user,
            receiver=receiver,
            amount=amount,
            narration=narration
        )

        return Response(
            {
                "message": "Transfer successful",
                "transaction_id": tx.id,
                "status": tx.status,
                "amount": str(tx.amount),
                "sender": request.user.username,
                "receiver": receiver.username,
            },
            status=status.HTTP_201_CREATED
        )


class WithdrawAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = WithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amount = serializer.validated_data["amount"]
        narration = serializer.validated_data.get("narration", "")

        tx = create_withdrawal(
            sender=request.user,
            amount=amount,
            channel="internal",
            narration=narration
        )

        return Response(
            {
                "message": "Withdrawal successful",
                "transaction_id": tx.id,
                "status": tx.status,
                "amount": str(tx.amount),
                "sender": request.user.username,
            },
            status=status.HTTP_201_CREATED
        )


class TransactionHistoryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Transaction.objects.filter(sender=request.user) | Transaction.objects.filter(receiver=request.user)
        qs = qs.order_by("-created_at")[:200]  # limit for performance

        data = []
        for t in qs:
            data.append({
                "id": t.id,
                "tx_type": t.tx_type,
                "channel": t.channel,
                "status": t.status,
                "sender": t.sender.username if t.sender else None,
                "receiver": t.receiver.username if t.receiver else None,
                "amount": str(t.amount),
                "reference": t.reference,
                "narration": t.narration,
                "created_at": t.created_at.isoformat(),
            })

        return Response(data, status=status.HTTP_200_OK)
