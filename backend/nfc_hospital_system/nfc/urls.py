from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# DRF Router 설정
router = DefaultRouter()
router.register(r'admin/nfc/tags', views.AdminNFCTagViewSet, basename='admin-nfc-tags')

app_name = 'nfc'

urlpatterns = [
    # 환자용 API
    path('nfc/scan/', views.nfc_scan, name='nfc-scan'),
    path('nfc/tags/<str:tag_id>/', views.get_tag_info, name='tag-info'),
    
    # 관리자용 API
    path('admin/nfc/tag-exam-mapping/', views.create_tag_exam_mapping, name='tag-exam-mapping'),
    path('admin/nfc/tags/list/', views.admin_tag_list, name='admin-tag-list'),
    
    # ViewSet URLs
    path('', include(router.urls)),
]