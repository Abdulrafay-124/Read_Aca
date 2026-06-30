from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from django.conf import settings

from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from .services import build_context_snapshot, build_gemini_contents, get_gemini_client
from users.permissions import IsOwnerOrAdmin

import json

User = get_user_model()


class ChatSessionViewSet(mixins.CreateModelMixin,
                         mixins.ListModelMixin,
                         mixins.RetrieveModelMixin,
                         mixins.DestroyModelMixin,
                         viewsets.GenericViewSet):
    queryset = ChatSession.objects.all()
    serializer_class = ChatSessionSerializer

    def get_permissions(self):
        if self.action in ["create", "list"]:
            self.permission_classes = [IsAuthenticated]
        elif self.action in ["retrieve", "destroy", "messages"]:
            self.permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return self.queryset
        return self.queryset.filter(user=user)
    
    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user
        context_snapshot = build_context_snapshot(user)
        serializer.save(user=user, context_snapshot=context_snapshot)

    @action(detail=True, methods=["post"], url_path="messages")
    def messages(self, request, pk=None):
        session = get_object_or_404(ChatSession, pk=pk)
        self.check_object_permissions(request, session) # Use IsOwnerOrAdmin

        user_message_content = request.data.get("content")
        if not user_message_content:
            return Response({"detail": "Message content is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Save user message
        user_message = ChatMessage.objects.create(
            session=session,
            role="user",
            content=user_message_content,
            token_count=len(user_message_content.split()) # Simple token count
        )

        # Build Gemini contents
        gemini_contents = build_gemini_contents(session, user_message_content)
        gemini_client = get_gemini_client()
        
        def event_stream():
            full_response_content = ""
            try:
                # Update last_active_at before streaming
                with transaction.atomic():
                    session.last_active_at = timezone.now()
                    session.save()

                for chunk in gemini_client.models.generate_content_stream(
                    model=settings.GEMINI_MODEL, 
                    contents=gemini_contents
                ):
                    text = chunk.text
                    if text:
                        full_response_content += text
                        yield f"data: {json.dumps({"text": text})}\n\n".encode("utf-8")

                # Save assistant\"s full response
                with transaction.atomic():
                    ChatMessage.objects.create(
                        session=session,
                        role="assistant",
                        content=full_response_content,
                        token_count=len(full_response_content.split())
                    )

                yield f"data: {json.dumps({"done": True})}\n\n".encode("utf-8")
            except Exception as e:
                yield f"data: {json.dumps({"error": str(e)})}\n\n".encode("utf-8")

        return StreamingHttpResponse(event_stream(), content_type="text/event-stream")
