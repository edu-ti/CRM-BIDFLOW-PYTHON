from rest_framework import serializers
from .models import BankAccount, TransactionCategory, Transaction

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = '__all__'
        read_only_fields = ['user']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TransactionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionCategory
        fields = '__all__'
        read_only_fields = ['user']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TransactionSerializer(serializers.ModelSerializer):
    # To expose names or related details without a separate serializer, we use CharFields explicitly
    bank_account_name = serializers.CharField(source='bank_account.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    contact_name = serializers.CharField(source='contact.name', read_only=True)
    deal_title = serializers.CharField(source='deal.title', read_only=True)

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['user']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
