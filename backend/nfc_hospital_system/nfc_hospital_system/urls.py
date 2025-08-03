"""
URL configuration for nfc_hospital_system project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# backend/nfc_hospital_system/urls.py
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .utils import APIResponse
from .views import ReactAppView

# API 문서화
def api_health_check(request):
    """기본 헬스체크 엔드포인트"""
    return APIResponse.success(
        data={
            'status': 'healthy',
            'version': '1.0.0',
            'environment': settings.DEBUG and 'development' or 'production'
        },
        message="NFC Hospital System API is running"
    )

urlpatterns = [
    # Django 관리자
    path('admin/', admin.site.urls),
    
    # API 문서화 (개발 환경에서만)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # 헬스체크
    path('health/', api_health_check, name='health-check'),
    
    # API v1 엔드포인트들 (API 명세서 기준)
    path('api/v1/auth/', include('authentication.urls')),      # 인증
    path('api/v1/nfc/', include('nfc.urls')),                  # NFC 태그
    # path('api/v1/appointments/', include('appointments.urls')), # 예약/진료
    path('api/v1/', include('appointments.urls')),
    path('api/v1/queue/', include('p_queue.urls')),              # 대기열 
    path('api/v1/admin/', include('admin_dashboard.urls')),    # 관리자
    
    # Phase 2 확장 기능
    # path('api/v1/chatbot/', include('chatbot.urls')),         # AI 챗봇
    # path('api/v1/navigation/', include('navigation.urls')),   # 경로 안내
    # path('api/v1/ai/', include('ai_models.urls')),            # AI 모델
    path('api/v1/analytics/', include('analytics.urls')),        # 분석 (활성화됨)
    
    # Phase 3 완성 기능 (나중에 활성화)
    # path('api/v1/integration/', include('integrations.urls')), # 외부 연동
    # path('api/v1/feedback/', include('feedback.urls')),        # 피드백 
    # path('api/v1/notifications/', include('notifications.urls')), # 알림
    # path('api/v1/hospital/', include('hospital.urls')),        # 병원 정보
    # path('api/v1/users/', include('users.urls')),              # 사용자
    # path('api/v1/monitoring/', include('monitoring.urls')),    # 모니터링
]

# 개발 환경에서 정적/미디어 파일 서빙
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    # Django Debug Toolbar (개발용)
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns

# 404 에러 처리
handler404 = 'nfc_hospital_system.views.custom_404'
handler500 = 'nfc_hospital_system.views.custom_500'

# React App 서빙 (모든 다른 경로는 React Router가 처리)
# API와 admin 경로를 제외한 모든 요청을 React 앱으로 전달
# 이것은 urlpatterns의 맨 마지막에 위치해야 함
urlpatterns += [
    re_path(r'^(?!api|admin|static|media|__debug__).*$', ReactAppView.as_view(), name='react-app'),
]
