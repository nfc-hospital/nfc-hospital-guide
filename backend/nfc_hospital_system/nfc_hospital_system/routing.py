# backend/nfc_hospital_system/routing.py
from django.urls import re_path
from channels.routing import URLRouter

# WebSocket URL 패턴 (각 앱에서 정의할 예정)
websocket_urlpatterns = [
    # 관리자 대시보드 실시간 업데이트
    re_path(r'ws/admin/dashboard/$', None),  # admin_dashboard.consumers.DashboardConsumer
    
    # 환자 대기열 실시간 업데이트  
    re_path(r'ws/queue/(?P<queue_id>\w+)/$', None),  # queue.consumers.QueueConsumer
    
    # NFC 태그 실시간 모니터링
    re_path(r'ws/nfc/monitoring/$', None),  # nfc.consumers.NFCMonitoringConsumer
    
    # 알림 실시간 전송
    re_path(r'ws/notifications/(?P<user_id>\w+)/$', None),  # notifications.consumers.NotificationConsumer
]

# 나중에 각 앱의 consumers.py가 생성되면 import 추가
# from admin_dashboard.consumers import DashboardConsumer
# from queue.consumers import QueueConsumer
# from nfc.consumers import NFCMonitoringConsumer