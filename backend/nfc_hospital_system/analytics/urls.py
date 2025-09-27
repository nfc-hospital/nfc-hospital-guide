from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # 통계 데이터 API
    path('patient-flow/', views.patient_flow_analysis, name='patient-flow'),
    path('waiting-time/', views.waiting_time_statistics, name='waiting-time'),
    path('congestion-heatmap/', views.congestion_heatmap, name='congestion-heatmap'),
    path('nfc-usage/', views.nfc_usage_analytics, name='nfc-usage'),
    path('bottlenecks/', views.identify_bottlenecks, name='bottlenecks'),
    path('custom-report/', views.custom_report, name='custom-report'),
    path('export/', views.export_data, name='export'),
    path('predictions/', views.predictions, name='predictions'),  # LSTM 예측 API
]