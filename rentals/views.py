from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model

from .models import RentalRecord
from .serializers import RentalRecordSerializer
from .permissions import IsRenterOrSellerOrAdmin, IsRenterOrBookSeller
from transactions.models import WalletLedger

User = get_user_model()


class RentalRecordViewSet(viewsets.ModelViewSet):
    queryset = RentalRecord.objects.all().select_related("order__buyer", "order__book__seller", "book", "renter")
    serializer_class = RentalRecordSerializer

    def get_permissions(self):
        if self.action == "create":
            self.permission_classes = [IsAuthenticated, IsRenterOrBookSeller]
        elif self.action in ["retrieve", "return_book"]:
            self.permission_classes = [IsAuthenticated, IsRenterOrSellerOrAdmin]
        elif self.action == "list":
            self.permission_classes = [IsAuthenticated]
        else:
            self.permission_classes = [IsAuthenticated, IsRenterOrSellerOrAdmin]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return self.queryset
        
        queryset = self.queryset.filter(renter=user) | self.queryset.filter(book__seller=user)

        status_param = self.request.query_params.get("status", None)
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        return queryset.distinct()

    @transaction.atomic
    def perform_create(self, serializer):
        # Renter and book are set in the serializer validate method.
        # Keep the order status aligned with the order lifecycle; the rental
        # record itself tracks the active/returned rental state.
        serializer.save()

    @action(detail=True, methods=["patch"], url_path="return_book")
    @transaction.atomic
    def return_book(self, request, pk=None):
        rental_record = get_object_or_404(RentalRecord.objects.select_for_update(), pk=pk)
        self.check_object_permissions(request, rental_record)

        if rental_record.status == "returned":
            return Response({"detail": "Book already returned."}, status=status.HTTP_400_BAD_REQUEST)

        rental_record.returned_at = timezone.now()
        rental_record.status = "returned"
        rental_record.save()

        order = rental_record.order
        if order.status != "completed":
            # Release escrow to seller — mirrors OrderViewSet.update_status's
            # "completed" branch, since this path bypasses that view entirely.
            seller_account = User.objects.select_for_update().get(pk=order.seller.pk)
            seller_account.wallet_balance += order.total_price
            seller_account.save()
            WalletLedger.objects.create(
                user=seller_account,
                amount=order.total_price,
                transaction_type="escrow_release",
                reference_id=order.id,
                balance_after=seller_account.wallet_balance,
                note=f"Escrow release for completed rental order {order.id}",
            )

            order.status = "completed"
            order.save()

        # Make the book available again
        book = rental_record.book
        if not book.is_available:
            book.is_available = True
            book.save()

        serializer = self.get_serializer(rental_record)
        return Response(serializer.data, status=status.HTTP_200_OK)
