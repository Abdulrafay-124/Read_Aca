from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, BookListingViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("listings", BookListingViewSet, basename="booklisting")

urlpatterns = router.urls
