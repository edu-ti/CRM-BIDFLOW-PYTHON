from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContactViewSet, DealViewSet, TaskViewSet, 
    ProposalViewSet, OrganizationViewSet, IndividualViewSet
)

router = DefaultRouter()
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'deals', DealViewSet, basename='deal')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'proposals', ProposalViewSet, basename='proposal')
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'individuals', IndividualViewSet, basename='individual')

urlpatterns = [
    path('', include(router.urls)),
]
