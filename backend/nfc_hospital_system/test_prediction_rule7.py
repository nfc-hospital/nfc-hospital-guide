#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')
django.setup()

from integrations.services.prediction_service import PredictionService

print('=' * 70)
print('AI 예측 정확도 테스트 (Rule 7 적용 후)')
print('=' * 70)

predictions = PredictionService.get_predictions(timeframe='30min')

print('\n[1] 30분 전 AI 예측 vs 실제 현재 대기시간 (프론트엔드 화면):')
header1 = f"{'부서':<20} {'30분전예측':>10} {'실제현재':>10} {'오차':>10} {'정확도':>8}"
print(header1)
print('-' * 70)

past_errors = []
past_count = 0

for dept, pred in sorted(predictions.items()):
    if 'error' not in pred:
        current = int(pred.get('current_wait', 0))
        past_pred = pred.get('past_prediction')  # 30분 전 예측값

        if past_pred is not None:
            past_pred = int(past_pred)
            past_diff = current - past_pred  # 실제 - 예측
            past_errors.append(abs(past_diff))
            past_count += 1

            diff_sign = '+' if past_diff >= 0 else ''
            accuracy = 'X' if abs(past_diff) > 10 else 'O' if abs(past_diff) <= 5 else '△'
            print(f'{dept:<20} {past_pred:>7}분 {current:>9}분 {diff_sign}{past_diff:>8}분 {accuracy:>10}')
        else:
            print(f'{dept:<20} {"N/A":>7}   {current:>9}분 {"N/A":>10}   -')

if past_count > 0:
    avg_past_error = sum(past_errors) / len(past_errors)
    print(f'\n   30분 전 예측 평균 오차: {avg_past_error:.1f}분')
else:
    print('\n   30분 전 예측 데이터 없음 (로그 축적 필요)')

print('\n' + '=' * 70)
print('\n[2] 현재 -> 30분 후 예측 (지금 AI가 예측하는 값):')
header2 = f"{'부서':<20} {'현재(24h)':>10} {'30분예측':>10} {'차이':>10} {'신뢰도':>8}"
print(header2)
print('-' * 70)

total_current = 0
total_predicted = 0
count = 0
errors = []

for dept, pred in sorted(predictions.items()):
    if 'error' not in pred:
        current = int(pred.get('current_wait', 0))
        predicted = int(pred.get('predicted_wait', 0))
        diff = predicted - current
        confidence = pred.get('hybrid', {}).get('confidence', 0.0)

        total_current += current
        total_predicted += predicted
        count += 1
        errors.append(abs(diff))

        diff_sign = '+' if diff >= 0 else ''
        print(f'{dept:<20} {current:>7}분 {predicted:>9}분 {diff_sign}{diff:>8}분 {confidence:>10.2f}')

if count > 0:
    avg_current = total_current / count
    avg_predicted = total_predicted / count
    avg_error = sum(errors) / len(errors)

    print('\n통계:')
    print(f'   평균 현재 대기시간 (24h): {avg_current:.1f}분')
    print(f'   평균 30분 후 예측: {avg_predicted:.1f}분')
    print(f'   Hybrid 적용: {count}/{len(predictions)}개 부서')

    if avg_error <= 5:
        status = '우수 (오차 5분 이내)'
    elif avg_error <= 10:
        status = '양호 (오차 10분 이내)'
    else:
        status = '개선 필요 (오차 10분 초과)'

    print(f'   평균 오차: {avg_error:.1f}분 - {status}')
else:
    print('예측 데이터 없음')

print('=' * 70)
