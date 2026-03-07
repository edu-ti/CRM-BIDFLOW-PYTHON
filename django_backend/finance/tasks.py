import logging
from celery import shared_task
from django.utils import timezone
from .models import Transaction
from decimal import Decimal

logger = logging.getLogger(__name__)

@shared_task
def check_pending_transactions_due_today():
    """
    Scheduled task that runs daily.
    Finds all pending transactions due today and logs a warning.
    In a real scenario, it could send an email/WhatsApp.
    """
    today = timezone.localtime().date()
    # PENDING transactions due today or earlier
    overdue_txs = Transaction.objects.filter(status='PENDING', due_date__lte=today)
    
    count = overdue_txs.count()
    if count > 0:
        logger.info(f"ALERTA: Existem {count} transações pendentes a vencer hoje ou atrasadas.")
        for tx in overdue_txs:
            logger.info(f" - [{tx.id}] {tx.title}: R$ {tx.value} (Vencimento: {tx.due_date})")
    else:
        logger.info("Nenhuma transação pendente a vencer hoje.")

    return f"Checked {count} pending/overdue transactions."

@shared_task
def create_won_deal_transaction(deal_id, deal_title, deal_value, contact_name, user_id):
    """
    Async task triggered when a Deal is moved to 'Won'.
    Automatically creates an 'IN' Transaction in the finance module.
    """
    from .models import Transaction, BankAccount
    from django.contrib.auth.models import User
    
    logger.info(f"Processando faturação automática para o Negócio Ganho: {deal_title}")
    
    try:
        user = User.objects.get(id=user_id)
        
        # Obter ou criar uma conta bancária por defeito para associar
        bank_account = BankAccount.objects.filter(user=user).first()
        if not bank_account:
            bank_account = BankAccount.objects.create(
                user=user,
                name="Conta Automática (Sistema)",
                initial_balance=Decimal('0.00')
            )

        # Criar a transação
        Transaction.objects.create(
            user=user,
            title=f"Receita - {deal_title}",
            type='IN',
            value=Decimal(str(deal_value)),
            due_date=timezone.localtime().date(),
            status='PENDING',
            bank_account=bank_account,
            notes=f"Lançamento automático de negócio ganho. Cliente: {contact_name}"
        )
        
        logger.info(f"Sucesso: Lançamento criado para {deal_title}.")
        return {"status": "success", "deal_id": deal_id}
        
    except Exception as e:
        logger.error(f"Erro ao faturar negócio {deal_title}: {str(e)}")
        return {"status": "error", "error": str(e)}
