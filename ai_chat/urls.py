from rest_framework.routers import DefaultRouter
from .views import ChatSessionViewSet

router = DefaultRouter()
router.register("", ChatSessionViewSet, basename="chatsession")

urlpatterns = router.urls
