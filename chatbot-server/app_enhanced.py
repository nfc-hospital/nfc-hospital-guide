#!/usr/bin/env python3
"""
향상된 NFC 병원 챗봇 서버
- 컨텍스트 인식
- 의도 분류
- 의료 안전 필터
- 구조화된 응답
"""
import os
import json
import hashlib
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_caching import Cache
from dotenv import load_dotenv
from openai import OpenAI
import logging

# 커스텀 서비스 임포트
from services.context_manager import ContextManager
from services.intent_classifier import IntentClassifier, IntentCategory
from utils.medical_safety_filter import (
    medical_safety_filter, 
    check_emergency_keywords,
    get_emergency_response
)

# 환경 설정
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask 앱 초기화
app = Flask(__name__)
CORS(app)

# 캐시 설정 (Redis 또는 SimpleCache)
cache_config = {
    'CACHE_TYPE': 'simple',  # 운영환경에서는 'redis'로 변경
    'CACHE_DEFAULT_TIMEOUT': 300  # 5분
}
app.config.from_mapping(cache_config)
cache = Cache(app)

# OpenAI 클라이언트 초기화
try:
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    logger.info("OpenAI client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")
    client = None

# 서비스 초기화
context_manager = ContextManager(
    django_api_url=os.getenv('DJANGO_API_URL', 'http://localhost:8000')
)
intent_classifier = IntentClassifier()

# 향상된 시스템 프롬프트
ENHANCED_SYSTEM_PROMPT = """
당신은 서울대학교병원에서 일하는 따뜻하고 친근한 안내 직원입니다.
병원에 오신 모든 분들이 편안하게 느끼도록 도와드리는 것이 당신의 역할입니다.

🌟 대화 스타일:
- "안녕하세요~", "네~", "그렇군요!" 같은 자연스러운 대화체 사용
- 공감하는 표현 사용: "걱정되시죠", "힘드시겠어요", "이해해요"
- 격식체보다는 친근한 존댓말 사용
- 어르신들께는 더 천천히, 쉽게 설명
- 적절한 이모지로 따뜻함 표현 😊

💬 답변 방식:
- "~입니다" 보다 "~예요", "~네요" 사용
- 한 번에 너무 많은 정보 주지 않기
- 어려운 의학 용어는 쉬운 말로 풀어서 설명
- "혹시 더 궁금한 점 있으신가요?" 같은 배려 표현 추가

⚠️ 주의사항:
- 진단이나 치료법은 절대 말하지 않기 (의사 선생님께 맡기기)
- 하지만 일반적인 건강 상식은 친절하게 설명 OK
- 모르는 건 "제가 정확히 몰라서 확인해드릴게요" 라고 솔직하게

예시:
나쁜 답변: "MRI 검사는 자기공명영상 검사로 8시간 금식이 필요합니다."
좋은 답변: "MRI 검사 받으시는군요! 검사 전에 8시간 정도 금식하셔야 해요. 물은 조금씩 드셔도 괜찮아요~ 😊"

현재 상황:
"""

@app.route('/health', methods=['GET'])
def health_check():
    """헬스체크 엔드포인트"""
    return jsonify({
        "success": True,
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Enhanced NFC Hospital Chatbot",
        "version": "2.0.0"
    })

