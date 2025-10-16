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
        """최근 데이터를 가져와 모델 입력 형태로 변환 (실제 DB 데이터 사용)"""
        try:
            # 모델 입력 shape 확인 - 모델은 11개 특징 사용
            num_features = 11  # 모델이 기대하는 고정된 특징 수 (3 + 8 부서)
            num_timesteps = 12  # 최근 1시간 (5분 간격 * 12 = 60분)

            # 최근 1시간의 데이터를 5분 간격으로 수집
            current_time = timezone.now()
            input_data = []

            # 부서별 기본값 (fallback용)
            dept_defaults = {
                '내과': 25.1,
                '정형외과': 18.5,
                '진단검사의학과': 11.0,
                'X-ray실': 7.3,
                'CT실': 22.0,
                'MRI실': 33.6,
                '영상의학과': 14.4
            }
            default_wait = dept_defaults.get(department, 15.0)

            logger.debug(f"[RealData] Fetching actual Queue data for {department}")

            for i in range(num_timesteps):
                # 각 시간대별로 실제 DB 데이터 조회
                time_point = current_time - timedelta(minutes=i*5)

                # ±2.5분 범위의 Queue 데이터 조회 (5분 간격 중심)
                time_start = time_point - timedelta(minutes=2.5)
                time_end = time_point + timedelta(minutes=2.5)

                # 실제 DB에서 해당 시간대 Queue 조회
                queues_at_time = Queue.objects.filter(
                    exam__department=department,
                    created_at__range=[time_start, time_end]
                )

                # 대기시간 계산
                if queues_at_time.exists():
                    # 실제 DB의 평균 대기시간 사용
                    avg_wait = queues_at_time.aggregate(
                        avg=Avg('estimated_wait_time')
                    )['avg'] or default_wait

                    waiting_count = queues_at_time.filter(state='waiting').count()

                    logger.debug(f"[RealData] {time_point.strftime('%H:%M')} - {queues_at_time.count()}개 큐, 평균 {avg_wait:.1f}분")
                else:
                    # 데이터 없으면 인접 시간대 확인 (±10분)
                    nearby_queues = Queue.objects.filter(
                        exam__department=department,
                        created_at__range=[time_point - timedelta(minutes=10), time_point + timedelta(minutes=10)]
                    )

                    if nearby_queues.exists():
                        avg_wait = nearby_queues.aggregate(avg=Avg('estimated_wait_time'))['avg'] or default_wait
                        logger.debug(f"[RealData] {time_point.strftime('%H:%M')} - 인접 데이터 사용: {avg_wait:.1f}분")
                    else:
                        # 완전히 데이터 없으면 부서 평균 사용
                        avg_wait = default_wait
                        logger.debug(f"[RealData] {time_point.strftime('%H:%M')} - 기본값 사용: {avg_wait:.1f}분")

                # 대기시간 정규화 (5~120분 범위)
                waiting_time = max(5, min(avg_wait, 120))

                # 특징 벡터 생성 (정확히 11개)
                features = []

                # 기본 특징 3개
                features.append(time_point.hour / 24.0)  # 시간 (0-1)
                features.append(time_point.weekday() / 6.0)  # 요일 (0-1)
                features.append(min(waiting_time / 60.0, 1.0))  # 대기 시간을 정규화 (0-1, 60분 기준)

                # 부서 특징 8개 (모델이 기대하는 원핫 인코딩)
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

            logger.info(f"[RealData] {department} LSTM input created from real DB data")
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
                # 현재 대기 시간 (최근 24시간 데이터만 사용)
                now = timezone.now()
                cutoff_time = now - timedelta(hours=24)

                # 최근 24시간 내 waiting 큐만 조회
                waiting_queues = Queue.objects.filter(
                    exam__department=dept,
                    state='waiting',
                    created_at__gte=cutoff_time
                )

                waiting_count = waiting_queues.count()

                if waiting_count > 0:
                    # 실제 estimated_wait_time 평균 사용
                    avg_estimated = waiting_queues.aggregate(
                        avg=Avg('estimated_wait_time')
                    )['avg'] or 0

                    current_wait_time = round(avg_estimated)

                    logger.debug(f"[CurrentWait] {dept}: {waiting_count}명 대기 (최근 24h), 평균 {avg_estimated:.1f}분")
                else:
                    # 대기 인원 없으면 0
                    current_wait_time = 0
                    logger.debug(f"[CurrentWait] {dept}: 대기 인원 없음 (최근 24h)")

                # LSTM 예측 (try-except로 모델 오류 처리)
                try:
                    input_data = PredictionService.get_recent_data_for_prediction(dept)
                    logger.debug(f"Input shape for {dept}: {input_data.shape}")

                    future = predictor.predict(input_data)

                    if 'error' in future:
                        logger.warning(f"Model returned error for {dept}: {future['error']}")
                        # 부서별 기본 대기시간 사용 (실제 데이터 기반)
                        dept_defaults = {
                            '내과': 35, '정형외과': 25, '진단검사의학과': 15,
                            'X-ray실': 10, 'MRI실': 45, 'CT실': 30
                        }
                        predicted_wait_30min = dept_defaults.get(dept, 20)
                        congestion = min(predicted_wait_30min / 60.0, 1.0)
                    else:
                        predicted_wait_30min = future.get('predicted_wait_time', current_wait_time)
                        congestion = future.get('congestion_level', 0.5)
                        logger.debug(f"LSTM base prediction for {dept}: {predicted_wait_30min}분, congestion: {congestion}")

                    # HybridCongestion Algorithm (30min predictions only)
                    if target_minutes == 30:
                        try:
                            from .hybrid_congestion import HybridCongestionAlgorithm
                            hybrid_result = HybridCongestionAlgorithm.apply_all_corrections(
                                lstm_prediction=predicted_wait_30min,
                                department=dept,
                                current_time=timezone.now(),
                                current_wait_time=current_wait_time  # Rule 7을 위해 현재 대기시간 전달
                            )
                            lstm_base = hybrid_result['lstm_base']
                            predicted_wait_30min = hybrid_result['corrected_wait_time']
                            hybrid_confidence = hybrid_result['confidence']
                            hybrid_corrections = hybrid_result['corrections']
                            applied_rules = hybrid_result['applied_rules']
                            correction_pct = ((predicted_wait_30min - lstm_base) / lstm_base * 100) if lstm_base > 0 else 0
                            logger.info(f"[HybridAlgorithm] {dept} | LSTM: {lstm_base:.1f}min -> Hybrid: {predicted_wait_30min:.1f}min ({correction_pct:+.1f}%) | Rules: {len(applied_rules)}/6 | Confidence: {hybrid_confidence:.2f}")
                        except Exception as hybrid_error:
                            logger.warning(f"[HybridAlgorithm] {dept} | ERROR: {str(hybrid_error)[:50]} | Fallback: Pure LSTM")
                            hybrid_confidence = 0.70
                            hybrid_corrections = {}
                            applied_rules = []

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
                    # 모델 예측 실패 시 부서별 기본값 사용 (실제 데이터 기반)
                    dept_defaults = {
                        '내과': 35, '정형외과': 25, '진단검사의학과': 15,
                        'X-ray실': 10, 'MRI실': 45, 'CT실': 30
                    }
                    base_wait = dept_defaults.get(dept, current_wait_time if current_wait_time > 0 else 20)
                    # 시간대별 스케일링
                    predicted_wait = round(base_wait * (target_minutes / 30.0))
                    congestion = min(predicted_wait / 60.0, 1.0)

                # 과거 예측 데이터 조회 (30분 전 예측)
                past_prediction_value = None
                try:
                    past_log = PredictionLog.objects.filter(
                        department=dept,
                        timestamp__range=[now - timedelta(minutes=35), now - timedelta(minutes=25)]
                    ).order_by('-timestamp').first()

                    if past_log:
                        past_prediction_value = round(past_log.predicted_wait_time)
                        logger.debug(f"[PastPrediction] {dept}: {past_prediction_value}min (30min ago)")
                except Exception as log_error:
                    logger.debug(f"[PastPrediction] {dept}: No data available")

                # 하이브리드 정보 추가 (30분 예측일 때만)
                prediction_dict = {
                    'current_wait': round(current_wait_time),
                    'predicted_wait': predicted_wait,
                    'past_prediction': past_prediction_value,  # ← 30분 전 AI 예측값 추가
                    'congestion': round(congestion, 2),
                    'trend': 'up' if predicted_wait > current_wait_time else 'down',
                    'timeframe': timeframe,
                    'target_minutes': target_minutes
                }

                # 하이브리드 알고리즘 적용 시 추가 정보
                if target_minutes == 30 and 'hybrid_confidence' in locals():
                    prediction_dict['hybrid'] = {
                        'confidence': hybrid_confidence,
                        'corrections': hybrid_corrections,
                        'applied_rules': applied_rules,
                        'is_hybrid': len(applied_rules) > 0
                    }

                predictions[dept] = prediction_dict

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

        # 예측 세션 요약 통계 (30분 예측일 때만)
        if target_minutes == 30 and predictions:
            PredictionService._log_prediction_summary(predictions)

        cache.set(cache_key, predictions, 300)  # 5분 캐싱
        return predictions

    @staticmethod
    def _log_prediction_summary(predictions):
        """예측 세션 요약 통계 출력"""
        try:
            total_depts = len(predictions)
            hybrid_count = 0
            total_confidence = 0
            corrections = []

            for dept, pred in predictions.items():
                if 'error' not in pred and 'hybrid' in pred:
                    hybrid_count += 1
                    total_confidence += pred['hybrid']['confidence']

                    # 보정률 계산 (LSTM base vs Hybrid corrected)
                    if pred['hybrid'].get('is_hybrid') and pred['hybrid'].get('corrections'):
                        # corrections dict에서 correction_factor 찾기
                        # 또는 predicted_wait / current_wait 비율 사용
                        current = pred.get('current_wait', 0)
                        predicted = pred.get('predicted_wait', 0)

                        if current > 0:
                            # (예측값 - 현재값) / 현재값 * 100
                            correction_pct = ((predicted - current) / current * 100)
                            corrections.append(correction_pct)

            avg_confidence = (total_confidence / hybrid_count) if hybrid_count > 0 else 0
            avg_correction = (sum(corrections) / len(corrections)) if corrections else 0

            logger.info("=" * 60)
            logger.info("[PredictionService] Session Summary")
            logger.info("=" * 60)
            logger.info(f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info(f"Total Departments: {total_depts}")
            if total_depts > 0:
                logger.info(f"Hybrid Algorithm Applied: {hybrid_count}/{total_depts} ({hybrid_count/total_depts*100:.0f}%)")
            else:
                logger.info("Hybrid Algorithm Applied: 0/0")
            logger.info(f"Average Confidence: {avg_confidence:.2f}")
            logger.info(f"Average Correction: {avg_correction:+.1f}%")
            logger.info(f"Cache TTL: 300s")
            logger.info("=" * 60)

        except Exception as e:
            logger.debug(f"Failed to generate prediction summary: {e}")

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