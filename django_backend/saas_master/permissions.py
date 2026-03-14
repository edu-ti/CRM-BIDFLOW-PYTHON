from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        import logging
        import sys
        
        # Explicitly configure a stream handler for stdout to bypass standard Django logging buffers if necessary
        logger = logging.getLogger('IsSuperAdminTest')
        logger.setLevel(logging.DEBUG)
        if not logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            logger.addHandler(handler)

        logger.debug(f">>>>>>>>>>>> DEBUG IsSuperAdmin: checking user {request.user}")
        if not request.user or not request.user.is_authenticated:
            logger.debug(">>>>>>>>>>>> DEBUG IsSuperAdmin: User is completely unauthenticated!")
            return False
            
        try:
            role = getattr(request.user, 'profile', None)
            if role:
                role = role.role
            logger.debug(f">>>>>>>>>>>> DEBUG IsSuperAdmin: Role is {role}")
            return role == 'superadmin'
        except Exception as e:
            logger.debug(f">>>>>>>>>>>> DEBUG IsSuperAdmin: Exception reading profile! {e}")
            return False
