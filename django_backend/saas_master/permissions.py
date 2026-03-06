from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """
    Permite acesso apenas a utilizadores com o role 'superadmin' no seu UserProfile.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        try:
            return request.user.userprofile.role == 'superadmin'
        except AttributeError:
            # Caso o utilizador não tenha um UserProfile associado
            return False
