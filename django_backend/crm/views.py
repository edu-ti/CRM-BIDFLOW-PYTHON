from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.authentication import FirebaseAuthentication
from .models import Contact, Deal
from .serializers import ContactSerializer, DealSerializer

class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure the user can only see their own contacts
        return Contact.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Inject the currently authenticated user when creating a contact
        serializer.save(user=self.request.user)


class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Deal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
