from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source='company.name')
    
    class Meta:
        model = UserProfile
        fields = ['role', 'status', 'company', 'company_name', 'finance', 'support', 'tech', 'sales']

class UserSerializer(serializers.ModelSerializer):
    permissions = UserProfileSerializer(source='profile', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'permissions']
