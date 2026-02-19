from django.urls import path
from .views import AnalyticsOverviewAPIView, AnalyticsPerformanceAPIView, AnalyticsTrendsAPIView

urlpatterns = [
    path("analytics/overview/", AnalyticsOverviewAPIView.as_view(), name="analytics-overview"),
    path("analytics/performance/", AnalyticsPerformanceAPIView.as_view(), name="analytics-performance"),
    path("analytics/trends/", AnalyticsTrendsAPIView.as_view(), name="analytics-trends"),
]
