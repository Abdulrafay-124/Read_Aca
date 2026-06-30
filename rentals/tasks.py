from celery import shared_task
from .services import flag_overdue_rentals


@shared_task
def check_overdue_rentals():
    count = flag_overdue_rentals()
    print(f"Flagged {count} rental records as overdue.")
    return count
