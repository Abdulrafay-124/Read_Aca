from django.contrib import admin
from .models import RentalRecord


@admin.register(RentalRecord)
class RentalRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'book', 'renter', 'due_date', 'status', 'daily_penalty_rate', 'created_at')
    list_filter = ('status',)
    search_fields = ('book__title', 'renter__username', 'renter__email')
    readonly_fields = ('created_at',)