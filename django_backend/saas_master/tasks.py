import logging
from celery import shared_task
from .models import Company

logger = logging.getLogger(__name__)

@shared_task
def handle_failed_payment(company_id):
    """
    Task to execute business logic when a payment fails for a given company. 
    E.g. send an alert email, or downgrade plan.
    """
    try:
        company = Company.objects.get(id=company_id)
        # 1. Update status
        if company.subscription_status != 'past_due':
            company.subscription_status = 'past_due'
            company.save(update_fields=['subscription_status'])
            
        # 2. Add further logic: Notify admins, Disable some premium features, etc.
        logger.warning(f"Pagamento falhou para a empresa {company.name} ({company.id}). Status alterado para past_due.")
        return f"Company {company_id} marked as past_due"
        
    except Company.DoesNotExist:
        logger.error(f"Company {company_id} não encontrada ao processar falha de pagamento.")
        return f"Company {company_id} not found"
