#!/usr/bin/env python
import os
import sys
import django

# Django 설정 초기화
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')
django.setup()

from integrations.services.prediction_service import PredictionService
import json

# 예측 실행
print("=" * 60)
print("LSTM 예측 테스트 시작...")
print("=" * 60)

try:
    predictions = PredictionService.get_predictions()

    print("\n📊 예측 결과:")
    for dept, data in predictions.items():
        if isinstance(data, dict) and 'error' not in data:
            print(f"\n부서: {dept}")
            print(f"  - 현재 대기시간: {data.get('current_wait', 0)}분")
            print(f"  - 예측 대기시간: {data.get('predicted_wait', 0)}분")
            print(f"  - 혼잡도: {data.get('congestion', 0):.2f}")
            print(f"  - 추세: {data.get('trend', 'unknown')}")
        elif 'error' in data:
            print(f"\n부서: {dept} - 오류: {data['error']}")

except Exception as e:
    print(f"\n❌ 오류 발생: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("테스트 완료")
print("=" * 60)
