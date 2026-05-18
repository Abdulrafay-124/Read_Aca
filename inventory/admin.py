from django.contrib import admin
from .models import Category, BookListing


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'parent')
    list_filter = ('parent',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(BookListing)
class BookListingAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'seller', 'price', 'condition', 'listing_type', 'is_available', 'created_at')
    list_filter = ('condition', 'listing_type', 'is_available', 'category')
    search_fields = ('title', 'author', 'isbn', 'description')
    readonly_fields = ('created_at', 'updated_at')