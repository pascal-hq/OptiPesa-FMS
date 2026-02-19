from rest_framework import serializers

class DepositSerializer(serializers.Serializer):
    receiver_username = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    narration = serializers.CharField(required=False, allow_blank=True)

class TransferSerializer(serializers.Serializer):
    receiver_username = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    narration = serializers.CharField(required=False, allow_blank=True)

class WithdrawSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    narration = serializers.CharField(required=False, allow_blank=True)
class SaleSerializer(serializers.Serializer):
    department = serializers.IntegerField(required=False)
    employee = serializers.IntegerField(required=False)
    service = serializers.IntegerField(required=False)

    customer_name = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    channel = serializers.ChoiceField(choices=["internal", "mpesa"], required=False)
    reference = serializers.CharField(required=False, allow_blank=True)
    narration = serializers.CharField(required=False, allow_blank=True)
