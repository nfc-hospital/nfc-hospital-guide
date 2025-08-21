from django.urls import path
from . import views

urlpatterns = [
    # EMR 연동 API
    # path('emr/sync-status/', views.emr_sync_status, name='emr-sync-status'),
    # path('emr/trigger-sync/', views.emr_trigger_sync, name='emr-trigger-sync'),
    # path('emr/sync-history/', views.emr_sync_history, name='emr-sync-history'),
    # path('emr/mapping-rules/', views.emr_mapping_rules, name='emr-mapping-rules'),
    
    # 시연용 가상 EMR 테스트 API
    path('test/patients/', views.test_patient_list, name='test-patient-list'),
    path('test/patient-state/', views.test_update_patient_state, name='test-update-state'),
    path('test/simulate/', views.test_simulate_patient_flow, name='test-simulate'),
    path('test/reset/', views.test_reset_all_states, name='test-reset'),
]
