from rest_framework import serializers
from .models import Event, Campaign, ChatbotFlow

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['user']

class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = '__all__'
        read_only_fields = ['user']

class ChatbotFlowSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotFlow
        fields = '__all__'
        read_only_fields = ['user']
