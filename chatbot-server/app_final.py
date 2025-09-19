#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
챗봇 서버 최종 버전
- JWT 토큰 검증으로 사용자 인증
- Django API 연동으로 실시간 데이터 조회
- GPT의 추론 능력을 최대한 활용하는 프롬프트 엔지니어링
"""
import os
import sys
import json
import jwt
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
from utils.medical_safety_filter import medical_safety_filter

# Windows 콘솔 UTF-8 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# --- 설정 로드 ---
load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- OpenAI 클라이언트 설정 ---
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    print("⚠️ WARNING: OPENAI_API_KEY not found in .env file")
    client = None
else:
    client = OpenAI(api_key=OPENAI_API_KEY)
    print("✅ OpenAI client initialized")

# Django 설정
DJANGO_BASE_URL = os.getenv('DJANGO_API_URL', 'http://localhost:8000')
SECRET_KEY = os.getenv('SECRET_KEY')  # Django와 동일한 SECRET_KEY 사용

print("\n" + "="*60)
print("🚀 챗봇 서버 시작")
print(f"   Django API: {DJANGO_BASE_URL}")
print(f"   SECRET_KEY: {SECRET_KEY[:30]}..." if SECRET_KEY else "   SECRET_KEY: Not set")
print("="*60 + "\n")

# --- JWT 토큰 검증 함수 ---
def get_user_from_token(auth_header):
    """JWT 토큰에서 사용자 정보 추출"""
    if not auth_header:
        print("🔴 No Authorization header")
        return None
    
    if not auth_header.startswith('Bearer '):
        print(f"🔴 Invalid Authorization header format")
        return None
    
    try:
        token = auth_header.split(' ')[1]
        print(f"🔵 Token received (first 30 chars): {token[:30]}...")
        
        if not SECRET_KEY:
            print("❌ SECRET_KEY not configured in .env file")
            return None
        
        # Django와 동일한 키로 토큰 검증
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        print(f"✅ Token validated successfully")
        
        # 토큰 타입 확인
        if payload.get('token_type') != 'access':
            print(f"🔴 Invalid token type: {payload.get('token_type')}")
            return None
        
        user_info = {
            'user_id': payload.get('user_id'),
            'role': payload.get('role', 'patient'),
            'name': payload.get('name', '환자')
        }
        print(f"✅ User authenticated: {user_info['name']} (ID: {user_info['user_id']})")
        return user_info
        
    except jwt.ExpiredSignatureError:
        print("⏰ Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"❌ Invalid token: {e}")
        return None
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        return None

# --- Django API 호출 함수들 ---
def fetch_patient_context(user_id):
    """Django에서 환자 개인 정보 조회"""
    try:
        url = f"{DJANGO_BASE_URL}/api/v1/queue/internal/patient-context/{user_id}/"
        headers = {'X-Internal-Api-Key': 'internal-secret-key'}
        
        print(f"📡 Fetching patient context from Django...")
        response = requests.get(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Patient context received successfully")
            return data
        else:
            print(f"❌ Failed to fetch patient context: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"💥 Error fetching patient context: {e}")
        return None

def get_public_info_from_django():
    """Django에서 공개 가능한 병원 정보 조회"""
    try:
        url = f"{DJANGO_BASE_URL}/api/v1/queue/internal/public-queue-info/"
        
        print(f"🌐 Fetching public info from Django...")
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Public info received successfully")
            return data
        else:
            print(f"❌ Failed to fetch public info: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"💥 Error fetching public info: {e}")
        return None

# --- 건강 체크 엔드포인트 ---
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "success": True,
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "NFC Hospital Chatbot Server (Final)"
    })

# --- 메인 챗봇 API 엔드포인트 ---
@app.route('/api/chatbot/query', methods=['POST'])
def query_chatbot():
    """
    지능형 챗봇 API
    - 질문 의도를 자동으로 파악
    - 로그인 상태에 따라 적절한 응답 생성
    - GPT의 추론 능력 최대 활용
    """
    try:
        data = request.get_json()
        
        if not data or 'question' not in data:
            return jsonify({
                "success": False,
                "error": "question 필드가 필요합니다"
            }), 400
        
        question = data['question']
        print(f"\n{'='*60}")
        print(f"📝 Question: {question}")
        
        # 1. JWT 토큰 확인으로 로그인 상태 파악
        auth_header = request.headers.get('Authorization', '')
        user = get_user_from_token(auth_header)
        
        # 2. GPT에게 제공할 시스템 프롬프트 구성
        system_prompt = """당신은 HC_119 종합병원의 AI 안내원입니다. 친절하고 정확하게 답변해주세요.

