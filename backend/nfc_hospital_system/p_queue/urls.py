from django.urls import path
from . import views

urlpatterns = [
    # 대기열 추가 (POST)
    # URL: /api/v1/queue/join/
    path('join/', views.QueueJoinView.as_view(), name='queue-join'),

    # 내 대기 상태 조회 (GET)
    # URL: /api/v1/queue/my-position/
    path('my-position/', views.MyPositionView.as_view(), name='my-position'),

    # 대기열 목록 (관리자용) (GET)
    # URL: /api/v1/queue/
    path('', views.QueueListView.as_view(), name='queue-list'),

    # 상태 변경 API
    # URL: /api/v1/queue/{queueId}/
    path('<uuid:pk>/', views.QueueStatusUpdateView.as_view(), name='queue-status-update'),

    path('test-update/', views.test_queue_update, name='test-queue-update'),
    
    # 대기열 모니터링 추가 API
    path('admin/realtime/', views.queue_realtime_sse, name='queue-realtime-sse'),
    path('admin/by-department/', views.queue_by_department, name='queue-by-department'),
    path('admin/alert-settings/', views.update_alert_settings, name='update-alert-settings'),
    path('admin/metrics/', views.queue_performance_metrics, name='queue-performance-metrics'),
    
    # 의료진용 API
    path('medical/call-patient/', views.call_patient, name='call-patient'),
    path('medical/missing-patients/', views.missing_patients, name='missing-patients'),
]
