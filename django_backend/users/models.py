from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, default='client') # superadmin, client
    status = models.CharField(max_length=20, default='active')
    finance = models.BooleanField(default=False)
    support = models.BooleanField(default=False)
    tech = models.BooleanField(default=False)
    sales = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.user.username} - {self.role}"
