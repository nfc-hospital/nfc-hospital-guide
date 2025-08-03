# admin_dashboard URL 설정 
from django.urls import path 
from . import views 
from nfc.views import tag_status_monitoring, admin_tag_list

urlpatterns = [ 
    # NFC 태그 관리 API (API 명세서 기준)
    path('nfc/tags/list/', admin_tag_list, name='admin-nfc-tag-list'),
    path('tags/status/', tag_status_monitoring, name='admin-tag-status'),
    # TODO: API 명세서에 맞게 /admin/tags로 통일 예정
] 
