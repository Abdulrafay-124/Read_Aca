from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from .models import Order, WalletLedger
from .serializers import (
    WalletTopupSerializer,
    OrderSerializer,
    OrderStatusSerializer,
    WalletLedgerSerializer,
)
from users.permissions import IsBuyer
from .permissions import IsOrderParticipantOrAdmin
from inventory.models import BookListing

User = get_user_model()


class WalletViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="balance")
    def balance(self, request):
        user = request.user
        ledger_entries = WalletLedger.objects.filter(user=user).order_by("-created_at")[:20]
        serializer = WalletLedgerSerializer(ledger_entries, many=True)
        return Response(
            {
                "wallet_balance": user.wallet_balance,
                "last_20_transactions": serializer.data,
            }
        )

    @action(detail=False, methods=["post"], url_path="topup")
    def topup(self, request):
        serializer = WalletTopupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data["amount"]

        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            user.wallet_balance += amount
            user.save()
            WalletLedger.objects.create(
                user=user,
                amount=amount,
                transaction_type="topup",
                balance_after=user.wallet_balance,
                note=f"Wallet top-up of {amount}",
            )
        return Response(
            {"wallet_balance": user.wallet_balance, "message": "Wallet top-up successful"},
            status=status.HTTP_200_OK,
        )


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def get_permissions(self):
        if self.action == "create":
            self.permission_classes = [IsAuthenticated, IsBuyer]
        elif self.action in ["retrieve", "update_status"]:
            self.permission_classes = [IsAuthenticated, IsOrderParticipantOrAdmin]
        elif self.action == "list":
            self.permission_classes = [IsAuthenticated]
        else:
            self.permission_classes = [IsAuthenticated, IsOrderParticipantOrAdmin]  # Default for other actions
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Order.objects.all()
        return Order.objects.filter(buyer=user) | Order.objects.filter(seller=user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        book = serializer.validated_data["book"]
        order_type = serializer.validated_data["order_type"]
        buyer = request.user

        # 1. Check book is available
        if not book.is_available:
            raise serializers.ValidationError("This book is not available for purchase or rental.")

        # 2. Check buyer wallet_balance >= book.price
        # Use select_for_update() on User queryset to prevent race conditions
        buyer_account = User.objects.select_for_update().get(pk=buyer.pk)
        if buyer_account.wallet_balance < book.price:
            raise serializers.ValidationError("Insufficient wallet balance.")

        # Validate order_type against book.listing_type
        if book.listing_type != "both" and order_type != book.listing_type:
            raise serializers.ValidationError(f"This book is only available for {book.listing_type}.")

        # 3. Deduct from buyer wallet_balance
        buyer_account.wallet_balance -= book.price
        buyer_account.save()

        # 4. Append WalletLedger (transaction_type=escrow_hold, reference_id=order.id)
        # Order is not yet created, so we'll create WalletLedger after order creation

        # 5. Set book.is_available = False
        book.is_available = False
        book.save()

        # 6. Create order with status=pending, total_price=book.price
        order = Order.objects.create(
            buyer=buyer_account,
            seller=book.seller,
            book=book,
            order_type=order_type,
            total_price=book.price,
            status="pending",
        )

        WalletLedger.objects.create(
            user=buyer_account,
            amount=-book.price,  # Negative for deduction
            transaction_type="escrow_hold",
            reference_id=order.id,
            balance_after=buyer_account.wallet_balance,
            note=f"Escrow hold for order {order.id}",
        )

        headers = self.get_success_headers(serializer.data)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["patch"], url_path="update_status")
    @transaction.atomic
    def update_status(self, request, pk=None):
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk) # Lock the order
        self.check_object_permissions(request, order)

        serializer = OrderStatusSerializer(order, data=request.data, partial=True, context={
            "request": request
        })
        serializer.is_valid(raise_exception=True)

        previous_status = order.status  # capture BEFORE save() mutates this same object

        
        updated_order = serializer.save()
        # Handle wallet movements based on status changes (simplified, full logic would be more complex)
        if updated_order.status == 'cancelled' and previous_status != 'cancelled':
            # Refund buyer from escrow if cancelled from pending
            if previous_status == 'pending':
                buyer_account = User.objects.select_for_update().get(pk=updated_order.buyer.pk)
                buyer_account.wallet_balance += updated_order.total_price
                buyer_account.save()
                WalletLedger.objects.create(
                    user=buyer_account,
                    amount=updated_order.total_price,
                    transaction_type="refund",
                    reference_id=updated_order.id,
                    balance_after=buyer_account.wallet_balance,
                    note=f"Refund for cancelled order {updated_order.id}",
                )
                # Make book available again
                book = updated_order.book
                book.is_available = True
                book.save()
        elif updated_order.status == 'completed' and previous_status != 'completed':
            # Release funds from escrow to seller
            seller_account = User.objects.select_for_update().get(pk=updated_order.seller.pk)
            seller_account.wallet_balance += updated_order.total_price
            seller_account.save()
            WalletLedger.objects.create(
                user=seller_account,
                amount=updated_order.total_price,
                transaction_type="escrow_release",
                reference_id=updated_order.id,
                balance_after=seller_account.wallet_balance,
                note=f"Escrow release for completed order {updated_order.id}",
            )

        return Response(OrderSerializer(updated_order).data, status=status.HTTP_200_OK)
