from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# DRF Router 설정
router = DefaultRouter()
# router.register(r'admin/nfc/tags', views.AdminNFCTagViewSet, basename='admin-nfc-tags')
router.register(r'tags', views.AdminNFCTagViewSet, basename='admin-nfc-tags')
router.register(r'facility-routes', views.FacilityRouteViewSet, basename='facility-routes')


app_name = 'nfc'

urlpatterns = [
    # 환자용 NFC API (API 명세서 v3 기준)
    path('scan/', views.nfc_scan, name='nfc-scan'),                    # POST /api/v1/nfc/scan/
    path('public-info/', views.nfc_public_scan, name='nfc-public-info'),  # POST /api/v1/nfc/public-info/
    
    # MockNFC용 태그 목록 (개발용)
    path('tags/', views.get_nfc_tags_list, name='nfc-tags-list'),
    path('tags/<str:tag_id>/', views.get_tag_info, name='tag-info'),
    path('tags/<str:tag_id>/location/', views.get_nfc_location, name='nfc-location'),
    
    # 실시간 경로 탐색 (navigation과 연동)
    path('scan/navigate/', views.NFCTagScanNavigateView.as_view(), name='nfc-scan-navigate'),
    
    # 검사-태그 매핑 API
    path('admin/tag-exam-mapping/', views.nfc_tag_exam_mapping_create, name='nfc-tag-exam-mapping'),  # POST /api/v1/dashboard/nfc/tag-exam-mapping
    path('tags/<str:tag_id>/exams/', views.get_tag_exams_list, name='get-tag-exams-list'),           # GET
    path('tags/mapping/<int:mapping_id>/', views.delete_tag_exam_mapping, name='delete-tag-exam-mapping'),  # DELETE
    
    # 통계 및 모니터링 API
    path('admin/tags/bulk/', views.bulk_tag_operation, name='bulk-tag-operation'),
    path('admin/tags/statistics/', views.tag_usage_statistics, name='tag-usage-statistics'),
    path('admin/tags/status/', views.tag_status_monitoring, name='tag-status-monitoring'),
    path('admin/tags/<str:tag_id>/history/', views.tag_assignment_history, name='tag-assignment-history'),
    path('today-scans/', views.get_today_scans, name='nfc-today-scans'),
    
    # ViewSet URLs (관리자 API용)
    path('', include(router.urls)),
]