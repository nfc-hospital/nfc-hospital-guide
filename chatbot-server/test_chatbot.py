#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
챗봇 서버 테스트 스크립트
- 비로그인 사용자 시나리오
- 로그인 사용자 시나리오
"""
import requests
import json

CHATBOT_URL = 'http://localhost:5000/api/chatbot/query'

def print_response(title, response_data):
    """응답 출력"""
    print("\n" + "="*70)
    print(f"📋 {title}")
    print("="*70)
    if response_data.get('success'):
        print(f"✅ 성공")
        print(f"🤖 답변:\n{response_data.get('answer', '답변 없음')}")
        print(f"🔐 로그인: {response_data.get('authenticated', False)}")
    else:
        print(f"❌ 실패: {response_data.get('error', '알 수 없는 오류')}")
    print("="*70 + "\n")


def test_guest_questions():
    """비로그인 사용자 질문 테스트"""
    print("\n" + "#"*70)
    print("# 테스트 1: 비로그인 사용자 (일반 정보 질문)")
    print("#"*70)

    questions = [
        "병원 전화번호가 어떻게 되나요?",
        "주차장 이용 요금이 궁금해요",
        "카페는 어디에 있나요?",
        "진료 시간이 어떻게 되나요?",
    ]

    for question in questions:
        print(f"\n💬 질문: {question}")
        try:
            response = requests.post(
                CHATBOT_URL,
                json={'question': question},
                timeout=10
            )
            print_response(f"응답", response.json())
        except Exception as e:
            print(f"❌ 오류: {e}")


def test_guest_personal_questions():
    """비로그인 사용자가 개인 정보 질문할 때"""
    print("\n" + "#"*70)
    print("# 테스트 2: 비로그인 사용자 (개인 정보 질문)")
    print("#"*70)

    questions = [
        "내 대기 순서는 몇 번인가요?",
        "내 오늘 예약 알려주세요",
        "내 진료비는 얼마인가요?",
    ]

    for question in questions:
        print(f"\n💬 질문: {question}")
        try:
            response = requests.post(
                CHATBOT_URL,
                json={'question': question},
                timeout=10
            )
            data = response.json()
            print_response("응답 (로그인 안내 예상)", data)

            # 응답에 "로그인" 키워드가 있는지 확인
            answer = data.get('answer', '')
            if '로그인' in answer:
                print("✅ 올바르게 로그인 안내함")
            else:
                print("⚠️ 로그인 안내가 없을 수 있음")

        except Exception as e:
            print(f"❌ 오류: {e}")


def test_logged_in_user(jwt_token=None):
    """로그인 사용자 질문 테스트"""
    print("\n" + "#"*70)
    print("# 테스트 3: 로그인 사용자 (개인 맞춤 정보)")
    print("#"*70)

    if not jwt_token:
        print("⚠️ JWT 토큰이 제공되지 않았습니다.")
        print("   실제 테스트를 위해 유효한 JWT 토큰을 전달하세요.")
        print("   예: test_logged_in_user('eyJhbGciOi...')")
        return

    questions = [
        "내 대기 순서 알려주세요",
        "오늘 내 예약이 어떻게 되나요?",
        "다음 검사는 언제인가요?",
    ]

    for question in questions:
        print(f"\n💬 질문: {question}")
        try:
            headers = {'Authorization': f'Bearer {jwt_token}'}
            response = requests.post(
                CHATBOT_URL,
                json={'question': question},
                headers=headers,
                timeout=10
            )
            data = response.json()
            print_response("응답 (개인 맞춤)", data)

            if data.get('authenticated'):
                print("✅ 로그인 상태 확인됨")
            else:
                print("⚠️ JWT 토큰이 유효하지 않을 수 있음")

        except Exception as e:
            print(f"❌ 오류: {e}")


def test_health_check():
    """헬스 체크"""
    print("\n" + "#"*70)
    print("# 테스트 0: 챗봇 서버 헬스 체크")
    print("#"*70)

    try:
        response = requests.get('http://localhost:5000/health', timeout=5)
        data = response.json()
        if data.get('status') == 'healthy':
            print("✅ 챗봇 서버 정상 작동 중")
            print(f"   서비스: {data.get('service')}")
            print(f"   시간: {data.get('timestamp')}")
        else:
            print("❌ 챗봇 서버 상태 이상")
    except Exception as e:
        print(f"❌ 챗봇 서버 연결 실패: {e}")
        print("   서버가 실행 중인지 확인하세요: python app.py")
        exit(1)


if __name__ == '__main__':
    print("\n" + "🏥"*35)
    print("HC_119 병원 챗봇 서버 테스트 시작")
    print("🏥"*35)

    # 0. 헬스 체크
    test_health_check()

    # 1. 비로그인 사용자 - 일반 질문
    test_guest_questions()

    # 2. 비로그인 사용자 - 개인 정보 질문
    test_guest_personal_questions()

    # 3. 로그인 사용자
    print("\n" + "#"*70)
    print("# 테스트 3은 수동으로 실행하세요")
    print("#"*70)
    print("로그인 사용자 테스트를 위해 다음 명령어를 사용하세요:")
    print("python test_chatbot.py --token YOUR_JWT_TOKEN")
    print()

    print("\n" + "🏥"*35)
    print("테스트 완료!")
    print("🏥"*35 + "\n")
