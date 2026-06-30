from celery import shared_task
from .models import BookListing
from .services import generate_embedding

@shared_task
def generate_book_embedding(book_id):
    book = BookListing.objects.get(id=book_id)
    book.embedding = generate_embedding(book)
    book.save(update_fields=["embedding"])