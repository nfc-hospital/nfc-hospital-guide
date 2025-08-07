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
    path('dashboard/realtime/', views.queue_realtime_sse, name='queue-realtime-sse'),
    path('dashboard/realtime-data/', views.queue_realtime_data, name='queue-realtime-data'),
    path('admin/realtime-data/', views.queue_realtime_data, name='queue-admin-realtime-data'),  # 관리자 전용
    path('dashboard/by-department/', views.queue_by_department, name='queue-by-department'),
    path('dashboard/alert-settings/', views.update_alert_settings, name='update-alert-settings'),
    path('dashboard/metrics/', views.queue_performance_metrics, name='queue-performance-metrics'),
    
    # 의료진용 API
    path('medical/call-patient/', views.call_patient, name='call-patient'),
    path('medical/missing-patients/', views.missing_patients, name='missing-patients'),

    # 환자 상태 관리 API (추가)

    # NFC 태깅 관련 API
    # URL: /api/v1/queue/nfc/public-info/
    path('nfc/public-info/', views.nfc_public_info, name='nfc-public-info'),
    
    # URL: /api/v1/queue/nfc/checkin/
    path('nfc/checkin/', views.nfc_checkin, name='nfc-checkin'),
    
    # 환자 상태 조회 및 관리 API
    
    # URL: /api/v1/queue/patient/current-state/
    path('patient/current-state/', views.patient_current_state, name='patient-current-state'),
    
    # URL: /api/v1/queue/patient/daily-schedule/
    path('patient/daily-schedule/', views.patient_daily_schedule, name='patient-daily-schedule'),
    
    # URL: /api/v1/queue/patient/state-history/
    path('patient/state-history/', views.patient_state_history, name='patient-state-history'),

    # 상태 전환 관리 API (p_queue 기반)
    path('transitions/recent/', views.recent_state_transitions, name='recent-state-transitions'),
    path('transitions/analytics/', views.state_transition_analytics, name='state-transition-analytics'),
    
    # URL: /api/v1/queue/transitions/analytics/
    path('transitions/analytics/', views.state_transition_analytics, name='state-transition-analytics'),


]
