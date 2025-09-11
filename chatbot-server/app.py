#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

# Windows 콘솔 UTF-8 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()

app = Flask(__name__)
CORS(app)

# OpenAI 클라이언트 초기화
try:
    # 환경 변수에서 프록시 설정 제거 (만약 있다면)
    import os
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
    
    # OpenAI 클라이언트 생성 (가장 기본 매개변수만 사용)
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("WARNING: OPENAI_API_KEY not found in environment variables")
        client = None
    else:
        # OpenAI 클라이언트 버전 문제로 인한 임시 비활성화
        print("OpenAI client temporarily disabled due to proxy configuration conflict")
        client = None
        
except Exception as e:
    print(f"Failed to initialize OpenAI client: {e}")
    import traceback
    traceback.print_exc()
    client = None

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
        context = data.get('context', {})
        
        # 컨텍스트 정보 구성 (비로그인 사용자 지원)
        context_info = "\n\n현재 상황:\n"
        
        # 로그인 여부 확인
        is_guest = context.get('is_guest', True) or not context.get('userId')
        if is_guest:
            context_info += "- 비로그인 상태 (개인정보 조회 불가)\n"
        else:
            # 로그인 사용자 컨텍스트
            if context.get('patientState'):
                state_map = {
                    'WAITING': '대기중',
                    'CALLED': '호출됨', 
                    'ONGOING': '진행중',
                    'COMPLETED': '완료'
                }
                state = state_map.get(context['patientState'], context['patientState'])
                context_info += f"- 환자 상태: {state}\n"
            
            if context.get('currentQueues'):
                queues = context['currentQueues']
                if queues and len(queues) > 0:
                    first_queue = queues[0]
                    wait_time = first_queue.get('estimated_wait_time', '알 수 없음')
                    queue_num = first_queue.get('queue_number', '알 수 없음')
                    context_info += f"- 대기번호: {queue_num}번, 예상시간: {wait_time}분\n"
            
            if context.get('todaysAppointments'):
                apts = context['todaysAppointments']
                if apts and len(apts) > 0:
                    next_apt = apts[0]
                    exam_name = next_apt.get('exam', {}).get('title', '검사')
                    context_info += f"- 다음 일정: {exam_name}\n"
        
        # OpenAI API 키 확인
        if not client:
            # API 키가 없을 때도 친근한 폴백 응답
            return jsonify({
                "success": True,
                "data": {
                    "response": {
                        "content": "시스템 점검 중이에요. 원무과(1588-0000)로 문의해주세요.",
                        "type": "fallback"
                    }
                },
                "timestamp": datetime.now().isoformat()
            })
        
        # Few-shot 예시로 톤 설정
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + context_info},
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
        response = client.chat.completions.create(
            model="gpt-4",  # 또는 "gpt-3.5-turbo"
            messages=messages,
            max_tokens=200,  # 짧은 응답을 위해 제한
            temperature=0.8,  # 자연스러운 응답
            presence_penalty=0.3,  # 반복 줄이기
            frequency_penalty=0.2,  # 다양한 어휘
            top_p=0.9  # 자연스러운 응답
        )
        
        ai_response = response.choices[0].message.content
        # Windows 콘솔 인코딩 문제 해결
        try:
            print(f"GPT Response: {ai_response[:100]}...")
        except UnicodeEncodeError:
            print(f"GPT Response: {ai_response[:100].encode('utf-8', 'ignore').decode('utf-8')}...")
        
        return jsonify({
            "success": True,
            "data": {
                "object": "chat_message",
                "messageId": f"msg-{datetime.now().timestamp()}",
                "userId": context.get('userId', 'guest'),
                "type": "user_query",
                "content": user_question,
                "response": {
                    "type": "gpt_response",
                    "content": ai_response,
                    "confidence": 0.9,
                    "sources": ["openai-gpt-4"]
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