from decimal import Decimal
from django.db import transaction as db_transaction
from django.core.exceptions import ValidationError

from accounts.models import Account
from .models import Transaction


def _get_account_for_user(user):
    # assumes account is auto-created via signal
    return Account.objects.select_for_update().get(user=user)


@db_transaction.atomic
def create_deposit(receiver, amount, channel='internal', reference='', narration=''):
    amount = Decimal(amount)
    if amount <= 0:
        raise ValidationError("Deposit amount must be greater than 0.")

    receiver_account = _get_account_for_user(receiver)
    receiver_account.balance += amount
    receiver_account.save()

    tx = Transaction.objects.create(
        tx_type='deposit',
        channel=channel,
        status='successful',
        sender=None,
        receiver=receiver,
        amount=amount,
        reference=reference,
        narration=narration
    )
    return tx


@db_transaction.atomic
def create_withdrawal(sender, amount, channel='internal', reference='', narration=''):
    amount = Decimal(amount)
    if amount <= 0:
        raise ValidationError("Withdrawal amount must be greater than 0.")

    sender_account = _get_account_for_user(sender)

    if sender_account.balance < amount:
        raise ValidationError("Insufficient balance.")

    sender_account.balance -= amount
    sender_account.save()

    tx = Transaction.objects.create(
        tx_type='withdrawal',
        channel=channel,
        status='successful',
        sender=sender,
        receiver=None,
        amount=amount,
        reference=reference,
        narration=narration
    )
    return tx


@db_transaction.atomic
def create_transfer(sender, receiver, amount, narration=''):
    amount = Decimal(amount)
    if amount <= 0:
        raise ValidationError("Transfer amount must be greater than 0.")

    if sender == receiver:
        raise ValidationError("Sender and receiver cannot be the same user.")

    sender_account = _get_account_for_user(sender)
    receiver_account = _get_account_for_user(receiver)

    if sender_account.balance < amount:
        raise ValidationError("Insufficient balance.")

    sender_account.balance -= amount
    receiver_account.balance += amount

    sender_account.save()
    receiver_account.save()

    tx = Transaction.objects.create(
        tx_type='transfer',
        channel='internal',
        status='successful',
        sender=sender,
        receiver=receiver,
        amount=amount,
        narration=narration
    )
    return tx
from django.core.exceptions import ValidationError

@db_transaction.atomic
def create_sale(receiver, amount, department=None, employee=None, service=None,
                channel="internal", customer_name="", reference="", narration=""):
    amount = Decimal(amount)
    if amount <= 0:
        raise ValidationError("Sale amount must be greater than 0.")

    # Optional consistency checks
    if service and department and service.department_id != department.id:
        raise ValidationError("Service does not belong to the selected department.")

    if employee and department and employee.department_id != department.id:
        raise ValidationError("Employee does not belong to the selected department.")

    # Credit the receiver (business wallet)
    receiver_account = _get_account_for_user(receiver)
    receiver_account.balance += amount
    receiver_account.save()

    tx = Transaction.objects.create(
        tx_type="sale",
        channel=channel,
        status="successful",
        sender=None,
        receiver=receiver,
        department=department,
        employee=employee,
        service=service,
        customer_name=customer_name,
        amount=amount,
        reference=reference,
        narration=narration,
    )
    return tx
