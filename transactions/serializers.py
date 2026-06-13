from rest_framework import serializers
from django.contrib.auth import get_user_model
from inventory.models import BookListing
from .models import Order, WalletLedger
from decimal import Decimal
from django.conf import settings

User = get_user_model()


class WalletTopupSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('1.00'), max_value=Decimal('5000.00'))


class OrderSerializer(serializers.ModelSerializer):
    buyer = serializers.ReadOnlyField(source='buyer.username')
    seller = serializers.ReadOnlyField(source='seller.username')
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "buyer",
            "seller",
            "book",
            "order_type",
            "total_price",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "buyer", "seller", "total_price", "status", "created_at", "updated_at")

    def create(self, validated_data):
        book = validated_data.get('book')
        if not book.is_available:
            raise serializers.ValidationError("This book is not available for purchase or rental.")

        if book.listing_type != 'both' and validated_data.get('order_type') != book.listing_type:
            raise serializers.ValidationError(f"This book is only available for {book.listing_type}.")
        
        validated_data['total_price'] = book.price
        validated_data['status'] = 'pending'
        validated_data['seller'] = book.seller
        validated_data['buyer'] = self.context['request'].user

        return super().create(validated_data)


class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ('status',)
        read_only_fields = ('id', 'buyer', 'seller', 'book', 'order_type', 'total_price', 'created_at', 'updated_at')

    def update(self, instance, validated_data):
        user = self.context['request'].user
        new_status = validated_data.get('status')
        current_status = instance.status

        # Admin can change to any status
        if user.is_staff or user.is_superuser:
            instance.status = new_status
            instance.save()
            return instance

        # Seller can move: pending → confirmed → shipped → completed
        if user == instance.seller:
            if current_status == 'pending' and new_status == 'confirmed':
                instance.status = new_status
            elif current_status == 'confirmed' and new_status == 'shipped':
                instance.status = new_status
            elif current_status == 'shipped' and new_status == 'completed':
                instance.status = new_status
            else:
                raise serializers.ValidationError(f"Seller cannot change order from {current_status} to {new_status}.")
            instance.save()
            return instance

        # Buyer can move: pending → cancelled
        if user == instance.buyer:
            if current_status == 'pending' and new_status == 'cancelled':
                instance.status = new_status
            else:
                raise serializers.ValidationError(f"Buyer cannot change order from {current_status} to {new_status}.")
            instance.save()
            return instance

        raise serializers.ValidationError("You do not have permission to change this order's status.")


class WalletLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletLedger
        fields = (
            "id",
            "amount",
            "transaction_type",
            "balance_after",
            "note",
            "created_at",
        )
        read_only_fields = fields
