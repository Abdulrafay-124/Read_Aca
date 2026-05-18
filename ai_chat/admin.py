from django.contrib import admin
from .models import ChatSession, ChatMessage


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'created_at', 'last_active_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__email', 'title')
    readonly_fields = ('created_at', 'last_active_at')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'role', 'token_count', 'created_at')
    list_filter = ('role',)
    search_fields = ('content', 'session__title')
    readonly_fields = ('created_at',)