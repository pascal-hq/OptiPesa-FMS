from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from departments.models import Department
from employees.models import Employee
from services.models import Service

from users.models import User
from users.permissions import IsAdminOrManager

from .models import Transaction
from .serializers import DepositSerializer, TransferSerializer, WithdrawSerializer, SaleSerializer
from .services import create_deposit, create_transfer, create_withdrawal, create_sale


class DepositAPIView(APIView):
    # Admin/Manager only
    permission_classes = [IsAdminOrManager]

    def post(self, request):
        serializer = DepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        receiver_username = serializer.validated_data["receiver_username"]
        amount = serializer.validated_data["amount"]
        narration = serializer.validated_data.get("narration", "")

        try:
            receiver = User.objects.get(username=receiver_username)
        except User.DoesNotExist:
            return Response({"detail": "Receiver not found."}, status=status.HTTP_404_NOT_FOUND)

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
    # Admin/Manager only
    permission_classes = [IsAdminOrManager]

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
    # Admin/Manager only
    permission_classes = [IsAdminOrManager]

    def post(self, request):
        serializer = WithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amount = serializer.validated_data["amount"]
        narration = serializer.validated_data.get("narration", "")

        try:
            tx = create_withdrawal(
                sender=request.user,
                amount=amount,
                channel="internal",
                narration=narration
            )
        except DjangoValidationError as e:
            return Response(
                {"detail": e.message_dict if hasattr(e, "message_dict") else e.messages},
                status=status.HTTP_400_BAD_REQUEST
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
    # Any authenticated user
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = (Transaction.objects.filter(sender=request.user) |
              Transaction.objects.filter(receiver=request.user))

        qs = qs.order_by("-created_at")[:200]

        data = []
        for t in qs:
            data.append({
                "id": t.id,
                "tx_type": t.tx_type,
                "channel": t.channel,
                "status": t.status,
                "sender": t.sender.username if t.sender else None,
                "receiver": t.receiver.username if t.receiver else None,
                "department": t.department.name if t.department else None,
                "employee": t.employee.full_name if t.employee else None,
                "service": t.service.name if t.service else None,
                "customer_name": t.customer_name,
                "amount": str(t.amount),
                "reference": t.reference,
                "narration": t.narration,
                "created_at": t.created_at.isoformat(),
            })

        return Response(data, status=status.HTTP_200_OK)


class SaleAPIView(APIView):
    # Any authenticated user (staff allowed)
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dept_id = serializer.validated_data.get("department")
        emp_id = serializer.validated_data.get("employee")
        svc_id = serializer.validated_data.get("service")

        customer_name = serializer.validated_data.get("customer_name", "")
        amount = serializer.validated_data["amount"]
        channel = serializer.validated_data.get("channel", "internal")
        reference = serializer.validated_data.get("reference", "")
        narration = serializer.validated_data.get("narration", "")

        department = Department.objects.filter(id=dept_id).first() if dept_id else None
        employee = Employee.objects.filter(id=emp_id).first() if emp_id else None
        service = Service.objects.filter(id=svc_id).first() if svc_id else None

        if dept_id and not department:
            return Response({"detail": "Department not found."}, status=status.HTTP_404_NOT_FOUND)
        if emp_id and not employee:
            return Response({"detail": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
        if svc_id and not service:
            return Response({"detail": "Service not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            tx = create_sale(
                receiver=request.user,
                amount=amount,
                department=department,
                employee=employee,
                service=service,
                channel=channel,
                customer_name=customer_name,
                reference=reference,
                narration=narration,
            )
        except DjangoValidationError as e:
            return Response(
                {"detail": e.message_dict if hasattr(e, "message_dict") else e.messages},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "message": "Sale recorded successfully",
                "transaction_id": tx.id,
                "amount": str(tx.amount),
                "channel": tx.channel,
                "department": tx.department.name if tx.department else None,
                "employee": tx.employee.full_name if tx.employee else None,
                "service": tx.service.name if tx.service else None,
                "customer_name": tx.customer_name,
                "status": tx.status,
            },
            status=status.HTTP_201_CREATED
        )
