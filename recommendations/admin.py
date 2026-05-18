from django.contrib import admin
from .models import UserInteraction, BookRecommendation


@admin.register(UserInteraction)
class UserInteractionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'book', 'interaction_type', 'rating', 'created_at')
    list_filter = ('interaction_type',)
    search_fields = ('user__username', 'book__title')
    readonly_fields = ('created_at',)


@admin.register(BookRecommendation)
class BookRecommendationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'recommended_book', 'source_book', 'score', 'rec_type', 'created_at')
    list_filter = ('rec_type',)
    search_fields = ('user__username', 'recommended_book__title', 'source_book__title')
    readonly_fields = ('created_at',)