from django.core.cache import cache
from django.utils import timezone
from django.db.models import Avg, Count
from p_queue.models import Queue
from appointments.models import Exam
from .model_loader import predictor
from ..models import PredictionLog
import numpy as np
import logging

logger = logging.getLogger(__name__)


class PredictionService:
    @staticmethod
    def get_recent_data_for_prediction(department):
        """최근 데이터를 가져와 모델 입력 형태로 변환"""
        # 이 함수는 실제 운영 시 DB에서 최근 1시간(12개 타임스텝) 데이터를 가져와
        # 모델 학습 때와 동일한 전처리(스케일링, 원-핫 인코딩 등)를 수행해야 함
        # 현재는 더미 데이터를 생성하여 반환 (입력 shape: 1, 12, 17)
        # 17 = 3 (hour, weekday, patient_count) + 14 (one-hot encoded departments) -> 실제 프로젝트의 특징 수에 맞춰야 함

        # TODO: 실제 데이터 추출 로직 구현 필요
        num_features = predictor.input_details[0]['shape'][-1]
        return np.random.rand(1, 12, num_features).astype(np.float32)

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

                # LSTM 예측
                input_data = PredictionService.get_recent_data_for_prediction(dept)
                future = predictor.predict(input_data)
                predicted_wait = future.get('predicted_wait_time', 0)
                congestion = future.get('congestion_level', 0.0)

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