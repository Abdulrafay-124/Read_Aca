from rest_framework import serializers
from .models import ChatSession, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = (
            "id",
            "role",
            "content",
            "token_count",
            "created_at",
        )
        read_only_fields = fields


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = (
            "id",
            "user",
            "title",
            "context_snapshot",
            "created_at",
            "last_active_at",
            "messages",
        )
        read_only_fields = (
            "id",
            "user",
            "context_snapshot",
            "created_at",
            "last_active_at",
            "messages",
        )
