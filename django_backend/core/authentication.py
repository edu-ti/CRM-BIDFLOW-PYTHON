from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import firebase_admin
from firebase_admin import auth
from django.contrib.auth.models import User
import os

class FirebaseAuthentication(BaseAuthentication):
    """
    Autenticação utilizando Firebase JWT.
    Lê o cabeçalho Authorization: Bearer <token>, 
    e valida-o utilizando firebase_admin.
    """
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            return None # Continua para outras formas de autenticação (se existirem)

        try:
            # Esperamos o formato: Bearer <token>
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                print(f"DEBUG: Formato Authorization inválido: {auth_header}")
                return None
                
            token = parts[1]
            
            # Verifica o token com o Firebase
            try:
                decoded_token = auth.verify_id_token(token)
            except Exception as e:
                # O token pode estar expirado ou ser inválido
                print(f"DEBUG: Token falhou na verificação Firebase: {str(e)}")
                raise AuthenticationFailed(f"Token Firebase inválido ou expirado: {str(e)}")
            
            # Obter o UID do Firebase
            uid = decoded_token.get("uid")
            if not uid:
                raise AuthenticationFailed("Payload do Token Firebase não contém uid")
                
            # Aqui podemos criar um utilizador temporário ou mapear para a BD do Django
            # Por agora, retornamos um utilizador simples baseado no UID e o payload do token
            try:
                user = User.objects.get(username=uid)
            except User.DoesNotExist:
                user = User(username=uid)
                # O is_authenticated é True por defeito nos models de User do Django (como propriedade), não se pode redefinir.
                # Só precisamos de gravar este User para que as permissões funcionem perfeitamente.
                user.email = decoded_token.get("email", "")
                user.save()
                
            return (user, decoded_token)
            
        except Exception as e:
            print(f"DEBUG FATAL na autenticacao Firebase: {str(e)}")
            if isinstance(e, AuthenticationFailed):
                raise
            raise AuthenticationFailed(f'Erro na autenticação: {str(e)}')
