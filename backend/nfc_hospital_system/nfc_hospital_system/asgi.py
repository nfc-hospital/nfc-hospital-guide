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
    
    print("✅ Channels import 성공")
    
    application = ProtocolTypeRouter({
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            URLRouter(routing.websocket_urlpatterns)
        ),
    })
    print("✅ ASGI application 설정 완료")
    
except ImportError as e:
    print(f"❌ Channels import 실패: {e}")
    # Channels 없이 기본 ASGI만 사용
    application = django_asgi_app