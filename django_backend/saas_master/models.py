import uuid
from django.db import models

class Plan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    features = models.JSONField(default=list) # List of strings
    limits = models.JSONField(default=dict) # {users: X, msgs: Y}
    modules = models.JSONField(default=dict) # {chatbot: bool, automation: bool, api: bool}
    recommended = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Company(models.Model):
    STATUS_CHOICES = [
        ('active', 'Ativo'),
        ('inactive', 'Inativo'),
        ('pending', 'Pendente'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, blank=True, null=True)
    responsible = models.CharField(max_length=255, blank=True, null=True)
    tax_id = models.CharField(max_length=50, unique=True, verbose_name="CNPJ/NIF")
    contact_email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True, blank=True, related_name='companies')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Companies"

    def __str__(self):
        return self.name

class Instance(models.Model):
    STATUS_CHOICES = [
        ('CONNECTED', 'Conectado'),
        ('DISCONNECTED', 'Desconectado'),
        ('QRCODE', 'Aguardando QR Code'),
        ('PAIRING', 'Pareando'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='instances')
    name = models.CharField(max_length=255)
    provider = models.CharField(max_length=100, default='evolution') # e.g., Evolution API, Twilio
    api_key = models.CharField(max_length=255, blank=True, null=True)
    api_url = models.URLField(blank=True, null=True)
    webhook_url = models.URLField(blank=True, null=True)
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    whatsapp_phone_number_id = models.CharField(max_length=100, blank=True, null=True, help_text="Meta/WhatsApp Business API Phone Number ID")
    battery_level = models.IntegerField(null=True, blank=True)
    last_sync = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DISCONNECTED')
    config = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.company.name})"

class FinanceRecord(models.Model):
    TYPE_CHOICES = [
        ('invoice', 'Fatura'),
        ('payment', 'Pagamento'),
    ]
    STATUS_CHOICES = [
        ('paid', 'Pago'),
        ('pending', 'Pendente'),
        ('overdue', 'Atrasado'),
        ('cancelled', 'Cancelado'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='finance_records')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-due_date']

    def __str__(self):
        return f"{self.company.name} - {self.amount} ({self.status})"