@app.route('/api/chatbot/query', methods=['POST'])
def chatbot_query():
    """메인 챗봇 쿼리 처리"""
    try:
        data = request.get_json()
        
        if not data or 'question' not in data:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "question 필드가 필요합니다"
                }
            }), 400
            
        user_question = data['question']
        context_data = data.get('context', {})
        user_id = context_data.get('userId')
        auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        # 1. 응급 상황 체크
        if check_emergency_keywords(user_question):
            emergency_resp = get_emergency_response()
            return jsonify({
                "success": True,
                "data": {
                    "type": "emergency",
                    "content": emergency_resp['response'],
                    "disclaimer": emergency_resp['disclaimer'],
                    "priority": emergency_resp['priority'],
                    "actions": [
                        {"type": "call", "label": "119 신고", "value": "119"},
                        {"type": "location", "label": "응급실 위치", "value": "본관 1층"}
                    ]
                }
            })
        
        # 2. 의도 분류
        intent, confidence, urgency = intent_classifier.classify(user_question)
        entities = intent_classifier.extract_entities(user_question, intent)
        
        logger.info(f"Intent: {intent.value}, Confidence: {confidence:.2f}, Urgency: {urgency}")
        
        # 3. 컨텍스트 조회 (비로그인 사용자도 지원)
        if user_id and auth_token:
            patient_context = context_manager.get_patient_context(user_id, auth_token)
        else:
            # 비로그인 사용자용 기본 컨텍스트
            patient_context = context_manager.get_guest_context()
            
        prompt_context = context_manager.build_prompt_context(patient_context)
        
        # 4. 캐시 체크 (FAQ 및 일반 질문)
        cache_key = None
        if intent in [IntentCategory.HOSPITAL_INFO, IntentCategory.FACILITY, IntentCategory.PARKING]:
            cache_key = f"chatbot:{intent.value}:{hashlib.md5(user_question.encode()).hexdigest()}"
            cached_response = cache.get(cache_key)
            if cached_response:
                logger.info("Cache hit for question")
                return jsonify(cached_response)
        
        # 5. 응답 생성
        response = generate_response(
            question=user_question,
            intent=intent,
            confidence=confidence,
            entities=entities,
            patient_context=patient_context,
            prompt_context=prompt_context
        )
        
        # 6. 의료 안전 필터 적용
        filtered_response = medical_safety_filter(
            response['content'], 
            user_question
        )
        
        if filtered_response['blocked']:
            response['content'] = filtered_response['response']
            
        response['disclaimer'] = filtered_response['disclaimer']
        
        # 7. 응답 구조화
        final_response = {
            "success": True,
            "data": {
                "messageId": f"msg-{datetime.now().timestamp()}",
                "type": intent.value,
                "urgency": urgency,
                "content": response['content'],
                "disclaimer": response.get('disclaimer'),
                "confidence": confidence,
                "actions": response.get('actions', []),
                "suggestions": context_manager.get_state_based_suggestions(
                    patient_context.get('patient_state', 'UNREGISTERED')
                ),
                "metadata": {
                    "intent": intent.value,
                    "entities": entities,
                    "cached": False
                }
            },
            "timestamp": datetime.now().isoformat()
        }
        
        # 8. 캐시 저장
        if cache_key and intent != IntentCategory.QUEUE_STATUS:
            cache.set(cache_key, final_response, timeout=600)  # 10분 캐시
            
        return jsonify(final_response)
        
    except Exception as e:
        logger.error(f"Error in chatbot_query: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "챗봇 처리 중 오류가 발생했습니다."
            }
        }), 500

