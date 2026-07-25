from rest_framework import generics, permissions
from rest_framework.response import Response
from .serializers import RatingSerializer
from .models import BookRecommendation
from .serializers import BookRecommendationSerializer 
from django.core.cache import cache

from rest_framework.views import APIView
from .models import UserInteraction

class MyRatingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, book_id):
        interaction = UserInteraction.objects.filter(
            user=request.user, book_id=book_id, interaction_type="rating"
        ).first()
        return Response({"rating": interaction.rating if interaction else None})

class RatingCreateView(generics.CreateAPIView):

    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]


class MyRecommendationsView(generics.ListAPIView):
    serializer_class = BookRecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BookRecommendation.objects.filter(
            user=self.request.user, rec_type="collaborative"
        ).order_by("-score")



    def list(self, request, *args, **kwargs):
        cache_key = f"recommendations:{request.user.id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=3600)  # 1 hour
        return response