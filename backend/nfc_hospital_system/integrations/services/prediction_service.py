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
    DEPARTMENT_LIST = [
        '내과', '외과', '정형외과', '신경과', '산부인과',
        '소아청소년과', '이비인후과', '안과', '피부과', '비뇨의학과',
        'X-ray실', 'CT실', 'MRI실', '초음파실'
    ]

    @staticmethod
    def get_recent_data_for_prediction(department):
        """최근 데이터를 가져와 모델 입력 형태로 변환"""
        try:
            # 모델 입력 shape 확인 - 새 모델은 15개 특징 사용
            num_features = 15  # 모델이 기대하는 고정된 특징 수 (3 + 12 부서)
            num_timesteps = 12  # 최근 1시간 (5분 간격 * 12 = 60분)

            # 최근 1시간의 데이터를 5분 간격으로 수집
            current_time = timezone.now()
            input_data = []

            for i in range(num_timesteps):
                # 각 시간대별로 데이터 수집
                time_point = current_time - timedelta(minutes=i*5)

                # 해당 시간대의 대기 인원 수 (더 넓은 범위로 조회)
                waiting_count = Queue.objects.filter(
                    exam__department=department,
                    state__in=['waiting', 'called'],
                    created_at__lte=time_point
                ).exclude(
                    state__in=['completed', 'cancelled', 'no_show']
                ).count()

                # 특징 벡터 생성 (정확히 17개)
                features = []

                # 기본 특징 3개
                features.append(time_point.hour / 24.0)  # 시간 (0-1)
                features.append(time_point.weekday() / 6.0)  # 요일 (0-1)
                features.append(min(waiting_count / 20.0, 1.0))  # 대기 인원 (0-1)

                # 부서 특징 12개 (학습 시와 동일한 원핫 인코딩, 처음 12개 부서만 사용)
                # 학습에 사용된 12개 부서만 처리
                train_departments = PredictionService.DEPARTMENT_LIST[:12]  # 처음 12개만

                if department in train_departments:
                    dept_idx = train_departments.index(department)
                else:
                    dept_idx = 0  # 알 수 없는 부서는 첫 번째로 매핑

                for j in range(12):  # 12개 부서 원핫 인코딩
                    if j == dept_idx:
                        features.append(1.0)
                    else:
                        features.append(0.0)

                # 정확히 15개 특징 확인 (3 + 12 = 15)
                assert len(features) == 15, f"Feature count mismatch: {len(features)} != 15"

                input_data.append(features)

            # 시간 순서를 반대로 (과거 → 현재)
            input_data.reverse()

            # numpy 배열로 변환하고 shape 조정
            input_array = np.array(input_data, dtype=np.float32)
            input_array = input_array.reshape(1, num_timesteps, num_features)

            return input_array

        except Exception as e:
            logger.error(f"Error creating input data for {department}: {e}")
            logger.error(f"Department: {department}, Time: {timezone.now()}")
            # 오류 발생 시 기본값 반환 (15개 특징)
            return np.zeros((1, 12, 15), dtype=np.float32)

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
                    logger.debug(f"Input shape for {dept}: {input_data.shape}")

                    future = predictor.predict(input_data)

                    if 'error' in future:
                        logger.warning(f"Model returned error for {dept}: {future['error']}")
                        # 부서별 기본 대기시간 사용
                        dept_defaults = {
                            '내과': 35, '외과': 25, 'X-ray실': 10, 'MRI실': 45,
                            'CT실': 20, '초음파실': 15
                        }
                        predicted_wait = dept_defaults.get(dept, 20)
                        congestion = min(predicted_wait / 60.0, 1.0)
                    else:
                        predicted_wait = future.get('predicted_wait_time', current_wait_time)
                        congestion = future.get('congestion_level', 0.5)
                        logger.debug(f"Prediction for {dept}: {predicted_wait}분, congestion: {congestion}")

                except Exception as model_error:
                    logger.warning(f"Model prediction failed for {dept}: {model_error}")
                    # 모델 예측 실패 시 부서별 기본값 사용
                    dept_defaults = {
                        '내과': 35, '외과': 25, 'X-ray실': 10, 'MRI실': 45,
                        'CT실': 20, '초음파실': 15
                    }
                    predicted_wait = dept_defaults.get(dept, current_wait_time if current_wait_time > 0 else 20)
                    congestion = min(predicted_wait / 60.0, 1.0)

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