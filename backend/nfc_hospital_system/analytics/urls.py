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
    path('predictions/timeline/', views.predictions_timeline, name='predictions-timeline'),  # 시계열 예측
    path('predictions/domino/', views.predictions_domino, name='predictions-domino'),  # 도미노 효과
    path('predictions/heatmap/', views.predictions_heatmap, name='predictions-heatmap'),  # 히트맵
]