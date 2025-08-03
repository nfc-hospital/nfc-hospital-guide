# backend/nfc_hospital_system/routing.py
from django.urls import re_path
from channels.routing import URLRouter

# Consumer imports
from p_queue.consumers import QueueConsumer
from admin_dashboard.consumers import DashboardConsumer, NFCMonitoringConsumer

# WebSocket URL 패턴 
websocket_urlpatterns = [
    # ✅ 환자 대기열 실시간 업데이트 (활성화!)
    re_path(r'ws/queue/(?P<queue_id>[\w-]+)/$', QueueConsumer.as_asgi()),
    
    # ✅ 관리자 대시보드 실시간 업데이트 (활성화!)
    re_path(r'ws/admin/dashboard/$', DashboardConsumer.as_asgi()),
    
    # ✅ NFC 태그 실시간 모니터링 (활성화!)
    re_path(r'ws/nfc/monitoring/$', NFCMonitoringConsumer.as_asgi()),
    
    # 알림 실시간 전송
    # re_path(r'ws/notifications/(?P<user_id>\w+)/$', None),  # 이건 나중에
]

# import 완료
# ✅ from p_queue.consumers import QueueConsumer  - 이미 위에서 import함
# from admin_dashboard.consumers import DashboardConsumer  # 아직 없음
# from nfc.consumers import NFCMonitoringConsumer  # 아직 없음