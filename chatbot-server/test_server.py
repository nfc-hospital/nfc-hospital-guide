#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:5000"

def test_health_check():
    try:
        response = requests.get(f"{BASE_URL}/health")
        print("헬스 체크:")
        print(f"상태: {response.status_code}")
        print(f"응답: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        print("-" * 50)
        return response.status_code == 200
    except Exception as e:
        print(f"헬스 체크 실패: {e}")
        return False

def test_chatbot_query():
    try:
        data = {
            "question": "X-ray 검사는 얼마나 걸리나요?",
            "context": {
                "currentLocation": "x_ray_room",
                "patientExam": "chest_xray",
                "userId": "test_user_001"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chatbot/query",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        print("챗봇 질의 테스트:")
        print(f"상태: {response.status_code}")
        print(f"응답: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        print("-" * 50)
        return response.status_code == 200
    except Exception as e:
        print(f"챗봇 질의 테스트 실패: {e}")
        return False

def test_faq():
    try:
        response = requests.get(f"{BASE_URL}/api/chatbot/faq")
        print("FAQ 테스트:")
        print(f"상태: {response.status_code}")
        print(f"응답: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        print("-" * 50)
        return response.status_code == 200
    except Exception as e:
        print(f"FAQ 테스트 실패: {e}")
        return False

def test_suggestions():
    try:
        response = requests.get(f"{BASE_URL}/api/chatbot/suggestions")
        print("추천 질문 테스트:")
        print(f"상태: {response.status_code}")
        print(f"응답: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        print("-" * 50)
        return response.status_code == 200
    except Exception as e:
        print(f"추천 질문 테스트 실패: {e}")
        return False

def main():
    print("NFC 병원 챗봇 서버 테스트")
    print("=" * 50)
    
    # 테스트 실행
    tests = [
        ("헬스 체크", test_health_check),
        ("FAQ 엔드포인트", test_faq),
        ("추천 질문 엔드포인트", test_suggestions),
        ("챗봇 질의", test_chatbot_query)  # OpenAI API 키가 필요한 테스트는 마지막에
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"{test_name} 실행 중...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"{test_name} 테스트 예외 발생: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("테스트 결과 요약:")
    for test_name, result in results:
        status = "[성공]" if result else "[실패]"
        print(f"{status} {test_name}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"\n{passed}/{total} 테스트 통과")

if __name__ == "__main__":
    main()