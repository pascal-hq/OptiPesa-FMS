from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from users.models import User
from .serializers import DepositSerializer
from .services import create_deposit


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
