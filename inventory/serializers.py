from rest_framework import serializers
from django.utils.text import slugify
from .models import Category, BookListing
import cloudinary.uploader


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "parent",
        )
        read_only_fields = ("slug",)

    def validate(self, data):
        # Ensure slug is unique
        name = data.get("name")
        parent = data.get("parent")

        if name:
            slug = slugify(name)
            # Check for existing categories with the same slug under the same parent
            queryset = Category.objects.filter(slug=slug)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError("Category with this name and parent already exists.")
        return data

    def create(self, validated_data):
        name = validated_data.get("name")
        validated_data["slug"] = slugify(name)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "name" in validated_data:
            validated_data["slug"] = slugify(validated_data["name"])
        return super().update(instance, validated_data)


class BookListingSerializer(serializers.ModelSerializer):
    seller = serializers.ReadOnlyField(source='seller.username')
    cover_image = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = BookListing
        fields = [
            "id",
            "seller",
            "category",
            "isbn",
            "title",
            "author",
            "description",
            "condition",
            "listing_type",
            "price",
            "cover_image_url",
            "is_available",
            "created_at",
            "updated_at",
            "cover_image", # For uploading image
        ]
        read_only_fields = [
            "id",
            "seller",
            "cover_image_url",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        cover_image = validated_data.pop("cover_image", None)
        instance = super().create(validated_data)
        if cover_image:
            upload_result = cloudinary.uploader.upload(cover_image)
            instance.cover_image_url = upload_result["secure_url"]
            instance.save()
        return instance

    def update(self, instance, validated_data):
        cover_image = validated_data.pop("cover_image", None)
        instance = super().update(instance, validated_data)
        if cover_image:
            upload_result = cloudinary.uploader.upload(cover_image)
            instance.cover_image_url = upload_result["secure_url"]
            instance.save()
        return instance


class BookListingDetailSerializer(BookListingSerializer):
    category = CategorySerializer(read_only=True)

    class Meta(BookListingSerializer.Meta):
        fields = BookListingSerializer.Meta.fields
