from rest_framework import viewsets
from rest_framework_simplejwt.authentication import JWTAuthentication
from .permissions import IsSuperAdmin
from .models import Company, Plan, Instance, FinanceRecord
from .serializers import CompanySerializer, PlanSerializer, InstanceSerializer, FinanceRecordSerializer

class MasterCompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]

    def initial(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"INITIAL: user={request.user}, path={request.path}")
        super().initial(request, *args, **kwargs)

class MasterPlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]

    def initial(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"INITIAL: user={request.user}, path={request.path}")
        super().initial(request, *args, **kwargs)

class MasterInstanceViewSet(viewsets.ModelViewSet):
    queryset = Instance.objects.all()
    serializer_class = InstanceSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]

    def initial(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"INITIAL: user={request.user}, path={request.path}")
        super().initial(request, *args, **kwargs)

    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        if company_id:
            return self.queryset.filter(company_id=company_id)
        return self.queryset

class MasterFinanceViewSet(viewsets.ModelViewSet):
    queryset = FinanceRecord.objects.all()
    serializer_class = FinanceRecordSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperAdmin]

    def initial(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"INITIAL: user={request.user}, path={request.path}")
        super().initial(request, *args, **kwargs)
    
    def get_queryset(self):
        # Allow filtering by company in query params
        company_id = self.request.query_params.get('company_id')
        if company_id:
            return self.queryset.filter(company_id=company_id)
        return self.queryset

import stripe
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

stripe.api_key = settings.STRIPE_SECRET_KEY

class CreateStripeCheckoutSessionView(APIView):
    authentication_classes = [JWTAuthentication]
    # In a real scenario, permission could be IsAuthenticated, but we check if the user belongs to a company
    
    def post(self, request):
        user = request.user
        # Retrieve the user's company (assuming profile -> company relation)
        # For simplicity, we assume the first active company if user is superadmin or standard logic applies
        # Real-world: user.profile.company
        user_profile = getattr(user, 'profile', None)
        if not user_profile or not user_profile.company:
            return Response({'error': 'Usuário não tem uma empresa associada.'}, status=status.HTTP_400_BAD_REQUEST)
            
        company = user_profile.company
        plan_id = request.data.get('plan_id')
        
        if not plan_id:
            return Response({'error': 'plan_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            plan = Plan.objects.get(id=plan_id)
        except Plan.DoesNotExist:
            return Response({'error': 'Plano não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Here we need a Stripe Price ID linked to the Plan. We mock it or expect it as a field.
            # Assuming `plan.stripe_price_id` exists, or we use a fixed demo price ID.
            # For this MVP, we pass a hypothetical price id, or rely on client data.
            stripe_price_id = request.data.get('stripe_price_id', 'price_1XXXXXXXXXXX')
            
            checkout_session = stripe.checkout.Session.create(
                customer=company.stripe_customer_id, # Can be None for first time
                payment_method_types=['card'],
                line_items=[
                    {
                        'price': stripe_price_id,
                        'quantity': 1,
                    },
                ],
                mode='subscription',
                client_reference_id=str(company.id),
                success_url=request.build_absolute_uri('/#/app/settings?session_id={CHECKOUT_SESSION_ID}'),
                cancel_url=request.build_absolute_uri('/#/app/settings'),
            )
            return Response({'url': checkout_session.url})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    authentication_classes = [] # Webhooks don't use Firebase Auth
    permission_classes = []
    
    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError as e:
            # Invalid payload
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # Handle the event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            company_id = session.get('client_reference_id')
            customer_id = session.get('customer')
            subscription_id = session.get('subscription')
            
            try:
                company = Company.objects.get(id=company_id)
                company.stripe_customer_id = customer_id
                company.stripe_subscription_id = subscription_id
                company.subscription_status = 'active'
                company.save()
            except Company.DoesNotExist:
                pass

        elif event['type'] == 'invoice.payment_failed':
            invoice = event['data']['object']
            subscription_id = invoice.get('subscription')
            customer_id = invoice.get('customer')
            
            try:
                company = Company.objects.get(stripe_customer_id=customer_id)
                from .tasks import handle_failed_payment
                handle_failed_payment.delay(company_id=str(company.id))
            except Company.DoesNotExist:
                pass
            
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            try:
                company = Company.objects.get(stripe_subscription_id=subscription.id)
                company.subscription_status = 'canceled'
                company.save()
            except Company.DoesNotExist:
                pass

        return Response(status=status.HTTP_200_OK)
