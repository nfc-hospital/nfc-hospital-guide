#!/usr/bin/env python3
"""
데모 시스템 테스트 스크립트
5분간 실시간 LSTM 예측 데모를 테스트합니다.
"""
import requests
import json
import time
from datetime import datetime

# API 엔드포인트
BASE_URL = "http://localhost:8000/api/v1"
DEMO_URL = f"{BASE_URL}/dashboard/demo/control/"
PREDICTIONS_URL = f"{BASE_URL}/analytics/predictions/"

# 토큰 (필요한 경우 여기에 추가)
TOKEN = None  # "your-access-token-here"

# 헤더 설정
headers = {}
if TOKEN:
    headers["Authorization"] = f"Bearer {TOKEN}"

def print_section(title):
    """섹션 구분선 출력"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def start_demo():
    """데모 시작"""
    print_section("데모 시작")

    try:
        response = requests.post(DEMO_URL, headers=headers)

        if response.status_code == 201:
            data = response.json()
            print(f"✅ 데모가 성공적으로 시작되었습니다!")
            print(f"  - 지속 시간: {data.get('duration', 300)}초")
            print(f"  - 데이터 포인트: {data.get('data_points', 0)}개")
            print(f"  - 시작 시간: {data.get('start_time', 'N/A')}")
            return True
        else:
            print(f"❌ 데모 시작 실패: {response.status_code}")
            print(f"   응답: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ 서버에 연결할 수 없습니다. Django 서버가 실행 중인지 확인하세요.")
        return False
    except Exception as e:
        print(f"❌ 예외 발생: {e}")
        return False

def check_demo_status():
    """데모 상태 확인"""
    try:
        response = requests.get(DEMO_URL, headers=headers)

        if response.status_code == 200:
            data = response.json()

            if data.get('active'):
                print(f"📊 데모 상태: 활성")
                print(f"  - 경과 시간: {data.get('elapsed', 0)}초")
                print(f"  - 남은 시간: {data.get('remaining', 0)}초")
                print(f"  - 진행률: {data.get('progress', 0)}%")
                return True
            else:
                print("⚠️ 데모가 실행 중이지 않습니다.")
                return False
        else:
            print(f"❌ 상태 확인 실패: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 상태 확인 중 오류: {e}")
        return False

def get_predictions():
    """예측 데이터 가져오기"""
    try:
        response = requests.get(PREDICTIONS_URL, headers=headers)

        if response.status_code == 200:
            data = response.json().get('data', {})

            # 데모 모드 확인
            if data.get('demo_mode'):
                print(f"🎯 데모 모드 예측 데이터 (경과: {data.get('demo_elapsed', 0)}초)")
            else:
                print("📊 일반 예측 데이터")

            # 전체 혼잡도
            overall = data.get('overall', {})
            print(f"  - 평균 혼잡도: {overall.get('avgCongestion', 0):.2f}")
            print(f"  - 혼잡 레벨: {overall.get('congestionLevel', 'N/A')}")

            # 부서별 예측
            departments = data.get('departments', {})
            if departments:
                print(f"\n  부서별 예측 ({len(departments)}개):")
                for dept_name, dept_data in list(departments.items())[:3]:  # 상위 3개만 표시
                    if isinstance(dept_data, dict):
                        print(f"    [{dept_name}]")
                        print(f"      현재 대기: {dept_data.get('current_wait', 0)}분")
                        print(f"      예측 대기: {dept_data.get('predicted_wait', 0)}분")
                        print(f"      혼잡도: {dept_data.get('congestion', 0):.2f}")

            return True
        else:
            print(f"❌ 예측 데이터 조회 실패: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 예측 데이터 조회 중 오류: {e}")
        return False

def stop_demo():
    """데모 종료"""
    print_section("데모 종료")

    try:
        response = requests.delete(DEMO_URL, headers=headers)

        if response.status_code == 200:
            data = response.json()
            print(f"✅ {data.get('message', '데모가 종료되었습니다.')}")
            return True
        else:
            print(f"❌ 데모 종료 실패: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 데모 종료 중 오류: {e}")
        return False

def main():
    """메인 테스트 실행"""
    print_section("LSTM 데모 시스템 테스트")
    print("이 스크립트는 5분간 실행되는 데모 시스템을 테스트합니다.")
    print(f"서버: {BASE_URL}")

    # 1. 데모 시작
    if not start_demo():
        print("\n테스트를 종료합니다.")
        return

    # 2. 30초 동안 모니터링 (실제로는 5분이지만 테스트용으로 30초만)
    print_section("데모 모니터링 (30초)")

    for i in range(6):  # 5초 간격으로 6번 = 30초
        time.sleep(5)
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}]")

        # 상태 확인
        if not check_demo_status():
            break

        # 예측 데이터 확인
        get_predictions()

    # 3. 데모 종료
    stop_demo()

    print_section("테스트 완료")
    print("✅ 모든 테스트가 완료되었습니다.")

if __name__ == "__main__":
    main()