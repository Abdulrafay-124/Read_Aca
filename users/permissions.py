from rest_framework import permissions


class IsBuyer(permissions.BasePermission):
    """Custom permission to only allow buyers to access."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'buyer'


class IsSeller(permissions.BasePermission):
    """Custom permission to only allow sellers to access."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'seller'


class IsAdmin(permissions.BasePermission):
    """Custom permission to only allow admins to access."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsSellerOrAdmin(permissions.BasePermission):
    """Custom permission to allow sellers or admins to access."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'seller' or request.user.role == 'admin')


class IsOwnerOrAdmin(permissions.BasePermission):
    """Custom permission to only allow owners of an object or admins to access."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_authenticated and request.user.role == 'admin':
            return True
        return obj.user == request.user
