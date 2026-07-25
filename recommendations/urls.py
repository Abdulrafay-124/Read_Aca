from django.urls import path
from .views import RatingCreateView, MyRecommendationsView, MyRatingView

urlpatterns = [
    path("ratings/", RatingCreateView.as_view(), name = 'create-rating'),
    path("my-recommendations/", MyRecommendationsView.as_view(), name="my-recommendations"),
    path("ratings/mine/<uuid:book_id>/", MyRatingView.as_view(), name="my-rating"),
]