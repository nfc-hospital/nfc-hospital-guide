# backend/nfc_hospital_system/settings/__init__.py
import os
from decouple import config

# 환경 변수에 따라 설정 파일 선택
ENVIRONMENT = config('DJANGO_ENVIRONMENT', default='development')

if ENVIRONMENT == 'production':
    from .production import *
elif ENVIRONMENT == 'development':
    from .development import *
else:
    from .development import *  # 기본값은 개발 환경

print(f"Django Environment: {ENVIRONMENT}")
print(f"Database: {DATABASES['default']['ENGINE']}")
print(f"Debug Mode: {DEBUG}")