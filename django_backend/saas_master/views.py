from rest_framework import viewsets
from core.authentication import FirebaseAuthentication
from .permissions import IsSuperAdmin
from .models import Company, Plan, Instance, FinanceRecord
from .serializers import CompanySerializer, PlanSerializer, InstanceSerializer, FinanceRecordSerializer

class MasterCompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsSuperAdmin]

class MasterPlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsSuperAdmin]

class MasterInstanceViewSet(viewsets.ModelViewSet):
    queryset = Instance.objects.all()
    serializer_class = InstanceSerializer
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        if company_id:
            return self.queryset.filter(company_id=company_id)
        return self.queryset

class MasterFinanceViewSet(viewsets.ModelViewSet):
    queryset = FinanceRecord.objects.all()
    serializer_class = FinanceRecordSerializer
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsSuperAdmin]
    
    def get_queryset(self):
        # Allow filtering by company in query params
        company_id = self.request.query_params.get('company_id')
        if company_id:
            return self.queryset.filter(company_id=company_id)
        return self.queryset
