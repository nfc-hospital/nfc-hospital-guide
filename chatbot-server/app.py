# chatbot-server/app.py (최종 버전)
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

# --- 설정 로드 ---
load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- OpenAI 클라이언트 설정 ---
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# --- JWT 토큰 검증 함수 ---
def get_user_from_token(token):
    if not token:
        return None
    try:
        secret_key = os.getenv('DJANGO_SECRET_KEY')
        if not secret_key:
            print("[AUTH ERROR] DJANGO_SECRET_KEY is not set in .env file.")
            return None
            
        decoded_token = jwt.decode(token, secret_key, algorithms=["HS256"])
        print("[AUTH SUCCESS] Token validation successful.")
        return decoded_token
    except jwt.ExpiredSignatureError:
        print("[AUTH ERROR] Token validation failed: ExpiredSignatureError")
        return None
    except jwt.InvalidSignatureError:
        print("[AUTH ERROR] Token validation failed: InvalidSignatureError. SECRET_KEY MISMATCH IS THE LIKELY CAUSE.")
        return None
    except Exception as e:
        print(f"[AUTH ERROR] An unexpected error occurred during token validation: {e}")
        return None


# --- Django API 호출 함수들 ---
def get_patient_journey_from_django(token):
    """로그인한 사용자의 개인화된 정보를 Django에서 가져옵니다."""
    try:
        django_url = f"{os.getenv('DJANGO_BASE_URL')}/api/v1/queue/internal/patient-journey/"
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(django_url, headers=headers, timeout=5)
        if response.status_code == 200 and response.json().get('success'):
            print(">>> Django personal data received successfully.")
            return response.json().get('data')
        else:
            print(f">>> Django personal data API ERROR: {response.status_code} - {response.text}")
    except requests.RequestException as e:
        print(f">>> Django personal data API call ERROR: {e}")
    return None

def get_public_info_from_django():
    """로그인 없이 볼 수 있는 일반 정보를 Django에서 가져옵니다."""
    try:
        django_url = f"{os.getenv('DJANGO_BASE_URL')}/api/v1/queue/internal/public-queue-info/"
        response = requests.get(django_url, timeout=5)
        if response.status_code == 200 and response.json().get('success'):
            print(">>> Django public data received successfully.")
            return response.json().get('data')
        else:
            print(f">>> Django public data API ERROR: {response.status_code} - {response.text}")
    except requests.RequestException as e:
        print(f">>> Django public data API call ERROR: {e}")
    return None

# --- 메인 챗봇 API 엔드포인트 ---
@app.route('/api/chatbot/query', methods=['POST'])
def query_chatbot():
    data = request.json
    question = data.get('question')
    if not question:
        return jsonify({"error": "질문이 없습니다."}), 400

    token = request.headers.get('Authorization', '').split(' ')[-1] if 'Bearer' in request.headers.get('Authorization', '') else None
    user_info = get_user_from_token(token)

    system_prompt = """당신은 HC_119 종합병원의 AI 안내원 '차비서'입니다. 항상 친절하고 명확하게 답변해야 합니다.
    우리 병원의 진료과는 내과, 외과, 소아과, 영상의학과가 있습니다.
    """
    
    public_data = get_public_info_from_django()
    if public_data:
        system_prompt += f"\n[현재 병원 공개 정보]\n- 진료과별 평균 대기 시간: {public_data}\n"

    if user_info:
        patient_data = get_patient_journey_from_django(token)
        if patient_data:
            system_prompt += f"""
            ---
            [환자 개인정보] (이 정보는 환자 본인에게만 공개)
            - 환자 이름: {patient_data.get("userName", "알 수 없음")}
            - 현재 병원 내 상태: {patient_data.get('stateDescription', '확인 중')}
            - 현재 대기열 정보: {patient_data.get('currentQueues') or '대기 중인 검사 없음'}
            - 오늘 남은 예약: {patient_data.get('appointments') or '남은 예약 없음'}
            ---
            """
        else:
            system_prompt += "\n--- [상태] 환자는 로그인했지만, 현재 진행 중인 진료/검사 정보가 없습니다. ---"
            
    system_prompt += """
    [답변 규칙]
    1. 만약 사용자의 질문이 [환자 개인정보]를 알아야만 답할 수 있는 질문(예: "내 순서", "내 예약")인데, [환자 개인정보] 컨텍스트가 주어지지 않았다면, 반드시 "개인정보 확인을 위해 먼저 로그인해주세요."라고만 답변하세요.
    2. [환자 개인정보] 컨텍스트가 있다면, 그 정보를 바탕으로 개인적인 질문에 답변하세요.
    3. 병원 위치, 진료과, 평균 대기 시간 등 일반적인 질문에는 [현재 병원 공개 정보]와 당신의 의료 상식을 활용해 자유롭게 답변하세요.
    """
    
    print("--- Final System Prompt ---")
    print(system_prompt)
    print("-------------------------")

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
            model="gpt-4o-mini",
        )
        answer = chat_completion.choices[0].message.content
        
        # 간단한 의료 안전 필터
        dangerous_patterns = ["약을 중단", "병원에 가지 마", "의사가 필요 없", "자가 치료"]
        for pattern in dangerous_patterns:
            if pattern in answer:
                answer = "죄송합니다. 의료 관련 상담은 전문 의료진과 상의해주세요."
                break
        
        return jsonify({"answer": answer, "authenticated": bool(user_info)})
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return jsonify({"error": "챗봇 서비스에 문제가 발생했습니다."}), 500

# --- 서버 실행 ---
if __name__ == '__main__':
    if not os.getenv('OPENAI_API_KEY'):
        print("[ERROR] OPENAI_API_KEY is not set in .env file.")
        sys.exit(1)
    
    app.run(host='0.0.0.0', port=5000, debug=True)