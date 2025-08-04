# backend/nfc_hospital_system/asgi.py
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')

# Django 초기화
django_asgi_app = get_asgi_application()

try:
    from channels.routing import ProtocolTypeRouter, URLRouter
    from channels.auth import AuthMiddlewareStack
    from . import routing
    
    print("Channels import success")
    
    # 임시로 JWT 미들웨어 비활성화하고 기본 인증만 사용
    application = ProtocolTypeRouter({
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            URLRouter(routing.websocket_urlpatterns)
        ),
    })
    print("ASGI application setup complete")
    
except ImportError as e:
    print(f"Channels import failed: {e}")
    # Channels 없이 기본 ASGI만 사용
    application = django_asgi_app