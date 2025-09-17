#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
import json
import jwt
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import openai  # OpenAI 라이브러리를 다른 방식으로 import
from utils.medical_safety_filter import medical_safety_filter, check_emergency_keywords, get_emergency_response

# Windows 콘솔 UTF-8 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()

app = Flask(__name__)
CORS(app)

# OpenAI 클라이언트 초기화
# 환경 변수에서 프록시 설정 제거 (만약 있다면)
for key in list(os.environ.keys()):
    if 'proxy' in key.lower() or 'proxies' in key.lower():
        print(f"Removing environment variable: {key}")
        os.environ.pop(key, None)

# 프록시 관련 HTTP 환경 변수도 제거
proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
for var in proxy_vars:
    if var in os.environ:
        print(f"Removing proxy variable: {var}")
        del os.environ[var]

# OpenAI API 키 설정
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    print("WARNING: OPENAI_API_KEY not found in environment variables")
    openai_available = False
else:
    # OpenAI API 키 설정 (v1.0+ 방식)
    try:
        openai.api_key = api_key
        openai_available = True
        print(f"✅ OpenAI API key configured successfully")
    except Exception as e:
        print(f"❌ Failed to configure OpenAI: {e}")
        openai_available = False

# Django와 동일한 JWT 설정
# Django의 기본 SECRET_KEY와 동일하게 설정
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-this-in-production')
DJANGO_API_URL = os.getenv('DJANGO_API_URL', 'http://localhost:8000')

# 디버깅용: 어떤 키를 사용하는지 출력
print("\n" + "="*60)
print("🔑 [챗봇 서버] JWT 키 설정 확인")
print(f"   SECRET_KEY 사용: {SECRET_KEY[:30]}..." if SECRET_KEY else "   SECRET_KEY: None")
print(f"   Django의 SECRET_KEY와 동일해야 합니다!")
print("="*60 + "\n")

def get_user_from_token(auth_header):
    """JWT 토큰에서 사용자 정보 추출"""
    if not auth_header:
        print("🔴 No Authorization header")
        return None
    
    if not auth_header.startswith('Bearer '):
        print(f"🔴 Invalid Authorization header format: {auth_header[:20]}")
        return None
    
    try:
        token = auth_header.split(' ')[1]
        print(f"🔵 Token received (first 20 chars): {token[:20]}...")
        
        # 토큰 디코딩 시도
        try:
            # 먼저 서명 검증 없이 디코딩 시도 (디버깅용)
            unverified = jwt.decode(token, options={"verify_signature": False})
            print(f"🟡 Token payload (unverified): user_id={unverified.get('user_id')}, token_type={unverified.get('token_type')}")
        except Exception as debug_e:
            print(f"🔴 Failed to decode token structure: {debug_e}")
        
        # Django와 동일한 SECRET_KEY로 검증
        try:
            print(f"🔑 Decoding with SECRET_KEY: {SECRET_KEY[:20]}...")
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            print(f"✅ Successfully decoded JWT token")
            
            # 토큰 타입 확인
            if payload.get('token_type') != 'access':
                print(f"🔴 Invalid token type: {payload.get('token_type')}")
                return None
            
            user_info = {
                'user_id': payload.get('user_id'),
                'role': payload.get('role', 'patient'),
                'name': payload.get('name')
            }
            print(f"✅ Token validated for user: {user_info['name']} (ID: {user_info['user_id']})")
            return user_info
            
        except jwt.ExpiredSignatureError:
            print("⏰ Token expired")
            return None
        except jwt.InvalidTokenError as e:
            print(f"❌ JWT validation failed: {e}")
            return None
            
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        return None

