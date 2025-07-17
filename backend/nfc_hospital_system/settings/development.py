# backend/nfc_hospital_system/settings/development.py
from .base import *

# 개발 환경 전용 설정
DEBUG = True

# 개발용 데이터베이스 (SQLite로 간단하게 시작)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# 개발 서버용 CORS 설정 (더 관대하게)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# 개발용 캐시 (로컬 메모리)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Django Channels (개발용 - 메모리 기반)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}

# 이메일 백엔드 (개발용 - 콘솔 출력)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# 개발용 로깅 (더 상세하게)
LOGGING['loggers']['django']['level'] = 'DEBUG'
LOGGING['loggers']['authentication']['level'] = 'DEBUG'
LOGGING['loggers']['nfc']['level'] = 'DEBUG'

# 개발용 미들웨어 추가
MIDDLEWARE += [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

# Django Debug Toolbar (개발용)
if DEBUG:
    try:
        import debug_toolbar
        INSTALLED_APPS += ['debug_toolbar']
        INTERNAL_IPS = ['127.0.0.1', 'localhost']
    except ImportError:
        pass

# 개발용 정적 파일 서빙
STATICFILES_DIRS += [
    BASE_DIR / 'dev_static',
]

# 개발용 JWT 설정 (더 긴 토큰 수명)
SIMPLE_JWT.update({
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),  # 개발용으로 24시간
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),  # 30일
})

# 개발용 보안 설정 완화
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0

# API 문서 설정 (개발용)
SPECTACULAR_SETTINGS.update({
    'SERVE_INCLUDE_SCHEMA': True,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
    },
    'COMPONENT_SPLIT_REQUEST': True,
})

print("🚀 개발 환경으로 Django 서버가 시작됩니다!")