def generate_response(question, intent, confidence, entities, patient_context, prompt_context):
    """응답 생성 로직 - GPT를 최우선으로 활용"""
    
    # 구조화된 응답 기본값
    response = {
        'content': '',
        'actions': []
    }
    
    # 응급 상황만 구조화된 응답 사용 (안전 우선)
    if intent == IntentCategory.EMERGENCY:
        return generate_emergency_structured_response()
    
    # GPT 사용 가능하면 무조건 GPT 우선!
    if client:
        # 실시간 데이터가 필요한 경우 컨텍스트 추가
        if intent in [IntentCategory.QUEUE_STATUS, IntentCategory.WAIT_TIME] and not patient_context.get('is_guest'):
            # 실시간 데이터를 컨텍스트에 포함
            queue_info = get_queue_context_for_gpt(patient_context)
            enhanced_prompt = prompt_context + f"\n\n현재 대기 정보:\n{queue_info}"
            response = generate_gpt_response(question, enhanced_prompt)
            
        elif intent == IntentCategory.SCHEDULE and not patient_context.get('is_guest'):
            # 일정 정보를 컨텍스트에 포함
            schedule_info = get_schedule_context_for_gpt(patient_context)
            enhanced_prompt = prompt_context + f"\n\n오늘 일정:\n{schedule_info}"
            response = generate_gpt_response(question, enhanced_prompt)
            
        else:
            # 그 외 모든 질문은 GPT가 자유롭게 답변
            response = generate_gpt_response(question, prompt_context)
        
        # GPT 응답에 구조화된 액션 추가
        if intent == IntentCategory.LOCATION:
            response['actions'].append({
                'type': 'map', 
                'label': '지도로 보기 🗺️', 
                'value': '/map'
            })
        elif intent == IntentCategory.PARKING:
            response['actions'].append({
                'type': 'info',
                'label': '주차 요금 계산기',
                'value': '/parking-calculator'
            })
            
    else:
        # GPT 사용 불가시에만 구조화된 응답 사용 (폴백)
        if intent == IntentCategory.QUEUE_STATUS:
            response = generate_queue_response(patient_context)
        elif intent == IntentCategory.WAIT_TIME:
            response = generate_wait_time_response(patient_context)
        elif intent == IntentCategory.LOCATION:
            response = generate_location_response(entities, patient_context)
        elif intent == IntentCategory.FACILITY:
            response = generate_facility_response(entities)
        elif intent == IntentCategory.PARKING:
            response = generate_parking_response()
        elif intent == IntentCategory.HOSPITAL_INFO:
            response = generate_hospital_info_response()
        else:
            # 기본 친근한 응답
            response['content'] = "음... 정확한 답변을 드리기 어려운데요, 1층 안내데스크에서 직접 여쭤보시는 게 가장 정확할 것 같아요! 😊"
    
    return response

def get_queue_context_for_gpt(context):
    """GPT용 대기열 컨텍스트 생성"""
    queues = context.get('current_queues', [])
    if not queues:
        return "현재 대기 중인 검사가 없습니다."
    
    info = []
    for q in queues:
        info.append(f"- {q.get('exam_name')}: 대기번호 {q.get('queue_number')}번, 예상 {q.get('estimated_wait_time')}분")
    return "\n".join(info)

def get_schedule_context_for_gpt(context):
    """GPT용 일정 컨텍스트 생성"""
    appointments = context.get('appointments', [])
    if not appointments:
        return "오늘 예약된 일정이 없습니다."
    
    info = []
    for apt in appointments:
        info.append(f"- {apt.get('exam_name')}: {apt.get('scheduled_time')}, {apt.get('location')}")
    return "\n".join(info)

def generate_emergency_structured_response():
    """응급 상황 구조화된 응답"""
    return {
        'content': """
🚨 응급 상황이신가요?!

즉시 조치하세요:
1. 119에 전화하거나
2. 병원 응급실로 바로 오세요!

📍 응급실: 본관 1층
📞 응급실 직통: 02-0000-0119

지금 바로 도움을 받으세요!
""",
        'actions': [
            {'type': 'emergency_call', 'label': '119 신고', 'value': 'tel:119'},
            {'type': 'call', 'label': '응급실 전화', 'value': 'tel:02-0000-0119'}
        ]
    }

