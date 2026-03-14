from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Deal
from finance.tasks import create_won_deal_transaction

@receiver(post_save, sender=Deal)
def handle_won_deal(sender, instance, created, **kwargs):
    """
    Quando um Negócio (Deal) for guardado e o seu status for 'Won' (Ganho),
    dispara a tarefa assíncrona do Celery para faturar no módulo financeiro.
    """
    # Apenas geramos a fatura se o deal estiver completo e guardado como Won.
    # Em produção, poderíamos também adicionar uma flag "invoiced" ou equivalente.
    if instance.status == 'WON':
        contact_name = instance.contact.name if instance.contact else 'Desconhecido'
        create_won_deal_transaction.delay(
            deal_id=str(instance.id),
            deal_title=instance.title,
            deal_value=instance.value,
            contact_name=contact_name,
            user_id=instance.user.id
        )
