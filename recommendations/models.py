import uuid
from django.conf import settings
from django.db import models


class UserInteraction(models.Model):
    """User interaction model for tracking user-book interactions."""

    INTERACTION_TYPE_CHOICES = [
        ('view', 'View'),
        ('rental', 'Rental'),
        ('rating', 'Rating'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    book = models.ForeignKey(
        'inventory.BookListing',
        on_delete=models.CASCADE
    )
    interaction_type = models.CharField(max_length=20, choices=INTERACTION_TYPE_CHOICES)
    rating = models.SmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} - {self.get_interaction_type_display()} - {self.book.title}'


class BookRecommendation(models.Model):
    """Book recommendation model for storing AI-generated recommendations."""

    REC_TYPE_CHOICES = [
        ('collaborative', 'Collaborative'),
        ('content_based', 'Content Based'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    source_book = models.ForeignKey(
        'inventory.BookListing',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='recommendation_sources'
    )
    recommended_book = models.ForeignKey(
        'inventory.BookListing',
        on_delete=models.CASCADE,
        related_name='recommended_in'
    )
    score = models.FloatField()
    rec_type = models.CharField(max_length=20, choices=REC_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score', '-created_at']

    def __str__(self):
        return f'{self.user.username} - {self.recommended_book.title} ({self.score})'