def generate_queue_response(context):
    """대기열 상태 응답 생성"""
    queues = context.get('current_queues', [])
    
    if not queues:
        return {
            'content': '아직 대기 중인 검사가 없으시네요! 😊\n\n오늘 예약된 검사가 있으신지 확인해보시겠어요?',
            'actions': [
                {'type': 'link', 'label': '오늘 일정 확인하기', 'value': '/schedule'}
            ]
        }
    
    queue = queues[0]  # 첫 번째 대기열
    wait_time = queue.get('estimated_wait_time', 15)
    people_ahead = max(0, queue.get('queue_number', 1) - 1)
    
    if queue.get('state') == 'called':
        content = f"""
🔔 호출되셨어요! 

{queue.get('exam_name', '검사')}실로 들어가시면 됩니다~
📍 위치: {queue.get('location', '2층 검사실')}

준비되셨나요? 화이팅! 💪
"""
    else:
        content = f"""
조금만 기다려주세요~ 😊

📋 {queue.get('exam_name', '검사')} 대기 중이시네요
🎫 대기번호: {queue.get('queue_number', 'N/A')}번
👥 앞에 {people_ahead}분 계세요
⏰ 예상 시간: {wait_time}분 정도 걸릴 것 같아요

{"커피 한잔 하시면서 기다리셔도 좋을 것 같네요~ ☕" if wait_time > 30 else "곧 차례가 올 거예요!"}
"""
    
    return {'content': content, 'actions': []}

def generate_wait_time_response(context):
    """대기 시간 응답 생성"""
    queues = context.get('current_queues', [])
    
    if not queues:
        return {'content': '음... 현재 대기 중인 검사가 없으신 것 같네요? 🤔\n\n혹시 오늘 검사 예약이 있으신가요?', 'actions': []}
    
    total_wait = sum(q.get('estimated_wait_time', 0) for q in queues)
    
    if len(queues) == 1:
        q = queues[0]
        wait = q.get('estimated_wait_time', 0)
        content = f"""
{q.get('exam_name')} 검사 대기시간을 알려드릴게요~ 😊

⏰ 예상 대기시간: 약 {wait}분이에요

{"금방 끝날 것 같네요!" if wait < 15 else "조금 기다리셔야 할 것 같아요. 1층 카페에서 차 한잔 어떠세요? ☕" if wait < 30 else "시간이 좀 걸릴 것 같네요. 병원 내 편의시설을 이용하시는 것도 좋을 것 같아요~"}
"""
    else:
        content = f"""
여러 검사가 예정되어 있으시네요! 전체 시간을 알려드릴게요~ 📋

⏰ 전체 예상 시간: 약 {total_wait}분

검사별 대기시간:
"""
        for q in queues:
            content += f"• {q.get('exam_name')}: 약 {q.get('estimated_wait_time', 0)}분\n"
        content += "\n힘드시겠지만 조금만 힘내세요! 화이팅! 💪"
    
    return {'content': content, 'actions': []}

def generate_location_response(entities, context):
    """위치 안내 응답 생성"""
    floor = entities.get('floor')
    building = entities.get('building', '본관')
    
    # 현재 예약된 검사실 위치
    appointments = context.get('appointments', [])
    if appointments:
        apt = appointments[0]
        location = apt.get('location', '정보 없음')
        exam_name = apt.get('exam_name', '검사')
        content = f"""
{exam_name} 검사실 위치를 안내해드릴게요! 🗺️

📍 {location}에 있어요~

가는 방법:
1️⃣ 지금 계신 곳에서 중앙 엘리베이터를 찾아주세요
2️⃣ 엘리베이터 타고 해당 층으로 이동하세요
3️⃣ 엘리베이터에서 내리시면 안내 표지판이 있어요!

혹시 못 찾으시겠으면 근처 직원분께 물어보셔도 되고,
1층 안내데스크에서도 자세히 알려드려요~ 😊
"""
    else:
        content = f"""
{building} {floor}층으로 가시는군요! 

🚶 가는 방법 알려드릴게요:
중앙 홀에서 엘리베이터를 타시면 돼요~
{floor}층 버튼 누르시고 올라가시면 됩니다!

엘리베이터가 어디 있는지 모르시겠다면,
아무 직원분께나 물어보세요. 다들 친절하게 알려드릴 거예요~ 😊
"""
    
    return {
        'content': content,
        'actions': [
            {'type': 'map', 'label': '지도로 확인하기 🗺️', 'value': f'/map/{building}/{floor}'}
        ]
    }

