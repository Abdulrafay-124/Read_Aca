from django.urls import path
from .views import RatingCreateView

urlpatterns = [
    path("ratings/", RatingCreateView.as_view(), name = 'create-rating'),
]