def fetch_patient_context(user_id):
    """Django API에서 환자 컨텍스트 조회"""
    try:
        # 내부 API 호출 (서버 간 통신이므로 특별한 인증 토큰 사용)
        internal_api_key = os.getenv('INTERNAL_API_KEY', 'internal-secret-key')
        url = f"{DJANGO_API_URL}/api/v1/queue/internal/patient-context/{user_id}/"
        
        # 🚀 상세한 디버깅 로그
        print("\n" + "="*60)
        print(f"🚀 [챗봇→Django] API 호출 시작")
        print(f"   URL: {url}")
        print(f"   User ID: {user_id}")
        print(f"   API Key: {internal_api_key[:10]}..." if internal_api_key else "   API Key: None")
        print("="*60)
        
        response = requests.get(
            url,
            headers={'X-Internal-Api-Key': internal_api_key},
            timeout=5
        )
        
        print(f"📡 Django 응답 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Django에서 환자 데이터 수신 성공")
            print(f"   - Patient state: {data.get('patient_state', 'N/A')}")
            print(f"   - User name: {data.get('userName', data.get('user', {}).get('name', 'N/A'))}")
            print(f"   - Queues count: {len(data.get('currentQueues', data.get('current_queues', [])))}")
            print(f"   - Appointments count: {len(data.get('appointments', data.get('todays_appointments', [])))}")
            print("="*60 + "\n")
            return data
        else:
            print(f"❌ Django API 호출 실패 (HTTP {response.status_code})")
            try:
                error_data = response.json()
                print(f"   오류 응답 내용: {json.dumps(error_data, ensure_ascii=False, indent=2)}")
            except:
                print(f"   응답 텍스트 (처음 500자): {response.text[:500]}")
            print("="*60 + "\n")
            return None
            
    except requests.exceptions.Timeout:
        print(f"⏰ Django API 타임아웃 (5초 초과)")
        return None
    except requests.exceptions.ConnectionError:
        print(f"🔌 Django 서버 연결 실패 - 서버가 실행 중인지 확인하세요")
        return None
    except Exception as e:
        print(f"💥 예상치 못한 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def build_personalized_prompt(user_info, patient_context):
    """로그인 사용자용 개인화 프롬프트 생성"""
    prompt = """당신은 HC_119 병원의 AI 안내원입니다. 간결하고 친절하게 답변하세요.\n\n"""
    
    # 환자 정보 추가
    if user_info and user_info.get('name'):
        prompt += f"환자: {user_info['name']}님\n"
    
    if patient_context:
        # 현재 상태
        if patient_context.get('patient_state'):
            state_map = {
                'UNREGISTERED': '병원 도착 전',
                'ARRIVED': '병원 도착',
                'REGISTERED': '접수 완료', 
                'WAITING': '대기중',
                'CALLED': '호출됨',
                'IN_PROGRESS': '진료중',
                'COMPLETED': '완료',
                'PAYMENT': '수납 대기',
                'FINISHED': '모든 절차 완료'
            }
            state = state_map.get(patient_context['patient_state'], patient_context['patient_state'])
            prompt += f"현재 상태: {state}\n"
        
        # 대기 정보
        if patient_context.get('current_queues') and len(patient_context['current_queues']) > 0:
            queue = patient_context['current_queues'][0]
            prompt += f"대기번호: {queue.get('queue_number')}번\n"
            prompt += f"예상 대기시간: {queue.get('estimated_wait_time', '알 수 없음')}분\n"
            if queue.get('exam'):
                prompt += f"검사: {queue['exam'].get('title')}\n"
                prompt += f"위치: {queue['exam'].get('building', '본관')} {queue['exam'].get('floor', '')}층 {queue['exam'].get('room', '')}\n"
        
        # 오늘 일정
        if patient_context.get('todays_appointments'):
            apt_count = len(patient_context['todays_appointments'])
            prompt += f"오늘 예약: {apt_count}건\n"
            # 다음 예약 정보
            next_apt = next((apt for apt in patient_context['todays_appointments'] 
                            if apt.get('status') in ['scheduled', 'pending']), None)
            if next_apt:
                prompt += f"다음 검사: {next_apt.get('exam', {}).get('title', '검사')} "
                prompt += f"({next_apt.get('scheduled_at', '')})\n"
    
    prompt += "\n환자의 현재 상황을 고려하여 맞춤형 답변을 제공하세요."
    prompt += "\n대기 순서나 시간 질문 시 위 정보를 활용하여 구체적으로 답변하세요."
    return prompt

def build_guest_prompt():
    """비로그인 사용자용 일반 프롬프트 생성"""
    return """당신은 HC_119 병원의 AI 안내원입니다. 간결하고 친절하게 답변하세요.

주의사항:
- 병원 일반 정보만 제공 가능합니다
- 개인 정보가 필요한 질문에는 "로그인하시면 확인 가능합니다"로 안내
- 대기시간, 검사결과 등은 로그인 후 확인 가능함을 안내

병원 정보:
- 대표전화: 1588-0000
- 진료시간: 평일 8:30-17:30
- 응급실: 24시간 운영
- 주차: 30분 무료, 진료시 50% 할인"""

SYSTEM_PROMPT = """
당신은 서울대학교병원 안내 직원입니다. 간결하고 친절하게 답변하세요.

핵심 원칙:
1. 짧고 명확하게 (3-4문장 이내 권장)
2. 개인정보가 필요한 질문은 상황에 따라:
   - 로그인 사용자: 제공된 컨텍스트 활용
   - 비로그인: "로그인하시면 확인 가능해요"
   - 불가능한 정보: "원무과(1588-0000)로 문의해주세요"
3. 친근한 말투 유지 ("~예요", "~네요")

좋은 예시:
Q: "대기시간 얼마나 걸려요?"
A(로그인): "지금 3명 대기중이라 약 15분 정도예요."
A(비로그인): "로그인하시면 실시간 대기현황 확인 가능해요! 평균적으로 평일 오전은 20-30분 정도 걸려요."
"""

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "success": True,
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "NFC Hospital Chatbot Server"
    })

