#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HC_119 병원 AI 챗봇 서버
- 단순하고 명확한 로직
- JWT 인증으로 로그인 여부 확인
- Django API에서 환자 정보 조회
- GPT API로 자연스러운 대화형 응답
"""
import os
import sys
import jwt
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

# 환경 변수 로드
load_dotenv()

# Flask 앱 설정
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# OpenAI 클라이언트
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Django 설정
DJANGO_BASE_URL = os.getenv('DJANGO_BASE_URL', 'http://localhost:8000')
DJANGO_SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')

print("\n" + "="*70)
print("HC_119 Hospital AI Chatbot Server Starting...")
print(f"   Django API: {DJANGO_BASE_URL}")
print(f"   OpenAI API: {'OK' if client else 'NOT SET'}")
print("="*70 + "\n")


# ============================================================================
# JWT 토큰 검증
# ============================================================================
def verify_jwt_token(auth_header):
    """JWT 토큰 검증하여 사용자 정보 반환"""
    if not auth_header or not auth_header.startswith('Bearer '):
        return None

    try:
        token = auth_header.split(' ')[1]

        if not DJANGO_SECRET_KEY:
            print("[AUTH] DJANGO_SECRET_KEY not configured")
            return None

        payload = jwt.decode(token, DJANGO_SECRET_KEY, algorithms=['HS256'])

        if payload.get('token_type') != 'access':
            return None

        user_info = {
            'user_id': payload.get('user_id'),
            'name': payload.get('name', '환자'),
            'role': payload.get('role', 'patient')
        }

        print(f"[AUTH] JWT verified: {user_info['name']} (ID: {user_info['user_id']})")
        return user_info

    except jwt.ExpiredSignatureError:
        print("[AUTH] JWT token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"[AUTH] JWT validation failed: {e}")
        return None
    except Exception as e:
        print(f"[AUTH] JWT error: {e}")
        return None


# ============================================================================
# Django API 호출
# ============================================================================
def fetch_patient_info(user_id):
    """Django에서 환자 개인 정보 가져오기"""
    try:
        url = f"{DJANGO_BASE_URL}/api/v1/queue/internal/patient-context/{user_id}/"
        headers = {'X-Internal-Api-Key': 'internal-secret-key'}

        print(f"[API] Fetching patient info: {url}")
        response = requests.get(url, headers=headers, timeout=5)

        if response.status_code == 200:
            data = response.json()
            print(f"[API] Patient info received successfully")
            return data
        else:
            print(f"[API] Django API error: {response.status_code}")
            return None

    except Exception as e:
        print(f"[API] Failed to fetch patient info: {e}")
        return None


def fetch_public_info():
    """Django에서 공개 병원 정보 가져오기"""
    try:
        url = f"{DJANGO_BASE_URL}/api/v1/queue/internal/public-queue-info/"

        print(f"[API] Fetching public info: {url}")
        response = requests.get(url, timeout=5)

        if response.status_code == 200:
            data = response.json()
            print(f"[API] Public info received successfully")
            return data
        else:
            print(f"[API] Public info error: {response.status_code}")
            return None

    except Exception as e:
        print(f"[API] Failed to fetch public info: {e}")
        return None


# ============================================================================
# GPT 프롬프트 생성
# ============================================================================
def build_system_prompt(user_info=None, patient_data=None, public_data=None):
    """상황에 맞는 시스템 프롬프트 생성"""

    prompt = """당신은 HC_119 종합병원의 친절한 AI 안내원 '차비서'입니다.

[병원 기본 정보]
- 병원명: HC_119 종합병원
- 대표전화: 1588-0000
- 응급실: 02-0000-0119 (24시간)
- 주소: 서울특별시 종로구 한이음로 119
- 진료시간: 평일 08:30-17:30, 토요일 08:30-12:30
- 진료과: 내과, 외과, 정형외과, 소아과, 영상의학과, 진단검사의학과
- 편의시설: 카페(본관 1층), 편의점(지하1층 24시간), 약국(본관 1층)
- 주차: 지하 1-3층, 최초 30분 무료, 10분당 500원, 진료 확인 시 50% 할인
"""

    # 공개 정보 (모든 사용자에게 제공)
    if public_data:
        prompt += "\n[실시간 병원 현황]\n"

        if public_data.get('exam_info'):
            prompt += "주요 검사별 대기 현황:\n"
            for exam_name, info in public_data['exam_info'].items():
                prompt += f"- {exam_name}: 대기 {info.get('current_waiting', 0)}명, "
                prompt += f"예상 {int(info.get('estimated_wait', 0))}분\n"

        if public_data.get('congestion_level'):
            prompt += f"현재 병원 혼잡도: {public_data['congestion_level']}\n"

    # 로그인 사용자 개인 정보
    if user_info and patient_data:
        prompt += f"""

