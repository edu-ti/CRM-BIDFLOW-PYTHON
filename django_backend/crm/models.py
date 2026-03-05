from django.db import models
from django.contrib.auth.models import User
import uuid

class Contact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # The tenant / user who owns this contact (as Firebase auth mapped to Django User)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacts')
    
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)  # E.g., WhatsApp ID 5511999999999
    email = models.EmailField(blank=True, null=True)
    avatar = models.URLField(max_length=500, blank=True, null=True)
    
    # CRM Specific fields
    address = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    custom_fields = models.JSONField(blank=True, null=True)  # Store flexible data
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        # Depending on requirements, we can enforce unique phone per user later
        # unique_together = ('user', 'phone')

    def __str__(self):
        return f"{self.name} - {self.phone}"


class Deal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # The tenant / user who owns this deal
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deals')
    # The associated contact
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='deals', null=True, blank=True)
    
    title = models.CharField(max_length=255)
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    contact_name = models.CharField(max_length=255, blank=True, null=True) # Fallback para o frontend que manda contactName livre
    
    # Funnel metadata (Simulated as strings for Phase 1 to avoid over-engineering)
    funnel_id = models.CharField(max_length=100, blank=True, null=True)
    stage_id = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.value})"
