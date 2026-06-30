from rest_framework import serializers
from inventory.models import BookListing
from .models import UserInteraction


class RatingSerializer(serializers.Serializer):

    book = serializers.PrimaryKeyRelatedField(queryset = BookListing.objects.all())
    rating = serializers.IntegerField(min_value = 1, max_value = 5)

    def create(self, validated_data):

        interaction, _ = UserInteraction.objects.update_or_create(

            user = self.context["request"].user,
            book = validated_data["book"],
            interaction_type = "rating",
            defaults = {"rating": validated_data["rating"]},

        )

        return interaction
    