[환자 개인 정보] ⭐ {user_info['name']}님의 실시간 정보
- 현재 상태: {patient_data.get('stateDescription', patient_data.get('patientState', '확인 중'))}
"""

        # 대기열 정보
        current_queues = patient_data.get('currentQueues', [])
        if current_queues:
            queue = current_queues[0]
            prompt += f"- 대기번호: {queue.get('queue_number', '미정')}번\n"
            prompt += f"- 예상 대기시간: 약 {queue.get('estimated_wait_time', 0)}분\n"

            exam = queue.get('exam', {})
            if exam:
                prompt += f"- 검사명: {exam.get('title', '검사')}\n"
                location = f"{exam.get('building', '본관')} {exam.get('floor', '')}층"
                if exam.get('room'):
                    location += f" {exam['room']}"
                prompt += f"- 위치: {location}\n"
        else:
            prompt += "- 현재 대기 중인 검사가 없습니다\n"

        # 오늘 예약 정보
        appointments = patient_data.get('appointments', [])
        if appointments:
            prompt += f"- 오늘 예약: 총 {len(appointments)}건\n"
            for apt in appointments[:3]:
                exam = apt.get('exam', {})
                scheduled = apt.get('scheduled_at', '시간 미정')
                prompt += f"  • {exam.get('title', '검사')} ({scheduled})\n"

    # 답변 규칙
    prompt += """

[답변 규칙]
1. **개인 정보 질문 처리**
   - "내 대기 순서", "내 예약", "내 일정" 등 개인 정보가 필요한 질문:
     * [환자 개인 정보]가 있으면 → 그 정보를 바탕으로 구체적으로 답변
     * [환자 개인 정보]가 없으면 → "로그인하시면 확인하실 수 있어요" 자연스럽게 안내

2. **일반 정보 질문 처리**
   - 병원 위치, 전화번호, 진료시간, 주차, 편의시설 등:
     * 로그인 여부와 상관없이 [병원 기본 정보]를 바탕으로 친절하게 답변
     * 검사별 대기시간 질문 → [실시간 병원 현황] 활용

3. **답변 스타일**
   - 친근하고 따뜻한 말투 (반말 금지, 존댓말 사용)
   - 의료 용어는 쉽게 풀어서 설명
   - 간결하지만 필요한 정보는 빠짐없이 제공
   - 이모지는 적절히 사용 (😊 💊 🏥 등)

4. **절대 금지 사항**
   - "먼저 로그인해주세요"라고 강요하지 마세요
   - 일반 질문에 로그인을 요구하지 마세요
   - 개발 중이라는 말 금지
"""

    return prompt


# ============================================================================
# 챗봇 API 엔드포인트
# ============================================================================
@app.route('/health', methods=['GET'])
def health_check():
    """헬스 체크"""
    return jsonify({
        "success": True,
        "status": "healthy",
        "service": "HC_119 Chatbot Server",
        "timestamp": datetime.now().isoformat()
    })


@app.route('/api/chatbot/query', methods=['POST'])
def chatbot_query():
    """
    챗봇 질의응답 API

    Request:
        - question: 질문 (필수)
        - Authorization: Bearer {JWT} (선택, 로그인 시)

    Response:
        - answer: GPT 응답
        - authenticated: 로그인 여부
    """
    try:
        # 1. 요청 데이터 검증
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({
                "success": False,
                "error": "question 필드가 필요합니다"
            }), 400

        question = data['question'].strip()
        if not question:
            return jsonify({
                "success": False,
                "error": "질문을 입력해주세요"
            }), 400

        print(f"\n{'='*70}")
        print(f"[QUERY] Question: {question}")

        # 2. JWT 토큰 검증 (로그인 여부 확인)
        auth_header = request.headers.get('Authorization', '')
        user_info = verify_jwt_token(auth_header)

        # 3. Django API에서 정보 가져오기
        patient_data = None
        if user_info:
            patient_data = fetch_patient_info(user_info['user_id'])

        public_data = fetch_public_info()

        # 4. GPT 프롬프트 생성
        system_prompt = build_system_prompt(user_info, patient_data, public_data)

        print(f"[CONTEXT] Authenticated: {user_info is not None}")
        print(f"[CONTEXT] Patient data: {patient_data is not None}, Public data: {public_data is not None}")

        # 5. OpenAI API 호출
        if not client:
            # OpenAI 미설정 시 fallback
            fallback_msg = "죄송합니다. 현재 챗봇 서비스를 준비 중입니다. 원무과(1588-0000)로 문의해주세요."
            return jsonify({
                "success": True,
                "answer": fallback_msg,
                "authenticated": user_info is not None
            })

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ]

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=400,
            temperature=0.7
        )

        answer = response.choices[0].message.content

        # 6. 의료 안전 필터 (위험한 조언 방지)
        dangerous_keywords = ['약을 중단', '병원에 가지 마', '의사가 필요 없', '자가 치료하세요']
        if any(keyword in answer for keyword in dangerous_keywords):
            answer = "죄송합니다. 의료 관련 상담은 전문 의료진과 직접 상의해주세요. 원무과(1588-0000)로 연락 부탁드립니다."

        print(f"[GPT] Response generated successfully")
        print(f"{'='*70}\n")

        return jsonify({
            "success": True,
            "answer": answer,
            "authenticated": user_info is not None,
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        print(f"[ERROR] Chatbot API error: {e}")
        import traceback
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": "챗봇 서비스에 일시적인 문제가 발생했습니다",
            "timestamp": datetime.now().isoformat()
        }), 500


# ============================================================================
# 서버 실행
# ============================================================================
if __name__ == '__main__':
    if not OPENAI_API_KEY:
        print("[WARNING] OPENAI_API_KEY not set in .env")

    if not DJANGO_SECRET_KEY:
        print("[WARNING] DJANGO_SECRET_KEY not set in .env")

    port = int(os.getenv('PORT', 5000))
    print(f"[SERVER] Starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
