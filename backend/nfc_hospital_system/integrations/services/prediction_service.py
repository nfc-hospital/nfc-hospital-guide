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
    @staticmethod
    def get_recent_data_for_prediction(department):
        """최근 데이터를 가져와 모델 입력 형태로 변환"""
        try:
            # 모델 입력 shape 확인 - 고정된 17개 특징
            num_features = 17  # 모델이 기대하는 고정된 특징 수
            num_timesteps = 12  # 최근 1시간 (5분 간격 * 12 = 60분)

            # 최근 1시간의 데이터를 5분 간격으로 수집
            current_time = timezone.now()
            input_data = []

            for i in range(num_timesteps):
                # 각 시간대별로 데이터 수집
                time_point = current_time - timedelta(minutes=i*5)

                # 해당 시간대의 대기 인원 수
                waiting_count = Queue.objects.filter(
                    exam__department=department,
                    state__in=['waiting', 'called'],
                    created_at__lte=time_point,
                    updated_at__gte=time_point - timedelta(minutes=5)
                ).count()

                # 특징 벡터 생성 (정확히 17개)
                features = []

                # 기본 특징 3개
                features.append(time_point.hour / 24.0)  # 시간 (0-1)
                features.append(time_point.weekday() / 6.0)  # 요일 (0-1)
                features.append(min(waiting_count / 20.0, 1.0))  # 대기 인원 (0-1)

                # 부서 특징 14개 (모델이 기대하는 수만큼)
                # 부서 해시를 사용하여 일관성 있게 인코딩
                dept_hash = hash(department) % 14
                for j in range(14):
                    if j == dept_hash:
                        features.append(1.0)
                    else:
                        features.append(0.0)

                # 정확히 17개 특징 확인
                assert len(features) == 17, f"Feature count mismatch: {len(features)} != 17"

                input_data.append(features)

            # 시간 순서를 반대로 (과거 → 현재)
            input_data.reverse()

            # numpy 배열로 변환하고 shape 조정
            input_array = np.array(input_data, dtype=np.float32)
            input_array = input_array.reshape(1, num_timesteps, num_features)

            return input_array

        except Exception as e:
            logger.error(f"Error creating input data for {department}: {e}")
            # 오류 발생 시 기본값 반환
            return np.zeros((1, 12, 17), dtype=np.float32)

    @staticmethod
    def get_predictions(timeframe='30min'):
        """부서별 대기시간 예측"""
        cache_key = f"predictions:{timezone.now().strftime('%Y%m%d%H%M')[:12]}"
        cached = cache.get(cache_key)

        if cached:
            return cached

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
                    future = predictor.predict(input_data)
                    predicted_wait = future.get('predicted_wait_time', 0)
                    congestion = future.get('congestion_level', 0.0)
                except Exception as model_error:
                    logger.warning(f"Model prediction failed for {dept}: {model_error}")
                    # 모델 예측 실패 시 기본값 사용
                    predicted_wait = current_wait_time
                    congestion = 0.5

                predictions[dept] = {
                    'current_wait': round(current_wait_time),
                    'predicted_wait': predicted_wait,
                    'congestion': round(congestion, 2),
                    'trend': 'up' if predicted_wait > current_wait_time else 'down'
                }

                # 예측 결과 로깅
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