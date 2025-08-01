# backend/nfc_hospital_system/routing.py
from django.urls import re_path

# 일단 간단하게 직접 import
try:
    from p_queue.consumers import QueueConsumer
    print("✅ QueueConsumer import 성공")
except ImportError as e:
    print(f"❌ QueueConsumer import 실패: {e}")
    QueueConsumer = None

websocket_urlpatterns = [
    re_path(r'ws/queue/(?P<queue_id>[\w-]+)/$', QueueConsumer.as_asgi()),
]

# None 제거
websocket_urlpatterns = [url for url in websocket_urlpatterns if url is not None]
print(f"WebSocket URL patterns: {websocket_urlpatterns}")