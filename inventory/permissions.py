from rest_framework import permissions


class IsListingOwnerOrAdmin(permissions.BasePermission):
    """Only the seller who owns this listing, or an admin, can modify it."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated and request.user.role == "admin":
            return True
        return obj.seller == request.user