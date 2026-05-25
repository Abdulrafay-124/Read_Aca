from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from .serializers import RegisterSerializer, LoginSerializer, UserProfileSerializer
from .models import User


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        user_profile_serializer = UserProfileSerializer(user)

        return Response({
            "access": access_token,
            "refresh": refresh_token,
            "user": user_profile_serializer.data
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        user_profile_serializer = UserProfileSerializer(user)

        return Response({
            "access": access_token,
            "refresh": refresh_token,
            "user": user_profile_serializer.data
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RefreshView(TokenRefreshView):
    pass


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Allow updating only profile_picture_url and username
        if 'profile_picture_url' in serializer.validated_data:
            request.user.profile_picture_url = serializer.validated_data['profile_picture_url']
        if 'username' in serializer.validated_data:
            request.user.username = serializer.validated_data['username']
        
        request.user.save()
        return Response(UserProfileSerializer(request.user).data)
