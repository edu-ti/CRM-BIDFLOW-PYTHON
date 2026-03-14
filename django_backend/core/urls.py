from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.authentication import JWTAuthentication

# Uma view protegida usando o JWTAuthentication do DRF
@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def teste_api(request):
    # 'request.user' terá o utilizador gerado pela nossa classe, e 'request.auth' o dicionário com o token
    user_id = request.user.username 
    email = getattr(request.user, 'email', '')
    
    return Response({
        "mensagem": "Olá do Django! A integração funciona.",
        "user_id": user_id,
        "email": email
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/teste/', teste_api),
    path('api/crm/', include('crm.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/users/', include('users.urls')),
    path('api/', include('communications.urls')),
    path('api/master/', include('saas_master.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/reports/', include('reports.urls')),
]