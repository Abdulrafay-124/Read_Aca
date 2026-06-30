from rest_framework import serializers
from .models import RentalRecord
from transactions.models import Order
from django.utils import timezone


class RentalRecordSerializer(serializers.ModelSerializer):
    renter = serializers.ReadOnlyField(source='renter.username')
    book = serializers.ReadOnlyField(source='book.title')

    class Meta:
        model = RentalRecord
        fields = (
            "id",
            "order",
            "book",
            "renter",
            "due_date",
            "returned_at",
            "status",
            "daily_penalty_rate",
            "created_at",
        )
        read_only_fields = (
            "id",
            "book",
            "renter",
            "returned_at",
            "status",
            "daily_penalty_rate",
            "created_at",
        )

    def validate(self, data):
        order = data.get("order")
        due_date = data.get("due_date")

        if not order:
            raise serializers.ValidationError("Order is required to create a rental record.")

        if order.order_type != "rental":
            raise serializers.ValidationError("Order must be a rental type.")

        if order.status not in ["confirmed", "shipped"]:
            raise serializers.ValidationError("Order status must be confirmed or shipped to create a rental record.")

        if RentalRecord.objects.filter(order=order).exists():
            raise serializers.ValidationError("A rental record already exists for this order.")

        if due_date and due_date <= timezone.now().date():
            raise serializers.ValidationError("Due date must be in the future.")
        
        # Set book and renter from the order
        data["book"] = order.book
        data["renter"] = order.buyer
        

        return data

    def create(self, validated_data):
        rental = super().create(validated_data)
        try:
            from recommendations.models import UserInteraction
            UserInteraction.objects.create(
                user=rental.renter,
                book=rental.book,
                interaction_type="rental",
            )
        except Exception:
            logger.exception("Failed to log rental interaction")
        return rental