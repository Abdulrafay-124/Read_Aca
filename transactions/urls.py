from rest_framework.routers import DefaultRouter
from .views import WalletViewSet, OrderViewSet

router = DefaultRouter()
router.register("wallet", WalletViewSet, basename="wallet")
router.register("orders", OrderViewSet, basename="order")

urlpatterns = router.urls
