from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .models import Account
from transactions.models import Transaction
from users.permissions import IsAdminOnly
from django.contrib.auth import get_user_model

User = get_user_model()


class AccountActivityAPIView(APIView):
    """
    Admin only.
    Returns all accounts with their balances and recent transactions.
    """
    permission_classes = [IsAdminOnly]

    def get(self, request):
        accounts = Account.objects.select_related("user").all().order_by("user__username")

        data = []
        for acc in accounts:
            txs = Transaction.objects.filter(
                Q(sender=acc.user) | Q(receiver=acc.user)
            ).order_by("-created_at")[:10]

            tx_data = [{
                "id": t.id,
                "tx_type": t.tx_type,
                "channel": t.channel,
                "status": t.status,
                "amount": str(t.amount),
                "sender": t.sender.username if t.sender else None,
                "receiver": t.receiver.username if t.receiver else None,
                "narration": t.narration,
                "created_at": t.created_at.isoformat(),
            } for t in txs]

            data.append({
                "user_id": acc.user.id,
                "username": acc.user.username,
                "role": acc.user.role,
                "account_number": acc.account_number,
                "balance": str(acc.balance),
                "recent_transactions": tx_data,
            })

        return Response(data, status=status.HTTP_200_OK)