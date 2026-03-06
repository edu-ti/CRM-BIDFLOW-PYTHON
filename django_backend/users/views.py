from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from .models import UserProfile
from .serializers import UserSerializer

from rest_framework import viewsets, permissions as drf_permissions
from .serializers import UserSerializer, UserProfileSerializer
from saas_master.permissions import IsSuperAdmin

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Ensure UserProfile exists
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        # Superadmin default for admin@bidflow.com logic
        if created and user.email == 'admin@bidflow.com':
            profile.role = 'superadmin'
            profile.finance = True
            profile.support = True
            profile.tech = True
            profile.sales = True
            profile.save()
            
        # Optional: promote first user to superadmin if they are the only user profile
        elif created and UserProfile.objects.count() == 1:
            profile.role = 'superadmin'
            profile.finance = True
            profile.support = True
            profile.tech = True
            profile.sales = True
            profile.save()

        # Return the user data along with flattened permissions for easy access in frontend
        return Response({
            'user': UserSerializer(user).data,
            'role': profile.role,
            'company': {
                'id': profile.company.id if profile.company else None,
                'name': profile.company.name if profile.company else None
            },
            'permissions': {
                'superadmin': profile.role == 'superadmin',
                'finance': profile.finance,
                'support': profile.support,
                'tech': profile.tech,
                'sales': profile.sales
            }
        })

class MasterUserViewSet(viewsets.ModelViewSet):
    """
    ViewSet para o SuperAdmin gerir todos os utilizadores do sistema.
    """
    queryset = User.objects.all().select_related('profile', 'profile__company')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        if company_id:
            return self.queryset.filter(profile__company_id=company_id)
        return self.queryset
