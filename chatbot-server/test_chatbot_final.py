#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
챗봇 서버 최종 테스트 스크립트
- JWT 인증 테스트
- 개인화된 응답 vs 일반 응답 테스트
- 에러 처리 테스트
"""
import requests
import json
import jwt
from datetime import datetime, timedelta

# 서버 설정
CHATBOT_URL = "http://localhost:5000"
SECRET_KEY = "django-insecure-vM3kJ8nP2qL5xW7yR9tG4bN6hA1sD0fZ"

def create_test_token(user_id="test123", name="홍길동", role="patient"):
    """테스트용 JWT 토큰 생성"""
    payload = {
        'user_id': user_id,
        'name': name,
        'role': role,
        'token_type': 'access',
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def test_health_check():
    """건강 체크 엔드포인트 테스트"""
    print("\n" + "="*60)
    print("🏥 Testing health check endpoint...")
    
    try:
        response = requests.get(f"{CHATBOT_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_unauthenticated_query():
    """비로그인 사용자 질문 테스트"""
    print("\n" + "="*60)
    print("👤 Testing unauthenticated query...")
    
    questions = [
        "병원 진료시간이 어떻게 되나요?",
        "CT 검사는 얼마나 걸리나요?",
        "내 대기 순서는?",  # 로그인 필요한 질문
    ]
    
    for question in questions:
        print(f"\n📝 Question: {question}")
        try:
            response = requests.post(
                f"{CHATBOT_URL}/api/chatbot/query",
                json={"question": question},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success: {data.get('success')}")
                print(f"🔐 Authenticated: {data.get('data', {}).get('authenticated')}")
                print(f"💬 Response: {data.get('data', {}).get('response', {}).get('content', 'No content')[:200]}...")
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"💥 Exception: {e}")

def test_authenticated_query():
    """로그인 사용자 질문 테스트"""
    print("\n" + "="*60)
    print("🔐 Testing authenticated query...")
    
    # JWT 토큰 생성
    token = create_test_token(user_id="user123", name="김환자")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    questions = [
        "내 대기 순서는?",
        "오늘 예약 확인해줘",
        "다음 검사는 뭔가요?",
        "병원 진료시간이 어떻게 되나요?",  # 일반 질문도 테스트
    ]
    
    for question in questions:
        print(f"\n📝 Question: {question}")
        try:
            response = requests.post(
                f"{CHATBOT_URL}/api/chatbot/query",
                json={"question": question},
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success: {data.get('success')}")
                print(f"🔐 Authenticated: {data.get('data', {}).get('authenticated')}")
                print(f"👤 User ID: {data.get('data', {}).get('userId')}")
                print(f"💬 Response: {data.get('data', {}).get('response', {}).get('content', 'No content')[:200]}...")
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"💥 Exception: {e}")

def test_invalid_token():
    """잘못된 토큰 테스트"""
    print("\n" + "="*60)
    print("🚫 Testing invalid token...")
    
    # 잘못된 시크릿 키로 토큰 생성
    wrong_payload = {
        'user_id': 'hacker',
        'token_type': 'access',
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    wrong_token = jwt.encode(wrong_payload, "wrong-secret-key", algorithm='HS256')
    
    headers = {
        "Authorization": f"Bearer {wrong_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{CHATBOT_URL}/api/chatbot/query",
            json={"question": "내 대기 순서는?"},
            headers=headers
        )
        
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Authenticated (should be false): {data.get('data', {}).get('authenticated')}")
        print(f"Response: {data.get('data', {}).get('response', {}).get('content', '')[:100]}...")
        
    except Exception as e:
        print(f"💥 Exception: {e}")

def test_expired_token():
    """만료된 토큰 테스트"""
    print("\n" + "="*60)
    print("⏰ Testing expired token...")
    
    # 이미 만료된 토큰 생성
    expired_payload = {
        'user_id': 'user123',
        'token_type': 'access',
        'exp': datetime.utcnow() - timedelta(hours=1)  # 1시간 전 만료
    }
    expired_token = jwt.encode(expired_payload, SECRET_KEY, algorithm='HS256')
    
    headers = {
        "Authorization": f"Bearer {expired_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{CHATBOT_URL}/api/chatbot/query",
            json={"question": "내 대기 순서는?"},
            headers=headers
        )
        
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Authenticated (should be false): {data.get('data', {}).get('authenticated')}")
        print(f"Response indicates login needed: {'로그인' in data.get('data', {}).get('response', {}).get('content', '')}")
        
    except Exception as e:
        print(f"💥 Exception: {e}")

def main():
    """모든 테스트 실행"""
    print("\n" + "🚀 " + "="*58 + " 🚀")
    print("   챗봇 서버 최종 테스트 시작")
    print("🚀 " + "="*58 + " 🚀")
    
    # 1. 건강 체크
    if not test_health_check():
        print("\n❌ 서버가 실행 중이 아닙니다. 먼저 서버를 시작해주세요:")
        print("   cd chatbot-server && python app.py")
        return
    
    # 2. 비로그인 테스트
    test_unauthenticated_query()
    
    # 3. 로그인 테스트
    test_authenticated_query()
    
    # 4. 보안 테스트
    test_invalid_token()
    test_expired_token()
    
    print("\n" + "✅ " + "="*58 + " ✅")
    print("   모든 테스트 완료!")
    print("✅ " + "="*58 + " ✅")

if __name__ == "__main__":
    main()