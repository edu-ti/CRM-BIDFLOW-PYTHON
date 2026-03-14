from rest_framework import serializers
from .models import Contact, Deal, Task, Proposal, Organization, Individual

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'
        read_only_fields = ['user']

class IndividualSerializer(serializers.ModelSerializer):
    class Meta:
        model = Individual
        fields = '__all__'
        read_only_fields = ['user']

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

    def create(self, validated_data):
        # We enforce the 'user' automatically via the view
        return Contact.objects.create(**validated_data)


class DealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

    def create(self, validated_data):
        return Deal.objects.create(**validated_data)


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

    def create(self, validated_data):
        return Task.objects.create(**validated_data)


class ProposalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proposal
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

    def create(self, validated_data):
        return Proposal.objects.create(**validated_data)
