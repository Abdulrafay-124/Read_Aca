from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Category, BookListing
from .serializers import CategorySerializer, BookListingSerializer, BookListingDetailSerializer
from users.permissions import IsAdmin, IsOwnerOrAdmin, IsSeller
from .tasks import generate_book_embedding
from pgvector.django import CosineDistance
from rest_framework.decorators import action
from rest_framework.response import Response
import logging
logger = logging.getLogger(__name__)






class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            self.permission_classes = [AllowAny]
        else:
            self.permission_classes = [IsAdmin]
        return super().get_permissions()


class BookListingViewSet(viewsets.ModelViewSet):
    queryset = BookListing.objects.select_related("seller", "category").filter(is_available=True).order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return BookListingDetailSerializer
        return BookListingSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            self.permission_classes = [AllowAny]
        elif self.action == "create":
            self.permission_classes = [IsAuthenticated, IsSeller]
        elif self.action in ["update", "partial_update", "destroy", "toggle_availability"]:
            self.permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
        elif self.action == "my_listings":
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()

    def get_queryset(self):
        queryset = self.queryset
        # Filter for "my_listings" action
        if self.action == "my_listings":
            return BookListing.objects.select_related("seller", "category").filter(seller=self.request.user).order_by("-created_at")

        # Search and filter for list action
        search_query = self.request.query_params.get("search", None)
        category_slug = self.request.query_params.get("category", None)
        condition = self.request.query_params.get("condition", None)
        listing_type = self.request.query_params.get("listing_type", None)
        min_price = self.request.query_params.get("min_price", None)
        max_price = self.request.query_params.get("max_price", None)

        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(author__icontains=search_query) |
                Q(isbn__icontains=search_query)
            )
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        if condition:
            queryset = queryset.filter(condition=condition)
        if listing_type:
            queryset = queryset.filter(listing_type=listing_type)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        return queryset
    
    @action(detail=True, methods=["get"], url_path="similar")
    def similar(self, request, pk=None):
        book = self.get_object()
        if book.embedding is None:
            return Response({"detail": "This listing has no embedding yet."}, status=400)

        similar_books = (
            BookListing.objects.filter(is_available=True)
            .exclude(id=book.id)
            .annotate(distance=CosineDistance("embedding", book.embedding))
            .order_by("distance")[:5]
        )

        serializer = BookListingSerializer(similar_books, many=True)
        results = []
        for book_data, book_obj in zip(serializer.data, similar_books):
            book_data["similarity_score"] = round((1 - book_obj.distance) * 100, 1)
            results.append(book_data)

        return Response(results)

    def perform_create(self, serializer):
        book = serializer.save(seller=self.request.user)
        generate_book_embedding.delay(book.id)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated:
            try:
                from recommendations.models import UserInteraction
                UserInteraction.objects.create(
                    user=request.user,
                    book=instance,
                    interaction_type="view",
                )
            except Exception:
                logger.exception("Failed to log view interaction")
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="my_listings")
    def my_listings(self, request):
        queryset = self.get_queryset() # This will use the filtered queryset for my_listings
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="toggle_availability")
    def toggle_availability(self, request, pk=None):
        instance = self.get_object()
        self.check_object_permissions(request, instance) # Check IsOwnerOrAdmin
        instance.is_available = not instance.is_available
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