def generate_preparation_response(context):
    """검사 준비사항 응답"""
    appointments = context.get('appointments', [])
    
    if not appointments:
        return {'content': '오늘 예정된 검사가 없습니다.', 'actions': []}
    
    content = "검사 준비사항:\n"
    for apt in appointments:
        exam_name = apt.get('exam_name', '검사')
        content += f"\n📋 {exam_name}\n"
        
        # 검사별 준비사항 (실제로는 DB에서 조회)
        if '혈액' in exam_name or '채혈' in exam_name:
            content += "• 8시간 이상 금식 필요\n• 물은 소량 섭취 가능\n"
        elif 'CT' in exam_name or 'MRI' in exam_name:
            content += "• 금속 물품 제거\n• 조영제 사용 가능성 있음\n"
        elif '초음파' in exam_name:
            content += "• 검사 부위에 따라 금식 필요\n• 방광 초음파는 소변 참기\n"
        else:
            content += "• 특별한 준비사항 없음\n"
    
    return {'content': content, 'actions': []}

def generate_schedule_response(context):
    """일정 조회 응답"""
    appointments = context.get('appointments', [])
    
    if not appointments:
        return {'content': '오늘 예약된 일정이 없습니다.', 'actions': []}
    
    content = f"오늘의 진료 일정 ({len(appointments)}건):\n"
    for i, apt in enumerate(appointments, 1):
        status_emoji = {
            'completed': '✅',
            'ongoing': '🔄',
            'waiting': '⏳',
            'scheduled': '📅'
        }.get(apt.get('status', 'scheduled'), '📅')
        
        content += f"""
{status_emoji} {i}. {apt.get('exam_name', '검사')}
   • 시간: {apt.get('scheduled_time', '시간 미정')}
   • 장소: {apt.get('location', '위치 미정')}
   • 상태: {apt.get('status', '예정')}
"""
    
    return {'content': content, 'actions': []}

def generate_payment_response(context):
    """수납 안내 응답"""
    content = """
수납 안내:
• 위치: 본관 1층 원무과
• 운영시간: 평일 08:30-17:30, 토요일 08:30-12:30
• 결제방법: 신용카드, 체크카드, 현금, 모바일페이
• 무인수납기: 24시간 이용 가능 (본관 1층, 2층)

진료 후 수납이 필요하시면 원무과를 방문해주세요.
"""
    return {'content': content, 'actions': []}

def generate_facility_response(entities):
    """편의시설 안내 응답"""
    content = """
병원 안에 편의시설이 궁금하시군요! 알려드릴게요~ 😊

☕ 카페가 있어요!
   본관 1층 로비에 있고, 아침 7시부터 저녁 7시까지 해요
   커피도 맛있고 샌드위치도 있어요~

🏪 편의점도 있어요!
   지하 1층에 24시간 열려있어서 언제든 이용하실 수 있어요
   
🍴 구내식당
   3층에 있고 점심(11:30-14:00), 저녁(17:00-19:00) 운영해요
   가격도 착하고 맛도 괜찮아요!

💊 약국
   본관 1층에 있어요 (08:30-18:00)
   처방받은 약 바로 받으실 수 있어요

🏧 ATM기계
   본관 1층이랑 지하 1층에 있어요 (24시간)
   
화장실은 각 층 엘리베이터 옆에 있으니 찾기 쉬우실 거예요~ 🚻
"""
    return {'content': content, 'actions': []}