def classify_question_intent(question):
    """
    질문의 의도를 분류 (개인 정보 vs 일반 정보)
    """
    # 개인 정보 키워드
    personal_keywords = ['내', '제', '저의', '저한테', '저', 'my', '내꺼', '제꺼', '나의', '나']
    
    # 일반 정보 키워드
    general_keywords = ['CT', 'MRI', 'X-ray', '검사', '시간', '위치', '준비', '금식', 
                       '병원', '주차', '비용', '요금', '운영', '시간', '휴진']
    
    question_lower = question.lower()
    
    # 명확히 개인 질문인 경우
    for keyword in personal_keywords:
        if keyword in question:
            return 'personal'
    
    # 명확히 일반 질문인 경우
    for keyword in general_keywords:
        if keyword in question_lower:
            return 'general'
    
    # 디폴트: 일반 질문으로 처리
    return 'general'


def get_public_info_from_django():
    """
    Django에서 공개 가능한 병원 일반 정보 조회
    """
    try:
        url = f"{DJANGO_API_URL}/api/v1/queue/internal/public-queue-info/"
        print(f"🌐 공개 정보 API 호출: {url}")
        
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ 공개 정보 수신 성공")
            return data
        else:
            print(f"❌ 공개 정보 API 실패: {response.status_code}")
            return None
    except Exception as e:
        print(f"💥 공개 정보 API 오류: {e}")
        return None


