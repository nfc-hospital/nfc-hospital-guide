# admin_dashboard URL 설정 
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views 
from .views import (
    NotificationViewSet, NotificationSettingsAPIView, 
    FCMTokenRegistrationAPIView, DeviceTokenViewSet,
    NotificationTestAPIView
)
from nfc.views import (
    tag_status_monitoring, admin_tag_list, AdminNFCTagViewSet,
    bulk_tag_operation, tag_usage_statistics, tag_assignment_history,
    nfc_tag_exam_mapping_create
)

# Router 설정
router = DefaultRouter()
router.register(r'nfc/tags', AdminNFCTagViewSet, basename='admin-nfc-tags')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'devices', DeviceTokenViewSet, basename='notification-devices')

urlpatterns = [ 
    # 알림 관련 API (router보다 우선순위 높게 배치)
    path('notifications/settings/', NotificationSettingsAPIView.as_view(), name='notification-settings'),
    path('notifications/register/', FCMTokenRegistrationAPIView.as_view(), name='fcm-token-register'),
    path('notifications/test/', NotificationTestAPIView.as_view(), name='notification-test'),
    
    # NFC 관련 특정 경로들 (router보다 먼저 배치해야 함!)
    path('nfc/tags/list/', admin_tag_list, name='admin-nfc-tag-list'),
    path('nfc/tags/bulk/', bulk_tag_operation, name='admin-bulk-tag-operation'),
    path('nfc/tags/statistics/', tag_usage_statistics, name='admin-tag-usage-statistics'),
    path('nfc/tags/<uuid:tag_id>/history/', tag_assignment_history, name='admin-tag-assignment-history'),
    path('nfc/tag-exam-mapping/', nfc_tag_exam_mapping_create, name='admin-nfc-tag-exam-mapping'),
    path('tags/status/', tag_status_monitoring, name='admin-tag-status'),
    
    # ViewSet URLs (마지막에 배치)
    path('', include(router.urls)),
]
