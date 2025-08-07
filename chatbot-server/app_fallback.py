#!/usr/bin/env python3
"""
폴백 챗봇 서버 - OpenAI API 없이 기본 응답 제공
개발/테스트 환경에서 사용
"""
import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# 미리 정의된 응답 패턴
PREDEFINED_RESPONSES = {
    "검사": {
        "keywords": ["검사", "x-ray", "xray", "ct", "mri", "혈액"],
        "response": "검사에 대해 궁금하신가요? 각 검사별로 준비사항이 다릅니다:\n\n"
                   "• X-ray: 금속 제거, 약 5-10분 소요\n"
                   "• CT: 4-6시간 금식, 조영제 사용 가능\n"
                   "• MRI: 금속 임플란트 확인, 30분-1시간 소요\n"
                   "• 혈액검사: 12시간 금식 (물은 가능)\n\n"
                   "자세한 사항은 검사실에서 안내받으세요."
    },
    "위치": {
        "keywords": ["위치", "어디", "가는", "찾아", "길"],
        "response": "병원 내 주요 위치 안내:\n\n"
                   "• 1층: 접수/수납, 응급실, 약국\n"
                   "• 2층: 내과, 외과, 정형외과\n"
                   "• 3층: 영상의학과 (X-ray, CT, MRI)\n"
                   "• 지하 1층: 주차장, 편의점\n\n"
                   "NFC 태그를 스캔하시면 현재 위치에서 가는 길을 안내받을 수 있습니다."
    },
    "대기": {
        "keywords": ["대기", "기다", "순서", "언제", "시간"],
        "response": "대기 시간은 검사별로 다릅니다:\n\n"
                   "• 일반 진료: 10-30분\n"
                   "• X-ray: 5-15분\n"
                   "• CT/MRI: 예약 시간 기준\n"
                   "• 혈액검사: 5-10분\n\n"
                   "정확한 대기 시간은 검사실 화면에서 확인하세요."
    },
    "주차": {
        "keywords": ["주차", "차", "요금"],
        "response": "병원 주차 안내:\n\n"
                   "• 위치: 지하 1-3층, 별관 옆 지상 주차장\n"
                   "• 요금: 최초 30분 무료, 이후 10분당 500원\n"
                   "• 진료 시: 4시간 무료 (수납 시 등록)\n"
                   "• 운영 시간: 24시간\n\n"
                   "주차 공간이 부족할 수 있으니 대중교통 이용을 권장합니다."
    },
    "운영시간": {
        "keywords": ["시간", "언제", "운영", "진료", "열어", "닫"],
        "response": "병원 운영 시간:\n\n"
                   "• 평일: 오전 9시 - 오후 6시\n"
                   "• 토요일: 오전 9시 - 오후 1시\n"
                   "• 일요일/공휴일: 휴진\n"
                   "• 응급실: 24시간 운영\n\n"
                   "진료과별로 운영 시간이 다를 수 있으니 예약 시 확인하세요."
    }
}

def get_preparation_info(question, context):
    """준비사항 정보 추출"""
    question_lower = question.lower()
    
    if any(keyword in question_lower for keyword in ["ct", "시디"]):
        return ["금식 필요", "금속 제거", "조영제 사용 가능"]
    elif any(keyword in question_lower for keyword in ["mri", "엠알아이"]):
        return ["모든 금속 제거", "심박동기 확인", "검사복 착용"]
    elif any(keyword in question_lower for keyword in ["xray", "x-ray", "엑스레이"]):
        return ["금속 제거", "임신 여부 확인"]
    elif any(keyword in question_lower for keyword in ["혈액", "피검"]):
        return ["금식 필요", "물 섭취 가능"]
    
    return []

def get_location_info(question, context):
    """위치 정보 추출"""
    question_lower = question.lower()
    current_location = context.get('currentLocation', '')
    
    location_map = {
        "ct": "본관 3층 304호",
        "mri": "본관 지하 1층",
        "xray": "본관 2층 201호",
        "x-ray": "본관 2층 201호",
        "혈액": "본관 1층 채혈실"
    }
    
    for exam_type, location in location_map.items():
        if exam_type in question_lower:
            return location
    
    return current_location if current_location else "안내데스크에 문의해주세요"

def find_best_response(question):
    """질문에 가장 적합한 응답 찾기"""
    question_lower = question.lower()
    
    for category, data in PREDEFINED_RESPONSES.items():
        for keyword in data["keywords"]:
            if keyword in question_lower:
                return data["response"]
    
    # 기본 응답
    return ("죄송합니다. 해당 질문에 대한 정확한 답변을 찾을 수 없습니다.\n\n"
            "다음과 같은 질문을 해보세요:\n"
            "• 검사 준비사항이 궁금해요\n"
            "• 검사실 위치가 어디인가요?\n"
            "• 대기 시간은 얼마나 되나요?\n"
            "• 주차장은 어디에 있나요?\n"
            "• 병원 운영 시간이 어떻게 되나요?\n\n"
            "또는 병원 직원에게 직접 문의해주세요.")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "success": True,
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "NFC Hospital Chatbot Server (Fallback Mode)"
    })

