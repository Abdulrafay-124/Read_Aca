from rest_framework import generics, permissions
from .serializers import RatingSerializer

class RatingCreateView(generics.CreateAPIView):

    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]


