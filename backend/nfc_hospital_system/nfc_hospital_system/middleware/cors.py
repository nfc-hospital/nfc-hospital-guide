"""
커스텀 CORS 미들웨어 - django-cors-headers를 보완
"""
import logging
from django.http import JsonResponse
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from ..utils.cors_utils import log_cors_request, validate_cors_settings

logger = logging.getLogger('corsheaders')


class CustomCorsMiddleware(MiddlewareMixin):
    """
    django-cors-headers를 보완하는 커스텀 미들웨어
    - CORS 에러 디버깅
    - API별 세분화된 CORS 정책
    - 상세한 로깅
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # 시작 시 CORS 설정 검증
        errors = validate_cors_settings()
        if errors:
            for error in errors:
                logger.warning(f"CORS Configuration Warning: {error}")
    
    def process_request(self, request):
        """
        요청 처리 전 CORS 검증
        """
        origin = request.headers.get('Origin')
        
        # OPTIONS 요청에 대한 특별 처리
        if request.method == 'OPTIONS' and origin:
            # 공개 API 엔드포인트 확인
            public_endpoints = [
                '/api/auth/login/',
                '/api/auth/register/',
                '/api/health/',
                '/api/nfc/scan/',  # NFC 스캔은 공개
            ]
            
            is_public = any(request.path.startswith(endpoint) for endpoint in public_endpoints)
            
            if is_public:
                # 공개 API는 더 관대한 CORS 정책
                response = JsonResponse({'status': 'ok'})
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
                response['Access-Control-Allow-Headers'] = ', '.join(settings.CORS_ALLOW_HEADERS)
                response['Access-Control-Max-Age'] = str(settings.CORS_PREFLIGHT_MAX_AGE)
                
                if settings.CORS_ALLOW_CREDENTIALS:
                    response['Access-Control-Allow-Credentials'] = 'true'
                
                return response
        
        return None
    
    def process_response(self, request, response):
        """
        응답에 추가 CORS 헤더 설정
        """
        origin = request.headers.get('Origin')
        
        if origin:
            # CORS 요청 로깅
            allowed = response.has_header('Access-Control-Allow-Origin')
            log_cors_request(request, allowed)
            
            # 개발 환경에서 CORS 에러 시 상세 정보 제공
            if settings.DEBUG and not allowed and response.status_code == 403:
                # CORS 에러에 대한 상세 정보
                from ..utils.cors_utils import get_allowed_origins_for_display
                
                error_response = JsonResponse({
                    'error': 'CORS policy violation',
                    'origin': origin,
                    'allowed_origins': get_allowed_origins_for_display(),
                    'method': request.method,
                    'path': request.path,
                    'hint': 'Add this origin to CORS_ALLOWED_ORIGINS in settings'
                }, status=403)
                
                # 개발 환경에서는 에러 응답에도 CORS 헤더 추가
                error_response['Access-Control-Allow-Origin'] = origin
                error_response['Access-Control-Allow-Credentials'] = 'true'
                return error_response
            
            # WebSocket 연결을 위한 추가 헤더
            if request.path.startswith('/ws/'):
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Credentials'] = 'true'
        
        return response


class APIThrottleCorsMiddleware(MiddlewareMixin):
    """
    API 요청 제한과 CORS를 함께 처리하는 미들웨어
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.request_counts = {}  # 간단한 메모리 기반 카운터
    
    def process_request(self, request):
        """
        API 요청 제한 확인
        """
        if not request.path.startswith('/api/'):
            return None
        
        origin = request.headers.get('Origin', 'unknown')
        
        # 프리플라이트 요청은 제한하지 않음
        if request.method == 'OPTIONS':
            return None
        
        # 간단한 요청 제한 (실제로는 Redis 등 사용)
        key = f"{origin}:{request.META.get('REMOTE_ADDR')}"
        
        # 실제 운영에서는 django-ratelimit 등 사용 권장
        return None