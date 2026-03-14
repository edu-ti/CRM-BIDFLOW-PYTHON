import uuid
from django.db import models
from django.contrib.auth.models import User

class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendar_events')
    
    title = models.CharField(max_length=255)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    description = models.TextField(blank=True, null=True)
    color = models.CharField(max_length=50, default='blue')
    type = models.CharField(max_length=50, blank=True, null=True) # meeting, training, etc.
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_date']

    def __str__(self):
        return f"{self.title} ({self.start_date})"


class Campaign(models.Model):
    STATUS_CHOICES = [
        ('Ativa', 'Ativa'),
        ('Pausada', 'Pausada'),
        ('Concluída', 'Concluída'),
        ('Rascunho', 'Rascunho'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='campaigns')
    
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Rascunho')
    target_audience = models.CharField(max_length=255, blank=True, null=True)
    message_content = models.TextField()
    scheduled_date = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ChatbotFlow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chatbot_flows')
    
    name = models.CharField(max_length=255)
    flow_data = models.JSONField(default=dict) # High flexibility for nodes and edges
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Message(models.Model):
    SENDER_TYPE_CHOICES = [
        ('me', 'Me'),
        ('client', 'Client'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages')
    contact = models.ForeignKey('crm.Contact', on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    
    content = models.TextField()
    sender_type = models.CharField(max_length=10, choices=SENDER_TYPE_CHOICES)
    sender_name = models.CharField(max_length=255, blank=True, null=True)
    
    platform = models.CharField(max_length=50, default='whatsapp-meta')
    status = models.CharField(max_length=20, default='sent') # sent, delivered, read
    
    phone_number_id = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender_type}: {self.content[:30]}..."
