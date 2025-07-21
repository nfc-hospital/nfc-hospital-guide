"""
CORS 관련 유틸리티 함수들
"""
import logging
from typing import List, Optional
from django.conf import settings
from urllib.parse import urlparse

logger = logging.getLogger('corsheaders')


def is_cors_enabled_for_url(url: str) -> bool:
    """
    특정 URL에 대해 CORS가 활성화되어 있는지 확인
    """
    if settings.CORS_ALLOW_ALL_ORIGINS:
        return True
    
    parsed_url = urlparse(url)
    origin = f"{parsed_url.scheme}://{parsed_url.netloc}"
    
    # 허용된 출처 목록 확인
    if origin in settings.CORS_ALLOWED_ORIGINS:
        return True
    
    # 정규표현식 패턴 확인
    import re
    for pattern in settings.CORS_ALLOWED_ORIGIN_REGEXES:
        if re.match(pattern, origin):
            return True
    
    return False


def get_cors_headers(origin: Optional[str], method: str = 'GET') -> dict:
    """
    주어진 출처와 메서드에 대한 CORS 헤더 생성
    """
    headers = {}
    
    if not origin:
        return headers
    
    # 출처가 허용되는지 확인
    if is_cors_enabled_for_url(origin):
        headers['Access-Control-Allow-Origin'] = origin
        
        # 자격 증명 허용
        if settings.CORS_ALLOW_CREDENTIALS:
            headers['Access-Control-Allow-Credentials'] = 'true'
        
        # 프리플라이트 요청인 경우
        if method == 'OPTIONS':
            headers['Access-Control-Allow-Methods'] = ', '.join(settings.CORS_ALLOW_METHODS)
            headers['Access-Control-Allow-Headers'] = ', '.join(settings.CORS_ALLOW_HEADERS)
            headers['Access-Control-Max-Age'] = str(settings.CORS_PREFLIGHT_MAX_AGE)
        
        # 노출할 헤더
        if settings.CORS_EXPOSE_HEADERS:
            headers['Access-Control-Expose-Headers'] = ', '.join(settings.CORS_EXPOSE_HEADERS)
    
    return headers


def log_cors_request(request, allowed: bool):
    """
    CORS 요청 로깅
    """
    origin = request.headers.get('Origin', 'No origin')
    method = request.method
    path = request.path
    
    if allowed:
        logger.debug(f"CORS allowed: {method} {path} from {origin}")
    else:
        logger.warning(f"CORS blocked: {method} {path} from {origin}")


def get_allowed_origins_for_display() -> List[str]:
    """
    현재 허용된 모든 출처 목록 반환 (디버깅용)
    """
    origins = []
    
    if settings.CORS_ALLOW_ALL_ORIGINS:
        origins.append("* (All origins allowed)")
    else:
        origins.extend(settings.CORS_ALLOWED_ORIGINS)
        
        if settings.CORS_ALLOWED_ORIGIN_REGEXES:
            origins.append("--- Regex patterns ---")
            origins.extend(settings.CORS_ALLOWED_ORIGIN_REGEXES)
    
    return origins


def validate_cors_settings():
    """
    CORS 설정 유효성 검사
    """
    errors = []
    
    # CORS_ALLOW_ALL_ORIGINS와 CORS_ALLOWED_ORIGINS가 동시에 설정된 경우
    if settings.CORS_ALLOW_ALL_ORIGINS and settings.CORS_ALLOWED_ORIGINS:
        errors.append(
            "CORS_ALLOW_ALL_ORIGINS is True but CORS_ALLOWED_ORIGINS is also set. "
            "CORS_ALLOWED_ORIGINS will be ignored."
        )
    
    # CORS_ALLOW_CREDENTIALS가 True이고 CORS_ALLOW_ALL_ORIGINS도 True인 경우
    if settings.CORS_ALLOW_CREDENTIALS and settings.CORS_ALLOW_ALL_ORIGINS:
        errors.append(
            "CORS_ALLOW_CREDENTIALS is True with CORS_ALLOW_ALL_ORIGINS. "
            "This is a security risk in production!"
        )
    
    # 허용된 메서드가 비어있는 경우
    if not settings.CORS_ALLOW_METHODS:
        errors.append("CORS_ALLOW_METHODS is empty. No methods will be allowed.")
    
    return errors