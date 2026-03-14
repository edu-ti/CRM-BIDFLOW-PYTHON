from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth, Coalesce
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from crm.models import Deal, Contact
from finance.models import Transaction, TransactionCategory

class SalesAnalyticsView(APIView):
    """
    Endpoint para alimentar o Dashboard de Vendas (CRM).
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        six_months_ago = now - timedelta(days=6*30)

        # 1. Taxa de Conversão (Negócios Ganhos vs Total de Negócios Fechados/Ativos)
        total_deals = Deal.objects.filter(user=user).count()
        won_deals = Deal.objects.filter(user=user, status='WON').count()
        conversion_rate = (won_deals / total_deals * 100) if total_deals > 0 else 0

        # 2. Valor total em funil (agrupado por stageId - ignorando perdidos/ganhos definitivos caso se queira funil aberto)
        # Vamos usar 'stageId' que é onde está The Funnel.
        funnel_values = Deal.objects.filter(user=user).exclude(status__in=['LOST']).values('stageId').annotate(
            total_value=Coalesce(Sum('value'), 0.0),
            count=Count('id')
        ).order_by('stageId')
        
        # Mapeamento simpático
        funnel_data = {item['stageId']: {'value': float(item['total_value']), 'count': item['count']} for item in funnel_values}

        # 3. Evolução de novos Leads por Mês (últimos 6 meses)
        leads_by_month = Contact.objects.filter(
            user=user,
            created_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')
        
        trend_data = []
        for lbm in leads_by_month:
            trend_data.append({
                'month': lbm['month'].strftime('%Y-%m'),
                'leads': lbm['count']
            })

        return Response({
            'total_deals': total_deals,
            'won_deals': won_deals,
            'conversion_rate': round(conversion_rate, 2),
            'funnel_by_stage': funnel_data,
            'leads_trend_6m': trend_data
        })


class FinanceAnalyticsView(APIView):
    """
    Endpoint para alimentar o Dashboard Financeiro.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        six_months_ago = now - timedelta(days=6*30)

        # 1. Receitas vs Despesas (agrupado por mês - últimos 6 meses)
        # Assumindo query de due_date e status pago
        transactions = Transaction.objects.filter(
            user=user,
            status='PAID',
            due_date__gte=six_months_ago.date()
        ).annotate(
            month=TruncMonth('due_date')
        ).values('month', 'type').annotate(
            total=Coalesce(Sum('value'), 0.0)
        ).order_by('month')
        
        cashflow = {}
        for tr in transactions:
            m_str = tr['month'].strftime('%Y-%m')
            t_type = tr['type']  # IN ou OUT
            
            if m_str not in cashflow:
                cashflow[m_str] = {'IN': 0, 'OUT': 0}
            
            cashflow[m_str][t_type] += float(tr['total'])
            
        cashflow_list = [{'month': k, 'income': v['IN'], 'expense': v['OUT']} for k, v in cashflow.items()]

        # 2. Top 5 Categorias de Despesas
        top_expenses = Transaction.objects.filter(
            user=user,
            type='OUT',
            status='PAID' # Despesas efetivamente pagas
        ).values('category__name').annotate(
            total=Coalesce(Sum('value'), 0.0)
        ).order_by('-total')[:5]
        
        expenses_data = [{'category': e['category__name'] or 'Sem Categoria', 'total': float(e['total'])} for e in top_expenses]

        # 3. Valor total em atraso (past due)
        # Vencidos e não pagos (status recebível 'PENDING' e vencimento menor que hoje, ou OUT PENDING menor que hoje)
        past_due_in = Transaction.objects.filter(
            user=user,
            type='IN',
            status='PENDING',
            due_date__lt=now.date()
        ).aggregate(total=Coalesce(Sum('value'), 0.0))['total']

        past_due_out = Transaction.objects.filter(
            user=user,
            type='OUT',
            status='PENDING',
            due_date__lt=now.date()
        ).aggregate(total=Coalesce(Sum('value'), 0.0))['total']

        return Response({
            'cashflow_6m': cashflow_list,
            'top_expenses': expenses_data,
            'past_due_in': float(past_due_in),
            'past_due_out': float(past_due_out)
        })
