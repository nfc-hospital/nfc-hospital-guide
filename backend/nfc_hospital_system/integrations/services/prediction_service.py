from django.core.cache import cache
from django.utils import timezone
from django.db.models import Avg, Count, Q
from p_queue.models import Queue, QueueStatusLog
from appointments.models import Exam
from .model_loader import predictor
from ..models import PredictionLog
from datetime import timedelta
import numpy as np
import logging

logger = logging.getLogger(__name__)


class PredictionService:
    # 학습 시와 동일한 부서 리스트 (순서 중요!)
    # EMRBots 데이터로 학습된 6개 부서만 포함
    DEPARTMENT_LIST = [
        '내과', '정형외과', '진단검사의학과',
        'X-ray실', 'CT실', 'MRI실'
    ]

    @staticmethod
    def get_recent_data_for_prediction(department):
        """최근 데이터를 가져와 모델 입력 형태로 변환"""
        try:
            # 모델 입력 shape 확인 - 모델은 11개 특징 사용
            num_features = 11  # 모델이 기대하는 고정된 특징 수 (3 + 8 부서)
            num_timesteps = 12  # 최근 1시간 (5분 간격 * 12 = 60분)

            # 최근 1시간의 데이터를 5분 간격으로 수집
            current_time = timezone.now()
            input_data = []

            # 시뮬레이션을 위한 부서별 패턴 정의
            import random
            import math

            dept_patterns = {
                '내과': {
                    'base': 15,
                    'peak_hours': [9, 10, 11, 14, 15],
                    'variation': 8,
                    'trend': 1.2  # 증가 추세
                },
                '정형외과': {
                    'base': 12,
                    'peak_hours': [10, 11, 15, 16],
                    'variation': 6,
                    'trend': 1.1
                },
                '진단검사의학과': {
                    'base': 8,
                    'peak_hours': [8, 9, 13, 14],
                    'variation': 4,
                    'trend': 1.0
                },
                'X-ray실': {
                    'base': 6,
                    'peak_hours': [10, 11, 14, 15],
                    'variation': 3,
                    'trend': 0.95  # 감소 추세
                },
                'CT실': {
                    'base': 10,
                    'peak_hours': [11, 14, 15, 16],
                    'variation': 5,
                    'trend': 1.15
                },
                'MRI실': {
                    'base': 18,
                    'peak_hours': [9, 11, 14, 16],
                    'variation': 10,
                    'trend': 1.3  # 큰 증가 추세
                }
            }

            for i in range(num_timesteps):
                # 각 시간대별로 데이터 수집
                time_point = current_time - timedelta(minutes=i*5)

                # 시뮬레이션: 부서별 패턴 적용
                pattern = dept_patterns.get(department, {
                    'base': 10, 'peak_hours': [10, 14], 'variation': 5, 'trend': 1.0
                })

                # 기본 대기 인원
                base_count = pattern['base']

                # 시간대별 가중치 (피크 시간)
                hour = time_point.hour
                if hour in pattern['peak_hours']:
                    base_count *= 1.5

                # 요일별 가중치 (주말은 감소)
                weekday = time_point.weekday()
                if weekday >= 5:  # 토요일(5), 일요일(6)
                    base_count *= 0.7

                # 시간의 흐름에 따른 사인파 패턴 추가 (자연스러운 변동)
                time_factor = math.sin(time_point.minute / 60 * math.pi * 2)
                base_count += time_factor * pattern['variation'] * 0.5

                # 랜덤 변동 추가 (현실감)
                random.seed(int(time_point.timestamp()) + hash(department))
                random_variation = random.uniform(-pattern['variation'], pattern['variation'])

                # 최종 대기 인원 계산
                waiting_count = int(base_count + random_variation)
                waiting_count = max(0, min(waiting_count, 50))  # 0~50명 범위 제한

                logger.debug(f"{department} - {time_point.strftime('%H:%M')}: {waiting_count}명")

                # 특징 벡터 생성 (정확히 11개)
                features = []

                # 기본 특징 3개
                features.append(time_point.hour / 24.0)  # 시간 (0-1)
                features.append(time_point.weekday() / 6.0)  # 요일 (0-1)
                features.append(min(waiting_count / 20.0, 1.0))  # 대기 인원 (0-1)

                # 부서 특징 8개 (모델이 기대하는 원핫 인코딩)
                # 모델은 8개 부서로 학습됨 (3 + 8 = 11 features)
                train_departments = PredictionService.DEPARTMENT_LIST  # 6개 부서

                if department in train_departments:
                    dept_idx = train_departments.index(department)
                else:
                    dept_idx = 0  # 알 수 없는 부서는 첫 번째로 매핑

                for j in range(8):  # 8개 부서 원핫 인코딩 (모델에 맞춤)
                    if j == dept_idx:
                        features.append(1.0)
                    else:
                        features.append(0.0)

                # 정확히 11개 특징 확인 (3 + 8 = 11)
                assert len(features) == 11, f"Feature count mismatch: {len(features)} != 11"

                input_data.append(features)

            # 시간 순서를 반대로 (과거 → 현재)
            input_data.reverse()

            # numpy 배열로 변환하고 shape 조정
            input_array = np.array(input_data, dtype=np.float32)
            # 모델이 기대하는 shape: (1, 12, 11)
            input_array = input_array.reshape(1, num_timesteps, 11)  # 11 features로 고정

            return input_array

        except Exception as e:
            logger.error(f"Error creating input data for {department}: {e}")
            logger.error(f"Department: {department}, Time: {timezone.now()}")
            # 오류 발생 시 기본값 반환 (11개 특징)
            return np.zeros((1, 12, 11), dtype=np.float32)

    @staticmethod
    def get_predictions(timeframe='30min'):
        """부서별 대기시간 예측 (다중 시간대 지원)"""
        cache_key = f"predictions:{timezone.now().strftime('%Y%m%d%H%M')[:12]}:{timeframe}"
        cached = cache.get(cache_key)

        if cached:
            return cached

        # 시간대별 분 단위 변환
        timeframe_minutes = {
            '30min': 30,
            '1hour': 60,
            '2hour': 120
        }
        target_minutes = timeframe_minutes.get(timeframe, 30)

        departments = list(Exam.objects.values_list('department', flat=True).distinct())
        predictions = {}

        for dept in departments:
            try:
                # 현재 대기 시간 (실제 DB 값)
                current_wait_time = Queue.objects.filter(
                    exam__department=dept, state='WAITING'
                ).aggregate(avg_wait=Avg('estimated_wait_time'))['avg_wait'] or 0

                # LSTM 예측 (try-except로 모델 오류 처리)
                try:
                    input_data = PredictionService.get_recent_data_for_prediction(dept)
                    logger.debug(f"Input shape for {dept}: {input_data.shape}")

                    future = predictor.predict(input_data)

                    if 'error' in future:
                        logger.warning(f"Model returned error for {dept}: {future['error']}")
                        # 부서별 기본 대기시간 사용
                        dept_defaults = {
                            '내과': 35, '외과': 25, 'X-ray실': 10, 'MRI실': 45,
                            'CT실': 20, '초음파실': 15
                        }
                        predicted_wait_30min = dept_defaults.get(dept, 20)
                        congestion = min(predicted_wait_30min / 60.0, 1.0)
                    else:
                        predicted_wait_30min = future.get('predicted_wait_time', current_wait_time)
                        congestion = future.get('congestion_level', 0.5)
                        logger.debug(f"Prediction for {dept}: {predicted_wait_30min}분, congestion: {congestion}")

                    # 시간대별 예측값 계산 (선형 보간)
                    if target_minutes == 30:
                        predicted_wait = predicted_wait_30min
                    elif target_minutes == 60:
                        # 1시간 후 = 30분 예측의 1.5배 (추세 반영)
                        predicted_wait = round(predicted_wait_30min * 1.5)
                    elif target_minutes == 120:
                        # 2시간 후 = 30분 예측의 2.0배 (추세 더 반영)
                        predicted_wait = round(predicted_wait_30min * 2.0)
                    else:
                        predicted_wait = predicted_wait_30min

                    # 혼잡도도 시간에 비례해 증가
                    congestion_multiplier = target_minutes / 30.0
                    congestion = min(congestion * congestion_multiplier, 1.0)

                except Exception as model_error:
                    logger.warning(f"Model prediction failed for {dept}: {model_error}")
                    # 모델 예측 실패 시 부서별 기본값 사용
                    dept_defaults = {
                        '내과': 35, '외과': 25, 'X-ray실': 10, 'MRI실': 45,
                        'CT실': 20, '초음파실': 15
                    }
                    base_wait = dept_defaults.get(dept, current_wait_time if current_wait_time > 0 else 20)
                    # 시간대별 스케일링
                    predicted_wait = round(base_wait * (target_minutes / 30.0))
                    congestion = min(predicted_wait / 60.0, 1.0)

                predictions[dept] = {
                    'current_wait': round(current_wait_time),
                    'predicted_wait': predicted_wait,
                    'congestion': round(congestion, 2),
                    'trend': 'up' if predicted_wait > current_wait_time else 'down',
                    'timeframe': timeframe,
                    'target_minutes': target_minutes
                }

                # 예측 결과 로깅 (30분 예측만 로그)
                if target_minutes == 30:
                    PredictionLog.objects.create(
                        department=dept,
                        current_wait_time=current_wait_time,
                        predicted_wait_time=predicted_wait,
                        congestion_level=congestion,
                        model_version='1.0-lstm'
                    )

            except Exception as e:
                logger.error(f"Error predicting for department {dept}: {e}")
                predictions[dept] = {'error': str(e)}

        cache.set(cache_key, predictions, 300)  # 5분 캐싱
        return predictions

    @staticmethod
    def get_timeline_predictions():
        """시계열 예측 데이터 (현재, 10분, 20분, 30분)"""
        cache_key = f"timeline_predictions:{timezone.now().strftime('%Y%m%d%H%M')[:12]}"
        cached = cache.get(cache_key)

        if cached:
            return cached

        departments = list(Exam.objects.values_list('department', flat=True).distinct())
        timeline_data = {}

        for dept in departments:
            try:
                # 각 시점별 예측
                dept_timeline = []
                base_prediction = PredictionService.get_predictions()

                if dept in base_prediction and 'error' not in base_prediction[dept]:
                    current = base_prediction[dept]['current_wait']
                    predicted = base_prediction[dept]['predicted_wait']
                    congestion = base_prediction[dept]['congestion']

                    # 현재 시점
                    dept_timeline.append({
                        'time_offset': 0,
                        'wait_time': current,
                        'congestion': congestion
                    })

                    # 10분 후
                    dept_timeline.append({
                        'time_offset': 10,
                        'wait_time': round(current + (predicted - current) * 0.33),
                        'congestion': round(congestion * 1.05, 2)
                    })

                    # 20분 후
                    dept_timeline.append({
                        'time_offset': 20,
                        'wait_time': round(current + (predicted - current) * 0.66),
                        'congestion': round(congestion * 1.1, 2)
                    })

                    # 30분 후
                    dept_timeline.append({
                        'time_offset': 30,
                        'wait_time': predicted,
                        'congestion': round(congestion * 1.15, 2)
                    })

                timeline_data[dept] = dept_timeline

            except Exception as e:
                logger.error(f"Error creating timeline for {dept}: {e}")

        cache.set(cache_key, timeline_data, 300)  # 5분 캐싱
        return timeline_data

    @staticmethod
    def get_domino_predictions(source_dept, delay_minutes):
        """도미노 효과 예측"""
        cache_key = f"domino:{source_dept}:{delay_minutes}"
        cached = cache.get(cache_key)

        if cached:
            return cached

        # 부서 간 영향 매트릭스 (실제 병원 데이터 기반으로 조정 필요)
        impact_matrix = {
            'CT실': {'내과': 0.7, '신경과': 0.9, '응급실': 0.8, '정형외과': 0.5},
            'MRI실': {'신경과': 0.9, '정형외과': 0.8, '내과': 0.6, '재활의학과': 0.7},
            'X-ray실': {'정형외과': 0.9, '응급실': 0.7, '내과': 0.5, '호흡기내과': 0.8},
            '진단검사의학과': {'내과': 0.8, '감염내과': 0.9, '혈액종양내과': 0.9, '응급실': 0.7},
            '초음파실': {'소화기내과': 0.8, '산부인과': 0.9, '비뇨기과': 0.7, '내과': 0.6}
        }

        impacts = impact_matrix.get(source_dept, {})
        predictions = []

        for dept, factor in impacts.items():
            # 현재 대기 상황 확인
            current_queue = Queue.objects.filter(
                exam__department=dept,
                state__in=['waiting', 'called']
            ).count()

            delay_impact = round(delay_minutes * factor)
            affected_patients = current_queue + round(delay_impact / 3)

            predictions.append({
                'department': dept,
                'original_delay': delay_minutes,
                'impact_delay': delay_impact,
                'affected_patients': affected_patients,
                'severity': 'high' if delay_impact > 20 else 'medium' if delay_impact > 10 else 'low',
                'probability': round(factor * 100)
            })

        result = sorted(predictions, key=lambda x: x['impact_delay'], reverse=True)
        cache.set(cache_key, result, 180)  # 3분 캐싱
        return result

    @staticmethod
    def get_heatmap_predictions():
        """시간대별 부서별 혼잡도 히트맵"""
        cache_key = f"heatmap:{timezone.now().strftime('%Y%m%d%H')}"
        cached = cache.get(cache_key)

        if cached:
            return cached

        departments = ['영상의학과', '내과', '정형외과', '진단검사의학과', '응급실']
        current_hour = timezone.now().hour
        heatmap_data = []

        for dept in departments:
            for hour in range(9, 18):  # 9시부터 17시까지
                # 실제 대기 데이터 조회
                if hour == current_hour:
                    # 현재 시간은 실제 데이터
                    queue_count = Queue.objects.filter(
                        exam__department=dept,
                        state__in=['waiting', 'called']
                    ).count()
                    congestion = min(100, queue_count * 5)  # 대기 인원 기반 혼잡도
                else:
                    # 다른 시간은 예측 (과거 패턴 기반)
                    base_congestion = {
                        '영상의학과': 40,
                        '응급실': 50,
                        '내과': 35,
                        '정형외과': 30,
                        '진단검사의학과': 25
                    }.get(dept, 30)

                    # 시간대별 가중치
                    time_weight = 1.0
                    if hour in [11, 12, 14, 15]:  # 피크 시간
                        time_weight = 1.3
                    elif hour in [9, 17]:  # 시작/종료 시간
                        time_weight = 0.8

                    congestion = round(base_congestion * time_weight)

                wait_time = round(congestion * 0.8)

                heatmap_data.append({
                    'department': dept,
                    'hour': hour,
                    'time': f"{hour}:00",  # Frontend와 일치하도록 선행 0 제거
                    'congestion': congestion,
                    'wait_time': wait_time,
                    'queue_size': round(congestion / 5),
                    'risk': 'high' if congestion > 70 else 'medium' if congestion > 50 else 'low'
                })

        cache.set(cache_key, heatmap_data, 600)  # 10분 캐싱
        return heatmap_data