#!/usr/bin/env python3
"""
LSTM 예측 API 테스트 스크립트
"""
import requests
import json
from datetime import datetime

# API 엔드포인트
API_URL = "http://localhost:8000/api/v1/analytics/predictions/"

print("=" * 60)
print("LSTM 예측 API 테스트")
print("=" * 60)

try:
    # API 호출
    print(f"\n📡 API 호출 중: {API_URL}")
    response = requests.get(API_URL, timeout=10)

    # 상태 코드 확인
    print(f"📊 상태 코드: {response.status_code}")

    if response.status_code == 200:
        data = response.json()

        # 전체 구조 확인
        print(f"\n✅ API 응답 성공!")
        print(f"  - 타임스탬프: {data.get('data', {}).get('timestamp', 'N/A')}")
        print(f"  - 시간대: {data.get('data', {}).get('timeframe', 'N/A')}")

        # 전체 혼잡도
        overall = data.get('data', {}).get('overall', {})
        print(f"\n📈 전체 혼잡도:")
        print(f"  - 평균 혼잡도: {overall.get('avgCongestion', 0):.2f}")
        print(f"  - 혼잡 레벨: {overall.get('congestionLevel', 'N/A')}")
        print(f"  - 부서 수: {overall.get('totalDepartments', 0)}")

        # 부서별 예측
        departments = data.get('data', {}).get('departments', {})
        print(f"\n🏥 부서별 예측 ({len(departments)}개 부서):")

        for dept_name, dept_data in departments.items():
            if isinstance(dept_data, dict) and 'error' not in dept_data:
                print(f"\n  [{dept_name}]")
                print(f"    현재 대기: {dept_data.get('current_wait', 0)}분")
                print(f"    예측 대기: {dept_data.get('predicted_wait', 0)}분")
                print(f"    혼잡도: {dept_data.get('congestion', 0):.2f}")
                print(f"    추세: {dept_data.get('trend', 'N/A')}")

        # 추천사항
        recommendations = data.get('data', {}).get('recommendations', [])
        if recommendations:
            print(f"\n💡 AI 추천사항:")
            for rec in recommendations:
                print(f"  - [{rec.get('type', '')}] {rec.get('message', '')}")
                print(f"    조치: {rec.get('action', '')}")

        # 원본 데이터 일부 출력 (디버깅용)
        print(f"\n🔍 원본 응답 (처음 500자):")
        print(json.dumps(data, indent=2, ensure_ascii=False)[:500] + "...")

    else:
        print(f"\n❌ API 오류: {response.status_code}")
        print(f"응답: {response.text[:200]}")

except requests.exceptions.Timeout:
    print("\n⏱️ 요청 시간 초과 (10초)")
except requests.exceptions.ConnectionError:
    print("\n🔌 서버 연결 실패. Django 서버가 실행 중인지 확인하세요.")
    print("   실행 명령: cd backend/nfc_hospital_system && python manage.py runserver")
except Exception as e:
    print(f"\n❌ 예상치 못한 오류: {e}")

print("\n" + "=" * 60)
print("테스트 완료")
print("=" * 60)