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
    # 환자용 API (개별 뷰를 먼저 정의)
    path('scan/', views.nfc_scan, name='nfc-scan'),
    path('public-info/', views.nfc_public_scan, name='nfc-public-info'),  # 비로그인용 별도 뷰
    path('tags/<str:tag_id>/', views.get_tag_info, name='tag-info'),  # ViewSet보다 먼저 정의
    
    # ViewSet URLs - router.urls는 나중에 처리
    path('', include(router.urls)),
    
    # 관리자용 API (기존 유지)
    # path('admin/nfc/tags/list/', views.admin_tag_list, name='admin-tag-list'),
    path('nfc/today-scans/', views.get_today_scans, name='nfc-today-scans'),
    
    # 검사-태그 매핑 API (새로 추가되거나 수정된 부분)
    path('admin/nfc/tag-exam-mapping/', views.nfc_tag_exam_mapping_create, name='nfc_tag_exam_mapping_create'), # POST
    path('tags/<uuid:tag_id>/exams', views.get_tag_exams_list, name='get_tag_exams_list'), # GET
    path('tags/mapping/<int:mapping_id>', views.delete_tag_exam_mapping, name='delete_tag_exam_mapping'), # DELETE
    
    # 추가된 태그 관리 API
    path('admin/nfc/tags/bulk/', views.bulk_tag_operation, name='bulk-tag-operation'),
    path('admin/nfc/tags/statistics/', views.tag_usage_statistics, name='tag-usage-statistics'),
    path('admin/tags/status/', views.tag_status_monitoring, name='tag-status-monitoring'),
    path('admin/nfc/tags/<uuid:tag_id>/history/', views.tag_assignment_history, name='tag-assignment-history'),
    
]