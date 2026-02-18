from rest_framework import serializers

class DepositSerializer(serializers.Serializer):
    receiver_username = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    narration = serializers.CharField(required=False, allow_blank=True)
