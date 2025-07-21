# backend/nfc_hospital_system/settings/production.py
from .base import *

# 운영 환경 설정
DEBUG = False

# 운영 환경 허용 호스트
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')

# 운영용 데이터베이스 (MySQL)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT', default='3306'),
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            'charset': 'utf8mb4',
        },
        'CONN_MAX_AGE': 600,  # 연결 풀링
    }
}

# 운영용 CORS 설정 (엄격하게)
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = []

# 환경 변수에서 허용된 도메인 읽기
cors_origins = config('CORS_ALLOWED_ORIGINS', default='')
if cors_origins:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins.split(',')]

# 운영 환경 기본 도메인 추가
CORS_ALLOWED_ORIGINS.extend([
    "https://hospital.example.com",           # 실제 도메인으로 변경 필요
    "https://admin.hospital.example.com",     # 관리자 도메인
    "https://api.hospital.example.com",       # API 도메인
])

# CloudFront 또는 CDN 사용 시
if config('USE_CDN', default=False, cast=bool):
    cdn_domain = config('CDN_DOMAIN', default='')
    if cdn_domain:
        CORS_ALLOWED_ORIGINS.append(f"https://{cdn_domain}")

# 운영 환경 CORS 메서드 (필요한 것만)
CORS_ALLOW_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
]

# 운영 환경에서는 정규표현식 패턴 사용 안함 (보안상)
CORS_ALLOWED_ORIGIN_REGEXES = []

# CORS 프리플라이트 캐시 시간 (운영에서는 더 길게)
CORS_PREFLIGHT_MAX_AGE = 86400 * 7  # 7일

# 운영용 Redis 캐시
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            }
        }
    }
}

# Django Channels (운영용 - Redis)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [config('REDIS_URL')],
            "capacity": 1500,
            "expiry": 10,
        },
    },
}

# 운영용 보안 설정
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1년
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# 운영용 로깅 (파일 기반)
LOGGING['handlers']['file']['filename'] = '/var/log/django/nfc_hospital.log'
LOGGING['handlers']['error_file'] = {
    'level': 'ERROR',
    'class': 'logging.FileHandler',
    'filename': '/var/log/django/error.log',
    'formatter': 'verbose',
}
LOGGING['root']['handlers'] = ['file']
LOGGING['loggers']['django']['handlers'] = ['file', 'error_file']

# 운영용 이메일 설정
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL')

# 운영용 정적 파일 (S3 등 클라우드 스토리지)
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='')

if AWS_ACCESS_KEY_ID:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'

# AWS S3 정적 파일 (선택사항)
if config('USE_S3', default=False, cast=bool):
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='ap-northeast-2')
    
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'

# 보안 설정 (HTTPS 환경)
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# 운영용 JWT 설정 (보안 강화)
SIMPLE_JWT.update({
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),   # 1시간
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),   # 1일
    'SIGNING_KEY': config('JWT_SECRET_KEY'),
})

# 성능 최적화
DATA_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB

# API 문서 비활성화 (운영 환경)
SPECTACULAR_SETTINGS.update({
    'SERVE_INCLUDE_SCHEMA': False,
})

print("🔒 운영 환경으로 Django 서버가 시작됩니다!")