[병원 기본 정보]
- 대표전화: 1588-0000
- 진료시간: 평일 08:30-17:30, 토요일 08:30-12:30
- 응급실: 24시간 운영
- 위치: 서울특별시 종로구 한이음로 119
- 진료과: 내과, 외과, 정형외과, 소아과, 영상의학과, 진단검사의학과
"""
        
        # 3. 공개 정보 추가 (모든 사용자에게 제공)
        public_info = get_public_info_from_django()
        if public_info:
            if public_info.get('exam_info'):
                system_prompt += f"\n[실시간 검사 정보]\n"
                for exam_name, info in public_info['exam_info'].items():
                    system_prompt += f"- {exam_name}: 대기 {info.get('current_waiting', 0)}명, "
                    system_prompt += f"예상 {info.get('estimated_wait', '알 수 없음')}분, "
                    system_prompt += f"준비사항: {info.get('preparation', '없음')}\n"
            
            if public_info.get('congestion_level'):
                system_prompt += f"\n현재 병원 혼잡도: {public_info['congestion_level']}\n"
        
        # 4. 로그인 사용자의 개인 정보 추가
        if user:
            patient_context = fetch_patient_context(user['user_id'])
            if patient_context:
                system_prompt += f"""
[환자 개인 정보] ⭐ 이 정보는 로그인한 환자 본인의 정보입니다
- 성함: {patient_context.get('userName', user.get('name', '환자'))}님
- 현재 상태: {patient_context.get('stateDescription', patient_context.get('patientState', '확인 중'))}
"""
                # 대기열 정보
                if patient_context.get('currentQueues'):
                    queues = patient_context['currentQueues']
                    if len(queues) > 0:
                        queue = queues[0]
                        system_prompt += f"- 대기번호: {queue.get('queue_number', '미정')}번\n"
                        system_prompt += f"- 예상 대기시간: {queue.get('estimated_wait_time', '알 수 없음')}분\n"
                        if queue.get('exam'):
                            system_prompt += f"- 검사: {queue['exam'].get('title', '검사')}\n"
                            system_prompt += f"- 위치: {queue['exam'].get('building', '본관')} "
                            system_prompt += f"{queue['exam'].get('floor', '')}층 {queue['exam'].get('room', '')}\n"
                else:
                    system_prompt += "- 현재 대기 중인 검사가 없습니다\n"
                
                # 오늘 예약 정보
                if patient_context.get('appointments'):
                    apts = patient_context['appointments']
                    system_prompt += f"- 오늘 예약: {len(apts)}건\n"
                    for apt in apts[:3]:  # 최대 3개만 표시
                        if apt.get('exam'):
                            system_prompt += f"  • {apt['exam'].get('title', '검사')} "
                            system_prompt += f"({apt.get('scheduled_at', '시간 미정')})\n"
        
        # 5. GPT에게 답변 규칙 제공
        system_prompt += """
[답변 규칙]
1. 환자 개인 정보가 필요한 질문(내 대기 순서, 내 예약 등):
   - [환자 개인 정보]가 있으면: 해당 정보를 바탕으로 구체적으로 답변
   - [환자 개인 정보]가 없으면: "로그인 후 확인하실 수 있습니다" 안내
   
2. 일반 정보 질문(검사 시간, 병원 위치 등):
   - 로그인 여부와 관계없이 친절하게 답변
   - [실시간 검사 정보]를 활용하여 현재 상황 안내

3. 답변 톤:
   - 친근하고 따뜻한 말투 사용
   - 의료 용어는 쉽게 풀어서 설명
   - 간결하면서도 필요한 정보는 빠짐없이 제공
"""
        
        print(f"🤖 User authenticated: {user is not None}")
        print(f"📋 Context provided: Patient={patient_context is not None if user else False}, Public={public_info is not None}")
        
        # 6. OpenAI API 호출
        if not client:
            # OpenAI API가 없을 때 fallback 응답
            if user:
                fallback = f"{user['name']}님, 현재 챗봇 서비스를 준비 중입니다. 원무과(1588-0000)로 문의해주세요."
            else:
                fallback = "챗봇 서비스를 준비 중입니다. 원무과(1588-0000)로 문의해주세요."
            
            return jsonify({
                "success": True,
                "data": {
                    "response": {
                        "content": fallback,
                        "type": "fallback"
                    },
                    "authenticated": user is not None
                }
            })
        
        # GPT 호출
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ]
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=300,
            temperature=0.7
        )
        
        answer = response.choices[0].message.content
        
        # 의료 안전 필터 적용
        safe_answer = medical_safety_filter(answer)
        
        print(f"✅ Response generated successfully")
        print(f"{'='*60}\n")
        
        return jsonify({
            "success": True,
            "data": {
                "response": {
                    "content": safe_answer,
                    "type": "ai"
                },
                "authenticated": user is not None,
                "userId": user['user_id'] if user else "guest"
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"💥 Error in query_chatbot: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            "success": False,
            "error": "챗봇 서비스에 일시적인 문제가 발생했습니다",
            "timestamp": datetime.now().isoformat()
        }), 500

# --- 서버 실행 ---
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)