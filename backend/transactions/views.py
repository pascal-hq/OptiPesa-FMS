from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from decimal import Decimal

from departments.models import Department
from employees.models import Employee
from services.models import Service
from accounts.models import Account

from users.models import User
from users.permissions import IsAdminOrManager

from .models import Transaction
from .serializers import DepositSerializer, TransferSerializer, WithdrawSerializer, SaleSerializer
from .services import create_deposit, create_transfer, create_withdrawal, create_sale


class DepositAPIView(APIView):
    """
    Admin/Manager only.
    Deposit funds to a user's account (internal).
    """
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
            return Response(
                {"detail": "Receiver not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        tx = create_deposit(
            receiver=receiver,
            amount=amount,
            channel="internal",
            narration=narration,
        )

        return Response(
            {
                "message": "Deposit successful",
                "transaction_id": tx.id,
                "tx_type": tx.tx_type,
                "status": tx.status,
                "amount": str(tx.amount),
                "receiver": receiver.username,
                "created_at": tx.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class TransferAPIView(APIView):
    """
    Admin/Manager only.
    Transfer funds from logged-in user to another user (internal).
    """
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
            return Response(
                {"detail": "Receiver not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            tx = create_transfer(
                sender=request.user,
                receiver=receiver,
                amount=amount,
                narration=narration,
            )
        except DjangoValidationError as e:
            return Response(
                {"detail": e.message_dict if hasattr(e, "message_dict") else e.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Transfer successful",
                "transaction_id": tx.id,
                "tx_type": tx.tx_type,
                "status": tx.status,
                "amount": str(tx.amount),
                "sender": request.user.username,
                "receiver": receiver.username,
                "created_at": tx.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class WithdrawAPIView(APIView):
    """
    Admin/Manager only.
    Withdraw funds from logged-in user account (internal).
    """
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
                narration=narration,
            )
        except DjangoValidationError as e:
            return Response(
                {"detail": e.message_dict if hasattr(e, "message_dict") else e.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Withdrawal successful",
                "transaction_id": tx.id,
                "tx_type": tx.tx_type,
                "status": tx.status,
                "amount": str(tx.amount),
                "sender": request.user.username,
                "created_at": tx.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class TransactionHistoryAPIView(APIView):
    """
    Any authenticated user.
    - Admin/Manager/Superuser: see ALL transactions.
    - Staff: see only transactions where they are sender or receiver.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        role = getattr(user, "role", "")

        base_qs = Transaction.objects.select_related(
            "sender", "receiver", "department", "employee", "service"
        )

        if user.is_superuser or role in ["admin", "manager"]:
            qs = base_qs.all()
        else:
            qs = base_qs.filter(sender=user) | base_qs.filter(receiver=user)

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
                "customer_name": getattr(t, "customer_name", ""),
                "amount": str(t.amount),
                "reference": t.reference,
                "narration": t.narration,
                "created_at": t.created_at.isoformat(),
            })

        return Response(data, status=status.HTTP_200_OK)


class SaleAPIView(APIView):
    """
    Any authenticated user (staff allowed).
    Records a sale transaction linked to Department/Employee/Service.
    If channel is mpesa, initiates STK push and saves CheckoutRequestID.
    """
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
            return Response(
                {"detail": "Department not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        if emp_id and not employee:
            return Response(
                {"detail": "Employee not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        if svc_id and not service:
            return Response(
                {"detail": "Service not found."},
                status=status.HTTP_404_NOT_FOUND
            )

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
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If M-Pesa channel, initiate STK push and save CheckoutRequestID
        if channel == "mpesa":
            try:
                from payments.utils import initiate_stk_push
                phone = request.data.get("phone_number", "").strip()
                if phone:
                    # Normalize phone number
                    if phone.startswith("0"):
                        phone = "254" + phone[1:]
                    elif phone.startswith("+"):
                        phone = phone[1:]

                    mpesa_response = initiate_stk_push(
                        phone_number=phone,
                        amount=int(tx.amount),
                        account_reference="OptiPesa",
                        description=narration or "OptiPesa Payment",
                    )

                    # Save CheckoutRequestID to match callback later
                    checkout_id = mpesa_response.get("CheckoutRequestID", "")
                    if checkout_id:
                        tx.checkout_request_id = checkout_id
                        tx.save()

                    print(f"STK Push sent. CheckoutRequestID: {checkout_id}")

            except Exception as e:
                print(f"STK Push failed: {e}")
                # Transaction already created as pending
                # Staff should collect payment manually if STK fails

        return Response(
            {
                "message": "Sale recorded successfully",
                "transaction_id": tx.id,
                "tx_type": tx.tx_type,
                "status": tx.status,
                "amount": str(tx.amount),
                "channel": tx.channel,
                "department": tx.department.name if tx.department else None,
                "employee": tx.employee.full_name if tx.employee else None,
                "service": tx.service.name if tx.service else None,
                "customer_name": getattr(tx, "customer_name", ""),
                "reference": tx.reference,
                "narration": tx.narration,
                "created_at": tx.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class TransactionReceiptAPIView(APIView):
    """
    Returns a single transaction's details for receipt printing.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            tx = Transaction.objects.select_related(
                "sender", "receiver", "department", "employee", "service"
            ).get(pk=pk)
        except Transaction.DoesNotExist:
            return Response(
                {"detail": "Transaction not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "id": tx.id,
            "tx_type": tx.tx_type,
            "channel": tx.channel,
            "status": tx.status,
            "amount": str(tx.amount),
            "department": tx.department.name if tx.department else None,
            "employee": tx.employee.full_name if tx.employee else None,
            "service": tx.service.name if tx.service else None,
            "customer_name": tx.customer_name,
            "reference": tx.reference,
            "narration": tx.narration,
            "sender": tx.sender.username if tx.sender else None,
            "receiver": tx.receiver.username if tx.receiver else None,
            "created_at": tx.created_at.isoformat(),
        })