def generate_parking_response():
    """주차 안내 응답"""
    content = """
주차 걱정되시죠? 자세히 알려드릴게요! 🚗

📍 주차장 위치
지하 1층, 2층, 3층에 있어요~

💰 주차 요금은요
• 처음 30분은 무료예요!
• 그 다음부터 10분에 500원이에요
• 진료 받으시면 50% 할인돼요! (꼭 도장 받으세요~)

🎫 정산하는 방법
• 무인정산기 사용하시거나
• 출차할 때 직접 계산하셔도 돼요

⏰ 24시간 운영이라 언제든 괜찮아요!

💡 꿀팁!
주차장이 꽉 차있으면 제2주차장도 있어요 (걸어서 5분)
진료 받으셨으면 원무과에서 주차권에 도장 꼭 받으세요! 
반값이 되니까 잊지 마세요~ 😊
"""
    return {'content': content, 'actions': []}

def generate_hospital_info_response():
    """병원 정보 응답"""
    content = """
서울대학교병원 정보를 알려드릴게요! 📋

📞 전화번호 메모하세요~
• 대표전화: 1588-0000
• 응급실: 02-0000-0119 (24시간 언제든지!)
• 진료예약: 1588-5700

⏰ 언제 열려있나요?
• 평일: 아침 8시 반 ~ 오후 5시 반
• 토요일: 아침 8시 반 ~ 낮 12시 반
• 일요일이랑 공휴일: 응급실만 해요

📍 오시는 길
서울특별시 종로구 대학로 101번지예요
지하철 4호선 혜화역이 가장 가까워요~ 

네비게이션에 "서울대병원" 치시면 바로 나와요! 😊
혹시 더 궁금한 거 있으신가요?
"""
    return {'content': content, 'actions': []}

def generate_gpt_response(question, context):
    """GPT를 사용한 응답 생성 - 더 자연스럽고 유용한 답변"""
    if not client:
        # GPT 사용 불가 시 기본 도움말 제공
        return {
            'content': '죄송합니다. 잠시 시스템 점검 중입니다.\n\n직접 문의를 원하시면:\n📞 대표번호: 1588-0000\n📍 안내데스크: 본관 1층',
            'actions': [
                {'type': 'call', 'label': '전화 문의', 'value': 'tel:1588-0000'}
            ]
        }
    
    try:
        # 추가 컨텍스트 정보 제공
        enhanced_context = f"""{context}

사용자 질문 분석:
- 질문 내용: {question}
- 답변 시 고려사항: 
  * 구체적인 예시를 들어 설명
  * 관련 추가 정보도 함께 제공
  * 다음 단계 안내 포함
  * 적절한 이모지 사용 (1-2개 정도)
"""
        
        messages = [
            {"role": "system", "content": ENHANCED_SYSTEM_PROMPT + enhanced_context},
            # Few-shot 예시로 친근한 톤 학습
            {"role": "user", "content": "MRI 검사가 무서워요"},
            {"role": "assistant", "content": "MRI 검사 받으시는군요! 걱정되시죠? 😊\n\nMRI는 큰 도넛 모양 기계 안에 누워계시면 되는데요, 시끄러운 소리가 나긴 하지만 전혀 아프지 않아요! 헤드폰도 드릴 거예요.\n\n검사 시간은 보통 20-40분 정도 걸리는데, 그냥 편하게 누워계시면 돼요. 중간에 힘드시면 손에 쥐어드리는 벨 누르시면 바로 도와드려요!\n\n검사 전에 금속 물건만 빼시면 되고요, 많이들 하시는 검사라 너무 걱정하지 마세요~ 화이팅! 💪"},
            {"role": "user", "content": question}
        ]
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            max_tokens=600,
            temperature=0.85,  # 자연스러운 대화체
            presence_penalty=0.4,  # 반복 방지
            frequency_penalty=0.3,  # 다양한 표현
            top_p=0.95  # 더 자연스러운 응답
        )
        
        gpt_content = response.choices[0].message.content
        
        # 응답에서 액션 추출 (있을 경우)
        actions = []
        if '전화' in gpt_content or '연락' in gpt_content:
            actions.append({'type': 'call', 'label': '병원 전화', 'value': 'tel:1588-0000'})
        if '안내데스크' in gpt_content or '1층' in gpt_content:
            actions.append({'type': 'location', 'label': '안내데스크 위치', 'value': '본관 1층'})
        
        return {
            'content': gpt_content,
            'actions': actions
        }
        
    except Exception as e:
        logger.error(f"GPT API error: {e}")
        # 에러 시에도 유용한 기본 정보 제공
        return {
            'content': '죄송합니다. 답변을 준비하는 중 문제가 발생했습니다.\n\n일반 문의는 아래로 연락해주세요:\n📞 대표번호: 1588-0000\n📍 안내데스크: 본관 1층\n⏰ 운영시간: 평일 08:30-17:30',
            'actions': [
                {'type': 'call', 'label': '전화 문의', 'value': 'tel:1588-0000'}
            ]
        }

