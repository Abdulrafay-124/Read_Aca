from django.utils import timezone
from .models import RentalRecord


def flag_overdue_rentals():
    """
    Flags active rental records as overdue if their due_date has passed.
    Returns the count of updated records.
    """
    overdue_rentals_count = RentalRecord.objects.filter(
        status="active",
        due_date__lt=timezone.now().date()
    ).update(status="overdue")
    return overdue_rentals_count