@app.route('/api/chatbot/query', methods=['POST'])
def chatbot_query():
    """텍스트 질문 처리"""
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
        
        print(f"Received question: {user_question}")
        
        # 미리 정의된 응답에서 찾기
        response_text = find_best_response(user_question)
        
        # API 명세서에 맞는 응답 형식
        return jsonify({
            "query": user_question,
            "response": response_text,
            "confidence": 0.75,
            "relatedInfo": {
                "preparation": get_preparation_info(user_question, context),
                "location": get_location_info(user_question, context)
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error in chatbot_query: {type(e).__name__}: {str(e)}")
        
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "챗봇 처리 중 오류가 발생했습니다."
            },
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/chatbot/voice-query', methods=['POST'])
def voice_query():
    """음성 질문 처리"""
    try:
        data = request.get_json()
        
        if not data or 'audioData' not in data:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "audioData 필드가 필요합니다"
                },
                "timestamp": datetime.now().isoformat()
            }), 400
        
        # 실제로는 음성을 텍스트로 변환하는 로직이 필요
        # 현재는 폴백 응답만 제공
        return jsonify({
            "message": "음성 인식 기능은 브라우저의 Web Speech API를 사용해주세요.",
            "suggestion": "음성 버튼을 사용하거나 직접 텍스트를 입력해주세요."
        })
        
    except Exception as e:
        print(f"Error in voice_query: {type(e).__name__}: {str(e)}")
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "음성 처리 중 오류가 발생했습니다."
            },
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/chatbot/medical-terms', methods=['POST'])
def medical_terms():
    """의료 용어 쉬운 설명"""
    try:
        data = request.get_json()
        
        if not data or 'term' not in data:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "term 필드가 필요합니다"
                },
                "timestamp": datetime.now().isoformat()
            }), 400
        
        medical_term = data['term'].lower()
        
        # 의료 용어 사전
        term_definitions = {
            "ct": {
                "simple": "컴퓨터 단층촬영",
                "explanation": "몸 안을 여러 각도에서 촬영해서 단면 사진을 만드는 검사예요.",
                "when_used": "뼈, 혈관, 장기의 상태를 자세히 보고 싶을 때 사용해요."
            },
            "mri": {
                "simple": "자기공명영상",
                "explanation": "자석의 힘을 이용해서 몸 안을 촬영하는 검사예요.",
                "when_used": "뇌, 척추, 관절 등을 더 선명하게 보고 싶을 때 사용해요."
            },
            "조영제": {
                "simple": "몸 속을 더 잘 보게 하는 약",
                "explanation": "검사할 때 주사로 넣는 약물로, 혈관이나 장기를 더 선명하게 보게 해줘요.",
                "when_used": "CT나 MRI 검사에서 더 정확한 진단이 필요할 때 사용해요."
            },
            "내시경": {
                "simple": "몸 속을 직접 보는 검사",
                "explanation": "가느다란 관에 카메라가 달린 기구로 위나 대장 속을 직접 보는 검사예요.",
                "when_used": "위염, 위궤양, 대장 질환 등을 확인할 때 사용해요."
            }
        }
        
        if medical_term in term_definitions:
            definition = term_definitions[medical_term]
            return jsonify({
                "term": data['term'],
                "simple_name": definition["simple"],
                "explanation": definition["explanation"],
                "when_used": definition["when_used"],
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "term": data['term'],
                "message": f"'{data['term']}' 용어에 대한 설명을 찾을 수 없습니다.",
                "suggestion": "의료진이나 간호사에게 직접 문의해주세요.",
                "timestamp": datetime.now().isoformat()
            })
        
    except Exception as e:
        print(f"Error in medical_terms: {type(e).__name__}: {str(e)}")
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "의료 용어 처리 중 오류가 발생했습니다."
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
        },
        {
            "id": "faq-005",
            "question": "주차장은 어디에 있나요?",
            "answer": "병원 지하 1-3층과 별관 옆 지상 주차장을 이용하실 수 있습니다.",
            "category": "시설안내"
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
        "주차장은 어디에 있나요?",
        "병원 운영 시간이 어떻게 되나요?"
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
    
    print("=" * 50)
    print("NFC Hospital Chatbot Server (Fallback Mode)")
    print("=" * 50)
    print(f"Port: {port}")
    print(f"Environment: {'Development' if debug_mode else 'Production'}")
    print("Note: Running without OpenAI API - using predefined responses")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)