# backend/nfc_hospital_system/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

# Django 설정 로드
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')

# Django ASGI 애플리케이션 초기화
django_asgi_app = get_asgi_application()

# WebSocket 라우팅 (나중에 추가)
from . import routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                routing.websocket_urlpatterns
            )
        )
    ),
})