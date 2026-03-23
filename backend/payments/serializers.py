from rest_framework import serializers


class STKPushSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    amount = serializers.IntegerField(min_value=1)
    account_reference = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)