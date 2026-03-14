from rest_framework import serializers
from .models import Company, Plan, Instance, FinanceRecord

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = '__all__'

class CompanySerializer(serializers.ModelSerializer):
    plan_name = serializers.ReadOnlyField(source='plan.name')
    
    class Meta:
        model = Company
        fields = '__all__'

class InstanceSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source='company.name')
    
    class Meta:
        model = Instance
        fields = '__all__'

class FinanceRecordSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source='company.name')
    
    class Meta:
        model = FinanceRecord
        fields = '__all__'
