#!/usr/bin/env python
"""Test script to verify LSTM predictions work with newly generated Queue data"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')
django.setup()

from integrations.services.prediction_service import PredictionService

def test_predictions():
    print("\n" + "=" * 70)
    print(" LSTM 예측 시스템 테스트 (신규 Queue 데이터)")
    print("=" * 70)

    try:
        ps = PredictionService()
        result = ps.get_predictions('30min')

        departments = result.get('departments', {})
        print(f"\n✅ 예측 성공! 총 {len(departments)}개 부서")

        print("\n📊 부서별 예측 결과:")
        for dept, data in departments.items():
            current = data.get('current_wait', 0)
            predicted = data.get('predicted_wait', 0)
            trend = data.get('trend', 'stable')
            congestion = data.get('congestion', 0)

            trend_icon = '📈' if trend == 'up' else '📉' if trend == 'down' else '➡️'

            print(f"\n  {dept}:")
            print(f"    현재 대기시간: {current:.1f}분")
            print(f"    30분 후 예측: {predicted:.1f}분 {trend_icon}")
            print(f"    혼잡도: {congestion:.0%}")

            # Hybrid 정보 확인
            hybrid = data.get('hybrid', {})
            if hybrid:
                print(f"    Hybrid 보정: 신뢰도 {hybrid.get('confidence', 0):.0%}")
                applied_rules = hybrid.get('applied_rules', [])
                if applied_rules:
                    print(f"    적용된 규칙: {', '.join(map(str, applied_rules))}")

        print("\n" + "=" * 70)
        print(" 테스트 완료! LSTM 모델이 정상 작동합니다.")
        print("=" * 70)

        return True

    except Exception as e:
        print(f"\n❌ 예측 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    test_predictions()
