from django.urls import path
from . import views

urlpatterns = [
    # EMR 연동 API
    # path('emr/sync-status/', views.emr_sync_status, name='emr-sync-status'),
    # path('emr/trigger-sync/', views.emr_trigger_sync, name='emr-trigger-sync'),
    # path('emr/sync-history/', views.emr_sync_history, name='emr-sync-history'),
    # path('emr/mapping-rules/', views.emr_mapping_rules, name='emr-mapping-rules'),
    
    # 시연용 가상 EMR 테스트 API
    path('patients/', views.test_patient_list, name='test-patient-list'),
    path('patient-state/', views.test_update_patient_state, name='test-update-state'),
    path('queue-state/', views.test_update_queue_state, name='test-update-queue-state'),
    path('simulate/', views.test_simulate_patient_flow, name='test-simulate'),
    path('reset/', views.test_reset_all_states, name='test-reset'),
    
    # 시연용 검사/진료 관리 API
    path('available-exams/', views.test_get_available_exams, name='test-available-exams'),
    path('add-exam/', views.test_add_exam_to_patient, name='test-add-exam'),
    path('remove-exam/<str:appointment_id>/', views.test_remove_exam_from_patient, name='test-remove-exam'),
    
    # 시연용 위치 관리 API
    path('locations/', views.test_get_locations, name='test-locations'),
    path('patient-location/', views.test_update_patient_location, name='test-update-location'),
    
    # 지도 및 경로 관리 API
    path('maps/', views.test_get_maps, name='test-maps'),
    path('facility-route/<str:facility_name>/', views.test_get_facility_route, name='test-facility-route'),
    path('save-facility-route/', views.test_save_facility_route, name='test-save-facility-route'),
]
