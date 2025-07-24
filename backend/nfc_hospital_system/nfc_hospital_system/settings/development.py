# backend/nfc_hospital_system/settings/development.py

from .base import *
from datetime import timedelta
import debug_toolbar

# 개발 환경 전용 설정
DEBUG = True

# 커스텀 User 모델 설정
AUTH_USER_MODEL = 'authentication.User'

print(f"DB_HOST: {config('DB_HOST', default='localhost')}")
print(f"DB_NAME: {config('DB_NAME', default='nfc_hospital_db')}")
print(f"DB_USER: {config('DB_USER', default='root')}")

# 개발용 데이터베이스
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('DB_NAME', default='nfc_hospital_db'),
        'USER': config('DB_USER', default='root'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'sql_mode': 'STRICT_TRANS_TABLES',
            'connect_timeout': 20,
            'read_timeout': 30,
            'write_timeout': 30,
            'autocommit': True,
        },
        'CONN_MAX_AGE': 0,  # 연결 풀링 비활성화
    }
}

PASSWORD_HASHERS = [
    'authentication.hashers.ScryptPasswordHasher', # <-- 새로 정의한 해셔를 가장 먼저 등록
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    # Django 4.0+를 사용 중이고, 기본 Scrypt 해셔를 사용하지 않고
    # 커스텀 파라미터로 직접 구현한 경우 위의 라인만 유지합니다.
    # 만약 Django의 기본 Scrypt 해셔도 함께 사용하고 싶다면 아래 라인을 추가할 수 있습니다.
    # 'django.contrib.auth.hashers.ScryptPasswordHasher',
]

# 개발 서버용 CORS 설정 (더 관대하게)
CORS_ALLOW_ALL_ORIGINS = False  # 개발에서도 특정 도메인만 허용하는 것이 좋음
CORS_ALLOW_CREDENTIALS = True

# 개발 환경에서 허용할 출처들
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",      # React Admin Dashboard
    "http://127.0.0.1:3000",
    "http://localhost:5173",      # React PWA (Vite)
    "http://127.0.0.1:5173",
    "http://localhost:5000",      # Flask Chatbot Server
    "http://127.0.0.1:5000",
    "http://localhost:8000",      # Django 자체
    "http://127.0.0.1:8000",
]

# 개발 환경에서 추가 CORS 설정
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# WebSocket용 추가 설정
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]

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

# 개발용 미들웨어 추가
MIDDLEWARE = [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
] + MIDDLEWARE

# Django Debug Toolbar (개발용)
INSTALLED_APPS += ['debug_toolbar']
INTERNAL_IPS = ['127.0.0.1', 'localhost']

# 개발용 정적 파일 서빙
STATICFILES_DIRS = [
    BASE_DIR / 'static',
    BASE_DIR / 'dev_static',
]

# React 개발 서버 프록시 설정 (개발 환경)
# React 빌드 파일도 서빙 가능하도록 설정
if REACT_BUILD_DIR.exists():
    STATICFILES_DIRS.append(REACT_BUILD_DIR / 'assets')
    
# 개발 환경에서 React index.html 서빙
TEMPLATES[0]['DIRS'].insert(0, REACT_BUILD_DIR)

# 개발용 JWT 설정 (더 긴 토큰 수명)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
}

# 개발용 REST Framework 설정
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny', # 개발용 권한 완화
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'nfc_hospital_system.utils.custom_exception_handler',
}

# API 문서 설정 (개발용)
SPECTACULAR_SETTINGS = {
    'SERVE_INCLUDE_SCHEMA': True,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
    },
    'COMPONENT_SPLIT_REQUEST': True,
}

print("개발 환경으로 Django 서버가 시작됩니다!")