@app.route('/api/chatbot/query', methods=['POST'])
def chatbot_query():
    try:
        data = request.get_json()
        
        if not data or 'question' not in data:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "question 필드가 필요합니다"
                },
                "timestamp": datetime.now().isoformat()
            }), 400
            
        user_question = data['question']
        
        # 긴급 상황 체크
        if check_emergency_keywords(user_question):
            emergency_resp = get_emergency_response()
            return jsonify({
                "success": True,
                "data": {
                    "type": "emergency",
                    "content": emergency_resp['response'],
                    "disclaimer": emergency_resp['disclaimer'],
                    "priority": emergency_resp['priority'],
                    "authenticated": False,
                    "response": {
                        "type": "emergency",
                        "content": emergency_resp['response'],
                        "disclaimer": emergency_resp['disclaimer']
                    }
                },
                "timestamp": datetime.now().isoformat()
            })
        
        # 질문 의도 분류
        intent = classify_question_intent(user_question)
        print(f"🎯 질문 의도: {intent} - \"{user_question[:50]}...\"")
        
        # JWT 토큰에서 사용자 정보 추출
        auth_header = request.headers.get('Authorization', '')
        user = get_user_from_token(auth_header)
        
        # 의도와 로그인 상태에 따른 처리
        if intent == 'personal':
            # 개인 질문 처리
            if user:
                print(f"👤 로그인 사용자의 개인 질문: {user.get('name', 'Unknown')}")
                patient_context = fetch_patient_context(user['user_id'])
                system_prompt = build_personalized_prompt(user, patient_context)
                
                if not patient_context:
                    system_prompt += "\n현재 진행 중인 검사가 없습니다. 예약 확인을 위해 원무과에 문의해주세요."
            else:
                # 개인 질문인데 로그인 안 함 - OpenAI 사용 안 하고 바로 안내
                print("🔒 비로그인 사용자의 개인 질문")
                return jsonify({
                    "success": True,
                    "data": {
                        "response": {
                            "content": "대기 순서와 같은 개인 정보는 로그인 후 확인하실 수 있습니다. 원무과(1588-0000)로 문의하시거나 로그인해주세요.",
                            "type": "login_required"
                        }
                    },
                    "timestamp": datetime.now().isoformat()
                })
        else:
            # 일반 질문 처리 - 로그인 여부와 관계없이
            print("🌐 일반 정보 질문 처리")
            public_info = get_public_info_from_django()
            
            if public_info:
                system_prompt = f"""당신은 HC_119 병원의 AI 안내원입니다.

병원 기본 정보:
{json.dumps(public_info.get('hospital_info', {}), ensure_ascii=False, indent=2)}

현재 검사별 정보:
{json.dumps(public_info.get('exam_info', {}), ensure_ascii=False, indent=2)}

현재 혼잡도: {public_info.get('congestion_level', '정보 없음')}
전체 대기 환자: {public_info.get('total_waiting_patients', 0)}명

위 정보를 바탕으로 간결하고 친절하게 답변해주세요.
개인 정보는 절대 묻거나 요구하지 마세요."""
            else:
                # Django API가 실패해도 기본 정보는 제공
                system_prompt = build_guest_prompt()
        
        # OpenAI API 사용 가능 여부 확인
        if not openai_available:
            # API 키가 없을 때 fallback 응답 사용
            print("WARNING: Using fallback response due to OpenAI unavailable")
            
            # 질문에 따라 기본 응답 생성
            question_lower = user_question.lower()
            if '대기' in question_lower or '순서' in question_lower:
                if user:
                    # 로그인한 사용자에게 더 적절한 응답
                    fallback_message = "현재 대기 중인 검사가 없습니다. 오늘 예약된 검사가 있으시다면 해당 검사실로 가셔서 접수하시면 됩니다."
                else:
                    fallback_message = "로그인하시면 실시간 대기현황을 확인할 수 있어요."
            elif '병원' in question_lower or '시간' in question_lower:
                fallback_message = "진료시간: 평일 8:30-17:30, 토요일 8:30-12:30\n대표전화: 1588-0000"
            elif '주차' in question_lower:
                fallback_message = "지하 1-3층 주차장, 첫 30분 무료, 진료시 50% 할인"
            else:
                fallback_message = "무엇을 도와드릴까요? 대기시간, 병원 위치, 진료시간 등을 물어보세요."
            
            return jsonify({
                "success": True,
                "data": {
                    "response": {
                        "content": fallback_message,
                        "type": "fallback"
                    }
                },
                "timestamp": datetime.now().isoformat()
            })
        
        # Few-shot 예시로 톤 설정
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "혈액검사 금식해야 하나요?"},
            {"role": "assistant", "content": "네, 8-12시간 금식 필요해요. 물은 괜찮지만 커피는 안 돼요. 당뇨약 드시면 미리 말씀해주세요!"},
            {"role": "user", "content": "내 대기시간 얼마나 남았어?"},
            {"role": "assistant", "content": "로그인하시면 실시간 대기현황 확인해드릴 수 있어요. 일반적으로 채혈실은 오전 20-30분, 오후 10분 정도 걸려요."},
            {"role": "user", "content": "MRI 검사 무서워요"},
            {"role": "assistant", "content": "걱정 마세요! 아프지 않아요. 소리가 시끄럽지만 헤드폰 드릴게요. 20-30분이면 끝나요. 😊"},
            {"role": "user", "content": user_question}
        ]
        
        # 질문 로깅 (Windows 인코딩 안전)
        try:
            print(f"User question: {user_question}")
        except UnicodeEncodeError:
            print(f"User question: {user_question.encode('utf-8', 'ignore').decode('utf-8')}")
        
        # GPT 호출 (간결하고 친근한 응답)
        try:
            # OpenAI v1.0+ API 사용
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",  # 더 빠르고 비용 효율적
                messages=messages,
                max_tokens=200,  # 짧은 응답을 위해 제한
                temperature=0.8,  # 자연스러운 응답
                presence_penalty=0.3,  # 반복 줄이기
                frequency_penalty=0.2,  # 다양한 어휘
                top_p=0.9  # 자연스러운 응답
            )
            
            ai_response = response.choices[0].message.content
            
        except Exception as gpt_error:
            print(f"GPT API call error: {gpt_error}")
            # GPT 호출 실패 시 기본 응답
            if user:
                ai_response = "죄송합니다. 잠시 후 다시 시도해주세요. 급한 문의는 원무과(1588-0000)로 연락주세요."
            else:
                ai_response = "로그인하시면 더 정확한 정보를 제공해드릴 수 있습니다."
        # Windows 콘솔 인코딩 문제 해결
        try:
            print(f"GPT Response: {ai_response[:100]}...")
        except UnicodeEncodeError:
            print(f"GPT Response: {ai_response[:100].encode('utf-8', 'ignore').decode('utf-8')}...")
        
        # 의료 안전 및 개인정보 필터링 적용
        filtered_result = medical_safety_filter(ai_response, user_question)
        final_response = filtered_result['response']
        
        # 필터링 로그
        if filtered_result.get('filtered'):
            print("Personal information was filtered from the response")
        
        return jsonify({
            "success": True,
            "data": {
                "object": "chat_message",
                "messageId": f"msg-{datetime.now().timestamp()}",
                "userId": user['user_id'] if user else 'guest',
                "authenticated": user is not None,
                "type": "user_query",
                "content": user_question,
                "response": {
                    "type": "gpt_response",
                    "content": final_response,
                    "confidence": 0.9,
                    "sources": ["openai-gpt-4"],
                    "context_source": "realtime" if user else "general",
                    "disclaimer": filtered_result.get('disclaimer')
                }
            },
            "message": "응답 완료",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        
        # 에러 시에도 간결한 폴백 응답
        fallback_responses = {
            "default": "연결이 불안정해요. 원무과(1588-0000)로 문의해주세요.",
            "api_key": "시스템 점검 중입니다.",
            "rate_limit": "잠시 후 다시 시도해주세요."
        }
        
        error_type = "default"
        if "api_key" in str(e).lower():
            error_type = "api_key"
        elif "rate" in str(e).lower():
            error_type = "rate_limit"
            
        return jsonify({
            "success": True,  # 사용자에게는 성공으로 보이게
            "data": {
                "response": {
                    "type": "fallback",
                    "content": fallback_responses[error_type]
                }
            },
            "timestamp": datetime.now().isoformat()
        })

@app.route('/api/chatbot/faq', methods=['GET'])
def get_faq():
    """자주 묻는 질문 목록 반환"""
    faq_list = [
        {
            "id": "faq-001",
            "question": "X-ray 검사는 얼마나 걸리나요?",
            "answer": "흉부 X-ray는 약 5-10분, 전신 X-ray는 15-20분 정도 소요됩니다.",
            "category": "검사시간"
        },
        {
            "id": "faq-002", 
            "question": "CT 검사 전에 준비해야 할 것이 있나요?",
            "answer": "검사 4-6시간 전부터 금식하시고, 금속 액세서리는 모두 제거해주세요.",
            "category": "검사준비"
        },
        {
            "id": "faq-003",
            "question": "MRI 검사 시 주의사항은 무엇인가요?",
            "answer": "체내 금속 임플란트나 심박동기가 있으시면 미리 알려주시고, 검사복으로 갈아입으셔야 합니다.",
            "category": "검사준비"
        },
        {
            "id": "faq-004",
            "question": "혈액검사는 공복이어야 하나요?",
            "answer": "일반적으로 12시간 공복 상태로 오시면 됩니다. 물은 조금 드셔도 괜찮습니다.",
            "category": "검사준비"
        }
    ]
    
    return jsonify({
        "success": True,
        "data": {
            "items": faq_list,
            "totalCount": len(faq_list)
        },
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/chatbot/suggestions', methods=['GET'])
def get_suggestions():
    """현재 상황 기반 추천 질문"""
    suggestions = [
        "검사실 위치가 어디인가요?",
        "대기 시간은 얼마나 되나요?",
        "검사 전 준비사항을 알려주세요",
        "검사 결과는 언제 나오나요?",
        "주차장은 어디에 있나요?"
    ]
    
    return jsonify({
        "success": True,
        "data": suggestions,
        "timestamp": datetime.now().isoformat()
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": {
            "code": "NOT_FOUND",
            "message": "요청하신 리소스를 찾을 수 없습니다"
        },
        "timestamp": datetime.now().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": {
            "code": "INTERNAL_ERROR", 
            "message": "서버 내부 오류가 발생했습니다"
        },
        "timestamp": datetime.now().isoformat()
    }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    print(f"NFC Hospital Chatbot Server starting on port {port}")
    print(f"Environment: {'Development' if debug_mode else 'Production'}")
    
    # API 키 상태 확인
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        print(f"OpenAI API Key: {api_key[:8]}...{api_key[-4:]}")
    else:
        print("WARNING: OpenAI API Key not found!")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)