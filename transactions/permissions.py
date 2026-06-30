from rest_framework import permissions


class IsOrderParticipantOrAdmin(permissions.BasePermission):
    """Allows the buyer or seller on this order, or an admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated and request.user.role == "admin":
            return True
        return obj.buyer == request.user or obj.seller == request.user
