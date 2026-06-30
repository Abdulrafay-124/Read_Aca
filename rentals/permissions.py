from rest_framework import permissions
from django.shortcuts import get_object_or_404
from .models import RentalRecord
from transactions.models import Order


class IsRenterOrSellerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow renters of a rental record, or sellers of the book
    associated with the rental record, or admin users to access an object.
    """

    def has_permission(self, request, view):
        # Allow anyone to create, but object-level permission will validate more
        if view.action == 'create':
            return request.user.is_authenticated
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Admin users always have permission
        if request.user.is_staff or request.user.is_superuser:
            return True

        # If the user is the renter of the rental record
        if obj.renter == request.user:
            return True

        # If the user is the seller of the book associated with the rental record
        if obj.book.seller == request.user:
            return True

        return False


class IsRenterOrBookSeller(permissions.BasePermission):
    """
    Custom permission to only allow renters of a rental record or sellers of the book.
    Used for create permissions where the order is already confirmed/shipped
    and the renter/seller relationship is established via the order.
    """
    def has_permission(self, request, view):
        if request.method == 'POST':
            # For creation, we need to check against the order passed in the request data
            order_id = request.data.get('order')
            if not order_id:
                return False # Or raise a validation error in the serializer
            try:
                order = get_object_or_404(Order, id=order_id)
                # User must be either the buyer of the order (renter) or the seller of the book
                return request.user == order.buyer or request.user == order.book.seller
            except Exception:
                return False # Order not found or invalid
        # For other actions, rely on object-level permissions
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return obj.renter == request.user or obj.book.seller == request.user
