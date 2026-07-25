import pytest
# Pytest looks at database for each test
pytestmark = pytest.mark.django_db
from decimal import Decimal
from rest_framework.test import APIClient
from rest_framework import status

from django.contrib.auth import get_user_model
from inventory.models import BookListing
from transactions.models import Order, WalletLedger

User = get_user_model()

class TestEscrowOnCreate:

    def testing_order_holds_escrow(self):

        buyer = User.objects.create_user(
            username="buyer1", email="buyer1@test.com",
            password="testbuyerpass",
            role="buyer", wallet_balance = Decimal("50.00"),
        )

        seller = User.objects.create_user(
            username="seller1", email="seller1@test.com",
            password="testsellerpass",
            role="seller",
        )

        book = BookListing.objects.create(
            seller=seller, title="Test Book", price= Decimal("20.00"),
            listing_type="sale", is_available=True, 
        )

        client = APIClient()

        client.force_authenticate(user=buyer)

        response = client.post(
            "/api/transactions/orders/",
            {"book" : book.id, "order_type" : "sale"},
            format= "json",
        )

        # test status code
        assert response.status_code == status.HTTP_201_CREATED, response.data
        # test buyer wallet amount reduced
        buyer.refresh_from_db()
        assert buyer.wallet_balance == Decimal("30.00")

        ledger_entry = WalletLedger.objects.get(
            user=buyer, transaction_type="escrow_hold"
        )

        assert ledger_entry.amount == Decimal("-20.00")
        assert ledger_entry.balance_after == Decimal("30.00")
        assert str(ledger_entry.reference_id) == response.data["id"]

        book.refresh_from_db()
        assert book.is_available is False