@app.route('/api/chatbot/suggestions', methods=['GET'])
def get_suggestions():
    """상황별 추천 질문"""
    # 인증 확인
    auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = request.args.get('userId')
    
    # 환자 컨텍스트 조회
    patient_context = context_manager.get_patient_context(user_id, auth_token)
    patient_state = patient_context.get('patient_state', 'UNREGISTERED')
    
    suggestions = context_manager.get_state_based_suggestions(patient_state)
    
    return jsonify({
        "success": True,
        "data": {
            "state": patient_state,
            "suggestions": suggestions
        },
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/chatbot/faq', methods=['GET'])
def get_faq():
    """자주 묻는 질문 목록"""
    category = request.args.get('category', 'all')
    
    faq_list = [
        {
            "id": "faq-001",
            "category": "검사",
            "question": "혈액검사는 금식이 필요한가요?",
            "answer": "일반 혈액검사는 8-12시간 금식이 필요합니다. 물은 소량 섭취 가능합니다."
        },
        {
            "id": "faq-002",
            "category": "검사",
            "question": "CT 검사 시 주의사항은?",
            "answer": "금속 물품을 모두 제거하고, 조영제 사용 시 알레르기 여부를 미리 알려주세요."
        },
        {
            "id": "faq-003",
            "category": "시설",
            "question": "병원 내 식사는 어디서 할 수 있나요?",
            "answer": "본관 3층 식당, 1층 카페, 지하 1층 편의점을 이용하실 수 있습니다."
        },
        {
            "id": "faq-004",
            "category": "수납",
            "question": "진료비 카드 할부가 가능한가요?",
            "answer": "네, 신용카드로 2-12개월 무이자 할부가 가능합니다."
        },
        {
            "id": "faq-005",
            "category": "주차",
            "question": "주차료 할인을 받으려면?",
            "answer": "진료 확인 도장을 원무과에서 받으시면 50% 할인됩니다."
        }
    ]
    
    if category != 'all':
        faq_list = [faq for faq in faq_list if faq['category'] == category]
    
    return jsonify({
        "success": True,
        "data": {
            "items": faq_list,
            "categories": ["검사", "시설", "수납", "주차"],
            "totalCount": len(faq_list)
        },
        "timestamp": datetime.now().isoformat()
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": {
            "code": "NOT_FOUND",
            "message": "요청하신 리소스를 찾을 수 없습니다"
        }
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": {
            "code": "INTERNAL_ERROR",
            "message": "서버 내부 오류가 발생했습니다"
        }
    }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Enhanced NFC Hospital Chatbot Server starting on port {port}")
    logger.info(f"Environment: {'Development' if debug_mode else 'Production'}")
    logger.info(f"Django API URL: {os.getenv('DJANGO_API_URL', 'http://localhost:8000')}")
    
    # API 키 상태 확인
    if os.getenv('OPENAI_API_KEY'):
        logger.info("OpenAI API Key configured")
    else:
        logger.warning("OpenAI API Key not found - GPT features disabled")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)