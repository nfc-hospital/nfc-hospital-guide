# backend/nfc_hospital_system/asgi.py
import os
import django
from django.core.asgi import get_asgi_application

# Django 설정 모듈 지정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')

# Django 설정 초기화 (Channels import 전에)
django.setup()
print("✅ Django setup completed")

# Django ASGI 앱 생성 (Channels import 전에)
django_asgi_app = get_asgi_application()
print("✅ Django ASGI app created")

# Channels 관련 import 및 설정
try:
    print("🔍 Starting Channels import...")
    from channels.routing import ProtocolTypeRouter, URLRouter
    print("✅ ProtocolTypeRouter imported")
    
    from channels.auth import AuthMiddlewareStack
    print("✅ AuthMiddlewareStack imported")
    
    print("🔍 Importing routing...")
    from . import routing
    print(f"✅ Routing imported, websocket patterns: {len(routing.websocket_urlpatterns)}")
    
    print("🔍 Creating ProtocolTypeRouter...")
    # ProtocolTypeRouter로 HTTP와 WebSocket 분리
    application = ProtocolTypeRouter({
        # HTTP 요청은 Django ASGI 앱으로
        "http": django_asgi_app,
        
        # WebSocket 요청은 기본 AuthMiddleware로 처리 (JWT는 임시 비활성화)
        "websocket": AuthMiddlewareStack(
            URLRouter(routing.websocket_urlpatterns)
        ),
    })
    
    print("✅ ASGI application with Channels configured successfully")
    print(f"🔍 Application type: {type(application)}")
    print(f"🔍 Available protocols: {list(application.application_mapping.keys())}")
    
except ImportError as e:
    print(f"❌ Channels import failed: {e}")
    import traceback
    traceback.print_exc()
    print("🔄 Falling back to Django ASGI only")
    
    # Channels 없이 기본 Django ASGI만 사용
    application = django_asgi_app

except Exception as e:
    print(f"❌ Error configuring ASGI application: {e}")
    import traceback
    traceback.print_exc()
    print("🔄 Falling back to Django ASGI only")
    
    # 오류 시 기본 Django ASGI 사용
    application = django_asgi_app