class TestEscrowOnStatusChange:

    def test_cancelling_pending_order_refunds_buyer(self):
        buyer = User.objects.create_user(
            username="buyer2", email="buyer2@test.com",
            password="testbuyerpass",
            role="buyer", wallet_balance=Decimal("30.00"), # Simulating post-create deduction
        )
        seller = User.objects.create_user(
            username="seller2", email="seller2@test.com",
            password="testsellerpass",
            role="seller",
        )
        book = BookListing.objects.create(
            seller=seller, title="Test Book 2", price=Decimal("20.00"),
            listing_type="sale", is_available=False, # Simulating post-create unavailability
        )
        order = Order.objects.create(
            buyer=buyer, seller=seller, book=book, order_type="sale",
            total_price=Decimal("20.00"), status="pending",
        )

        client = APIClient()
        client.force_authenticate(user=buyer)

        response = client.patch(
            f"/api/transactions/orders/{order.id}/update_status/",
            {"status": "cancelled"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response.data

        buyer.refresh_from_db()
        assert buyer.wallet_balance == Decimal("50.00") # Original 30 + refunded 20

        ledger_entry = WalletLedger.objects.get(
            user=buyer, transaction_type="refund", reference_id=order.id
        )
        assert ledger_entry.amount == Decimal("20.00")
        assert ledger_entry.balance_after == Decimal("50.00")

        book.refresh_from_db()
        assert book.is_available is True

    def test_completing_order_releases_escrow_to_seller(self):
        buyer = User.objects.create_user(
            username="buyer3", email="buyer3@test.com",
            password="testbuyerpass",
            role="buyer", wallet_balance=Decimal("30.00"),
        )
        seller = User.objects.create_user(
            username="seller3", email="seller3@test.com",
            password="testsellerpass",
            role="seller", wallet_balance=Decimal("0.00"), # Seller starts with 0
        )
        book = BookListing.objects.create(
            seller=seller, title="Test Book 3", price=Decimal("20.00"),
            listing_type="sale", is_available=False,
        )
        # OrderStatusSerializer allows seller to move: pending -> confirmed -> shipped -> completed
        # So we can start at shipped and move to completed
        order = Order.objects.create(
            buyer=buyer, seller=seller, book=book, order_type="sale",
            total_price=Decimal("20.00"), status="shipped",
        )

        client = APIClient()
        client.force_authenticate(user=seller)

        response = client.patch(
            f"/api/transactions/orders/{order.id}/update_status/",
            {"status": "completed"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response.data

        seller.refresh_from_db()
        assert seller.wallet_balance == Decimal("20.00") # Seller receives total_price

        ledger_entry = WalletLedger.objects.get(
            user=seller, transaction_type="escrow_release", reference_id=order.id
        )
        assert ledger_entry.amount == Decimal("20.00")
        assert ledger_entry.balance_after == Decimal("20.00")

class TestOrderStatusTransitionRules:

    def test_buyer_can_complete_shipped_order(self):
        buyer = User.objects.create_user(
            username="buyer4b", email="buyer4b@test.com",
            ******,
            role="buyer", wallet_balance=Decimal("30.00"),
        )
        seller = User.objects.create_user(
            username="seller4b", email="seller4b@test.com",
            ******,
            role="seller",
        )
        book = BookListing.objects.create(
            seller=seller, title="Test Book 4B", price=Decimal("20.00"),
            listing_type="sale", is_available=False,
        )
        order = Order.objects.create(
            buyer=buyer, seller=seller, book=book, order_type="sale",
            total_price=Decimal("20.00"), status="shipped",
        )

        client = APIClient()
        client.force_authenticate(user=buyer)

        response = client.patch(
            f"/api/transactions/orders/{order.id}/update_status/",
            {"status": "completed"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK, response.data

        order.refresh_from_db()
        assert order.status == "completed"

    def test_buyer_cannot_skip_to_completed_status(self):
        buyer = User.objects.create_user(
            username="buyer4", email="buyer4@test.com",
            password="testbuyerpass",
            role="buyer", wallet_balance=Decimal("30.00"),
        )
        seller = User.objects.create_user(
            username="seller4", email="seller4@test.com",
            password="testsellerpass",
            role="seller",
        )
        book = BookListing.objects.create(
            seller=seller, title="Test Book 4", price=Decimal("20.00"),
            listing_type="sale", is_available=False,
        )
        order = Order.objects.create(
            buyer=buyer, seller=seller, book=book, order_type="sale",
            total_price=Decimal("20.00"), status="pending",
        )

        client = APIClient()
        client.force_authenticate(user=buyer)

        response = client.patch(
            f"/api/transactions/orders/{order.id}/update_status/",
            {"status": "completed"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data

        order.refresh_from_db()
        assert order.status == "pending"

    def test_seller_cannot_cancel_confirmed_order(self):
        buyer = User.objects.create_user(
            username="buyer5", email="buyer5@test.com",
            password="testbuyerpass",
            role="buyer", wallet_balance=Decimal("30.00"),
        )
        seller = User.objects.create_user(
            username="seller5", email="seller5@test.com",
            password="testsellerpass",
            role="seller",
        )
        book = BookListing.objects.create(
            seller=seller, title="Test Book 5", price=Decimal("20.00"),
            listing_type="sale", is_available=False,
        )
        order = Order.objects.create(
            buyer=buyer, seller=seller, book=book, order_type="sale",
            total_price=Decimal("20.00"), status="confirmed",
        )

        client = APIClient()
        client.force_authenticate(user=seller)

        response = client.patch(
            f"/api/transactions/orders/{order.id}/update_status/",
            {"status": "cancelled"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data

        order.refresh_from_db()
        assert order.status == "confirmed"

class TestOrderPermissions:

    def test_third_party_cannot_view_other_users_order(self):
        buyer = User.objects.create_user(
            username="buyer6", email="buyer6@test.com",
            password="testbuyerpass",
            role="buyer", wallet_balance=Decimal("50.00"),
        )
        seller = User.objects.create_user(
            username="seller6", email="seller6@test.com",
            password="testsellerpass",
            role="seller",
        )
        third_party = User.objects.create_user(
            username="thirdparty", email="thirdparty@test.com",
            password="testthirdpartypass",
            role="buyer",
        )
        book = BookListing.objects.create(
            seller=seller, title="Test Book 6", price=Decimal("20.00"),
            listing_type="sale", is_available=True,
        )
        order = Order.objects.create(
            buyer=buyer, seller=seller, book=book, order_type="sale",
            total_price=Decimal("20.00"), status="pending",
        )

        client = APIClient()
        client.force_authenticate(user=third_party)

        response = client.get(f"/api/transactions/orders/{order.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND # IsOrderParticipantOrAdmin causes 404 due to queryset filtering

    def test_admin_can_view_any_order(self):
        admin_user = User.objects.create_superuser(
            username="adminuser", email="admin@test.com",
            password="testadminpass",
        )
        buyer = User.objects.create_user(
            username="buyer7", email="buyer7@test.com",
            password="testbuyerpass",
            role="buyer", wallet_balance=Decimal("50.00"),
        )
        seller = User.objects.create_user(
            username="seller7", email="seller7@test.com",
            password="testsellerpass",
            role="seller",
        )
        book = BookListing.objects.create(
            seller=seller, title="Test Book 7", price=Decimal("20.00"),
            listing_type="sale", is_available=True,
        )
        order = Order.objects.create(
            buyer=buyer, seller=seller, book=book, order_type="sale",
            total_price=Decimal("20.00"), status="pending",
        )

        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get(f"/api/transactions/orders/{order.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert str(order.id) == response.data["id"]
