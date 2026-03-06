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


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='crm_organizations')
    
    fantasy_name = models.CharField(max_length=255)
    social_reason = models.CharField(max_length=255, blank=True, null=True)
    cnpj = models.CharField(max_length=20, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['fantasy_name']

    def __str__(self):
        return self.fantasy_name


class Individual(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='crm_individuals')
    
    name = models.CharField(max_length=255)
    cpf = models.CharField(max_length=20, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


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


class Task(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('completed', 'Concluída'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', 'created_at']

    def __str__(self):
        return self.title


class Proposal(models.Model):
    STATUS_CHOICES = [
        ('Rascunho', 'Rascunho'),
        ('Enviada', 'Enviada'),
        ('Aprovada', 'Aprovada'),
        ('Recusada', 'Recusada'),
        ('Negociando', 'Negociando'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='proposals')
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='proposals', null=True, blank=True)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='proposals', null=True, blank=True)
    
    number = models.CharField(max_length=50, blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    validity = models.DateField(blank=True, null=True)
    client_name = models.CharField(max_length=255, blank=True, null=True)
    
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Rascunho')
    
    # Store complex parts as JSON
    items = models.JSONField(default=list, blank=True)
    terms = models.JSONField(default=dict, blank=True)
    
    # User's requested "content" field (can be used for additional notes)
    content = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.number or 'S/N'} - {self.client_name or 'Sem Cliente'}"
