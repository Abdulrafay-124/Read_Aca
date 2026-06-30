from django.conf import settings
from django.contrib.auth import get_user_model
from rentals.models import RentalRecord
from transactions.models import Order
from google import genai
import json

User = get_user_model()

def build_context_snapshot(user):
    """
    Builds a snapshot of the user's context including wallet balance,
    active rentals, and recent orders.
    """
    # Get wallet balance
    wallet_balance = user.wallet_balance

    # Get active rental records
    active_rentals = RentalRecord.objects.filter(renter=user, status="active").values(
        "id", "book__title", "due_date", "status"
    )

    # Get last 5 recent orders (buyer or seller)
    recent_orders = Order.objects.filter(buyer=user) | Order.objects.filter(seller=user)
    recent_orders = recent_orders.order_by("-created_at")[:5].values(
        "id", "book__title", "order_type", "total_price", "status"
    )

    context_snapshot = {
        "username": user.username,
        "role": user.role,
        "wallet_balance": str(wallet_balance), # Convert Decimal to string for JSON serialization
        "active_rentals": list(active_rentals),
        "recent_orders": list(recent_orders),
    }
    return context_snapshot

def build_system_instruction(context_snapshot):
    """
    Formats the context snapshot into a system prompt string for Gemini.
    Instructs Gemini to avoid inventing information.
    """
    system_prompt = (
        f"You are an AI assistant for ReadAca Malaysia, a second-hand book marketplace.\n"
        f"You have access to the following user context: {json.dumps(context_snapshot, indent=2)}\n"
        f"Answer questions based ONLY on the provided context. If you don't have the information,"
        f" explicitly state \"I don't have that information.\" Do NOT invent details."
    )
    return system_prompt

def get_gemini_client():
    """
    Returns a configured Google Gemini client.
    """
    return genai.Client(api_key=settings.GEMINI_API_KEY)

def build_gemini_contents(session, new_message_content):
    """
    Builds the content list for the Gemini API from chat messages.
    Maps 'assistant' role to 'model'.
    """
    contents = []

    # Add system instruction based on the context snapshot
    if session.context_snapshot:
        system_instruction = build_system_instruction(session.context_snapshot)
        contents.append({"role": "user", "parts": [{"text": system_instruction}]})
        contents.append({"role": "model", "parts": [{"text": "Understood. I will answer based on the provided context and state if I don't have the information."}]})


    # Add previous messages from the session
    for message in session.messages.order_by("created_at"):
        role = "user" if message.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": message.content}]})

    # Add the new user message
    contents.append({"role": "user", "parts": [{"text": new_message_content}]})

    return contents
