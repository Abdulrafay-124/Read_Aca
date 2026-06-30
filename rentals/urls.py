from rest_framework.routers import DefaultRouter
from .views import RentalRecordViewSet

router = DefaultRouter()
router.register("", RentalRecordViewSet, basename="rental")

urlpatterns = router.urls
