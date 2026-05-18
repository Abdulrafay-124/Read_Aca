import uuid
from django.conf import settings
from django.db import models


class RentalRecord(models.Model):
    """Rental record model for tracking book rentals."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('returned', 'Returned'),
        ('overdue', 'Overdue'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(
        'transactions.Order',
        on_delete=models.PROTECT
    )
    book = models.ForeignKey(
        'inventory.BookListing',
        on_delete=models.PROTECT
    )
    renter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT
    )
    due_date = models.DateField()
    returned_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    daily_penalty_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=2.00
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Rental {self.id} - {self.book.title}'