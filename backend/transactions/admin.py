from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'tx_type', 'channel', 'status', 'sender', 'receiver', 'amount', 'created_at')
    list_filter = ('tx_type', 'channel', 'status', 'created_at')
    search_fields = ('reference', 'sender__username', 'receiver__username')
