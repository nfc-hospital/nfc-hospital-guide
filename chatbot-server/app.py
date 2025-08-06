#!/usr/bin/env python3
import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import openai

load_dotenv()

app = Flask(__name__)
CORS(app)

openai.api_key = os.getenv('OPENAI_API_KEY')

SYSTEM_PROMPT = """
당신은 NFC 기반 병원 검사·진료 안내 시스템의 AI 챗봇입니다. 
환자들이 병원에서 검사나 진료를 받을 때 도움을 주는 역할입니다.

다음 원칙을 따라 답변해주세요:
1. 친근하고 이해하기 쉬운 언어를 사용하세요
2. 의료 정보는 정확하게 전달하되, 진단이나 치료 조언은 피하고 의료진 상담을 권하세요
3. 병원 위치, 검사 준비사항, 대기시간 등 실용적인 정보를 제공하세요
4. 모르는 내용은 솔직히 모른다고 하고, 병원 직원에게 문의하도록 안내하세요
5. 응답은 간결하되 필요한 정보는 빠뜨리지 마세요
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
        
        # 컨텍스트 정보를 시스템 프롬프트에 추가
        context_info = ""
        if context.get('currentLocation'):
            context_info += f"현재 위치: {context['currentLocation']}\n"
        if context.get('patientExam'):
            context_info += f"예정된 검사: {context['patientExam']}\n"
        
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + context_info},
            {"role": "user", "content": user_question}
        ]
        
        # OpenAI API 호출
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )
        
        ai_response = response.choices[0].message.content
        
        return jsonify({
            "success": True,
            "data": {
                "object": "chat_message",
                "messageId": f"msg-{datetime.now().timestamp()}",
                "userId": context.get('userId', 'anonymous'),
                "type": "user_query",
                "content": user_question,
                "response": {
                    "type": "faq_answer",
                    "content": ai_response,
                    "confidence": 0.85,
                    "sources": ["openai-gpt"]
                }
            },
            "message": "질문이 성공적으로 처리되었습니다",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": f"챗봇 처리 중 오류가 발생했습니다: {str(e)}"
            },
            "timestamp": datetime.now().isoformat()
        }), 500

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
    
    print(f"🤖 NFC Hospital Chatbot Server starting on port {port}")
    print(f"📍 Environment: {'Development' if debug_mode else 'Production'}")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)