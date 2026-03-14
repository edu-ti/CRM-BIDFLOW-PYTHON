from django.urls import path
from .views import FinanceReportView, SalesReportView, InventoryReportView
from .analytics_views import SalesAnalyticsView, FinanceAnalyticsView

urlpatterns = [
    path('finance/', FinanceReportView.as_view(), name='report-finance'),
    path('sales/', SalesReportView.as_view(), name='report-sales'),
    path('inventory/', InventoryReportView.as_view(), name='report-inventory'),
    path('analytics/sales/', SalesAnalyticsView.as_view(), name='analytics-sales'),
    path('analytics/finance/', FinanceAnalyticsView.as_view(), name='analytics-finance'),
]
