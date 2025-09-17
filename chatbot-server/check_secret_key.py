#!/usr/bin/env python
"""챗봇 서버의 SECRET_KEY 확인 스크립트"""
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

print("=" * 50)
print("챗봇 서버 SECRET_KEY 정보:")
print("=" * 50)

# 모든 관련 키 확인
secret_key = os.getenv('SECRET_KEY')
jwt_secret_key = os.getenv('JWT_SECRET_KEY')
django_api_url = os.getenv('DJANGO_API_URL')

print(f"SECRET_KEY 존재: {'Yes' if secret_key else 'No'}")
if secret_key:
    print(f"  → 값 (처음 20자): {secret_key[:20]}...")
    print(f"  → 전체 길이: {len(secret_key)}")

print(f"\nJWT_SECRET_KEY 존재: {'Yes' if jwt_secret_key else 'No'}")
if jwt_secret_key:
    print(f"  → 값 (처음 20자): {jwt_secret_key[:20]}...")
    print(f"  → 전체 길이: {len(jwt_secret_key)}")

print(f"\nDJANGO_API_URL: {django_api_url}")
print("=" * 50)

print("\n💡 챗봇 서버는 JWT 토큰 검증 시:")
print("   1. JWT_SECRET_KEY를 먼저 시도")
print("   2. 실패하면 SECRET_KEY를 시도")
print("\n⚠️  Django의 SIMPLE_JWT.SIGNING_KEY와 일치해야 합니다!")