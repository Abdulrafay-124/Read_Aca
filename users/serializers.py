import uuid
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.conf import settings
from .models import User


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(max_length=100)
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    role = serializers.CharField(max_length=20)

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError("Passwords must match.")
        if data["role"] not in ["buyer", "seller"]:
            raise serializers.ValidationError("Role can only be 'buyer' or 'seller'.")
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=validated_data["password"],
            role=validated_data["role"]
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")

        if email and password:
            user = authenticate(request=self.context.get("request"),
                                username=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid credentials")
        else:
            raise serializers.ValidationError("Must include \"email\" and \"password\".")
        data["user"] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "role",
            "profile_picture_url",
            "wallet_balance",
            "created_at",
        )
        read_only_fields = (
            "id",
            "email",
            "username",
            "role",
            "wallet_balance",
            "created_at",
        )
