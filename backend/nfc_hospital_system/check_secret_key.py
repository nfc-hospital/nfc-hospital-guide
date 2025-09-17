#!/usr/bin/env python
"""Django의 실제 SECRET_KEY 확인 스크립트"""
import os
import sys
import django

# Django 설정 로드
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')
django.setup()

from django.conf import settings

print("=" * 50)
print("Django SECRET_KEY 정보:")
print("=" * 50)
print(f"SECRET_KEY (처음 20자): {settings.SECRET_KEY[:20]}...")
print(f"SECRET_KEY 전체 길이: {len(settings.SECRET_KEY)}")
print(f"환경: {os.environ.get('DJANGO_ENVIRONMENT', 'default')}")
print("=" * 50)

# JWT 설정 확인
if hasattr(settings, 'SIMPLE_JWT'):
    jwt_settings = settings.SIMPLE_JWT
    signing_key = jwt_settings.get('SIGNING_KEY', settings.SECRET_KEY)
    print("JWT 설정:")
    print(f"SIGNING_KEY (처음 20자): {signing_key[:20]}...")
    print(f"ALGORITHM: {jwt_settings.get('ALGORITHM', 'HS256')}")
    print("=" * 50)