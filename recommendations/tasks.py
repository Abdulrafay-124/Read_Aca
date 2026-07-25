from celery import shared_task
from .services import refresh_collaborative_recommendations

@shared_task
def refresh_recommendations_task():
    count = refresh_collaborative_recommendations()
    return f"{count} recommendation(s) generated"