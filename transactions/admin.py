from django.contrib import admin
from .models import Order, WalletLedger


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'book', 'buyer', 'seller', 'status', 'order_type', 'total_price', 'created_at')
    list_filter = ('status', 'order_type')
    search_fields = ('book__title', 'buyer__username', 'seller__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(WalletLedger)
class WalletLedgerAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'amount', 'transaction_type', 'balance_after', 'created_at')
    list_filter = ('transaction_type',)
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at',)