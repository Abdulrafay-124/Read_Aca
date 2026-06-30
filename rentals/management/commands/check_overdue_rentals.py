from django.core.management.base import BaseCommand
from rentals.services import flag_overdue_rentals


class Command(BaseCommand):
    help = "Checks for and flags overdue rental records."

    def handle(self, *args, **kwargs):
        count = flag_overdue_rentals()
        self.stdout.write(self.style.SUCCESS(
            f"Successfully flagged {count} rental records as overdue."
        ))
