"""
HybridCongestion 알고리즘을 위한 실시간 Queue 데이터 수집 모듈

실시간 대기열 상태, 우선순위 분포, 상태 전환 속도 등을 수집하여
LSTM 예측에 보정 정보를 제공합니다.
"""

from django.db.models import Avg, Count, Q, F
from django.utils import timezone
from datetime import timedelta
from p_queue.models import Queue, QueueStatusLog
from appointments.models import Exam
import logging

logger = logging.getLogger(__name__)


class HybridMetricsCollector:
    """실시간 Queue 데이터 수집 및 패턴 분석"""

    @staticmethod
    def get_real_time_queue_metrics(department):
        """
        특정 부서의 실시간 대기열 메트릭 수집

        Args:
            department (str): 부서명 (예: '내과', 'CT실')

        Returns:
            dict: 실시간 대기열 메트릭
        """
        try:
            # 해당 부서의 검사 목록
            exam_instances = Exam.objects.filter(
                department=department,
                is_active=True
            )

            if not exam_instances.exists():
                logger.warning(f"No active exams found for department: {department}")
                return HybridMetricsCollector._get_default_metrics()

            now = timezone.now()

            # 1. 대기 중인 환자 수
            waiting_count = Queue.objects.filter(
                exam__in=exam_instances,
                state='waiting'
            ).count()

            # 2. 호출된 환자 수
            called_count = Queue.objects.filter(
                exam__in=exam_instances,
                state='called'
            ).count()

            # 3. 진행 중인 환자 수
            in_progress_count = Queue.objects.filter(
                exam__in=exam_instances,
                state='in_progress'
            ).count()

            # 4. 우선순위별 분포
            priority_dist = Queue.objects.filter(
                exam__in=exam_instances,
                state__in=['waiting', 'called']
            ).values('priority').annotate(count=Count('queue_id'))

            priority_distribution = {
                'normal': 0,
                'urgent': 0,
                'emergency': 0,
                'total': 0
            }
            for item in priority_dist:
                priority_distribution[item['priority']] = item['count']
                priority_distribution['total'] += item['count']

            # 5. 최근 2시간 노쇼 건수
            recent_no_shows = Queue.objects.filter(
                exam__in=exam_instances,
                state='no_show',
                updated_at__gte=now - timedelta(hours=2)
            ).count()

            # 6. 최근 1시간 완료 건수
            recent_completions = Queue.objects.filter(
                exam__in=exam_instances,
                state='completed',
                updated_at__gte=now - timedelta(hours=1)
            ).count()

            # 7. 평균 검사 시간 (Exam 테이블 기준)
            avg_exam_duration = exam_instances.aggregate(
                avg=Avg('average_duration')
            )['avg'] or 15  # 기본값 15분

            # 8. 최근 완료된 검사들의 실제 소요 시간 (Queue 테이블에서 계산)
            recent_completed_queues = Queue.objects.filter(
                exam__in=exam_instances,
                state='completed',
                updated_at__gte=now - timedelta(hours=1),
                called_at__isnull=False  # called_at이 있어야 시간 계산 가능
            )

            # 실제 소요 시간 계산 (called_at부터 updated_at까지)
            actual_durations = []
            for queue in recent_completed_queues:
                if queue.called_at:
                    duration = (queue.updated_at - queue.called_at).total_seconds() / 60.0
                    if 0 < duration < 180:  # 0~180분 사이만 유효
                        actual_durations.append(duration)

            recent_avg_duration = (
                sum(actual_durations) / len(actual_durations)
                if actual_durations
                else avg_exam_duration
            )

            # 9. 평균 대기 시간 (estimated_wait_time 기준)
            avg_wait_time = Queue.objects.filter(
                exam__in=exam_instances,
                state='waiting'
            ).aggregate(avg=Avg('estimated_wait_time'))['avg'] or 0

            metrics = {
                'waiting_count': waiting_count,
                'called_count': called_count,
                'in_progress_count': in_progress_count,
                'priority_distribution': priority_distribution,
                'recent_no_shows': recent_no_shows,
                'recent_completions': recent_completions,
                'avg_exam_duration': round(avg_exam_duration, 1),
                'recent_avg_duration': round(recent_avg_duration, 1),
                'avg_wait_time': round(avg_wait_time, 1),
                'total_active_patients': waiting_count + called_count + in_progress_count,
            }

            return metrics

        except Exception as e:
            logger.error(f"Error collecting metrics for {department}: {e}")
            return HybridMetricsCollector._get_default_metrics()

    @staticmethod
    def get_transition_rates(department):
        """
        상태 전환 속도 분석 (호출 속도, 완료 속도)

        Args:
            department (str): 부서명

        Returns:
            dict: 상태 전환 속도 메트릭
        """
        try:
            now = timezone.now()
            recent_window = now - timedelta(minutes=30)

            # 해당 부서의 검사 ID 목록
            exam_ids = Exam.objects.filter(
                department=department,
                is_active=True
            ).values_list('exam_id', flat=True)

            # 최근 30분간 'waiting' → 'called' 전환 횟수
            recent_calls = QueueStatusLog.objects.filter(
                queue__exam_id__in=exam_ids,
                new_state='called',
                created_at__gte=recent_window
            ).count()

            # 최근 30분간 'in_progress' → 'completed' 전환 횟수
            recent_completions = QueueStatusLog.objects.filter(
                queue__exam_id__in=exam_ids,
                new_state='completed',
                created_at__gte=recent_window
            ).count()

            # 분당 호출 속도
            call_rate_per_minute = recent_calls / 30.0 if recent_calls > 0 else 0

            # 분당 완료 속도
            completion_rate_per_minute = recent_completions / 30.0 if recent_completions > 0 else 0

            # 과거 동일 시간대 평균 (같은 요일, 같은 시간대)
            hour = now.hour
            weekday = now.weekday()

            historical_calls = QueueStatusLog.objects.filter(
                queue__exam_id__in=exam_ids,
                new_state='called',
                created_at__hour=hour,
                created_at__week_day=weekday + 1  # Django week_day는 1(일요일)부터 시작
            ).count()

            # 평균 시간당 호출 수 추정
            historical_call_rate = historical_calls / 60.0 if historical_calls > 0 else 0.1

            transition_rates = {
                'recent_call_rate': round(call_rate_per_minute, 2),
                'recent_completion_rate': round(completion_rate_per_minute, 2),
                'historical_call_rate': round(historical_call_rate, 2),
                'is_busier_than_expected': call_rate_per_minute > historical_call_rate * 1.5,
                'is_slower_than_expected': call_rate_per_minute < historical_call_rate * 0.5,
            }

            return transition_rates

        except Exception as e:
            logger.error(f"Error calculating transition rates for {department}: {e}")
            return {
                'recent_call_rate': 0.0,
                'recent_completion_rate': 0.0,
                'historical_call_rate': 0.1,
                'is_busier_than_expected': False,
                'is_slower_than_expected': False,
            }

    @staticmethod
    def get_day_of_week_factor(current_time=None):
        """
        요일별 혼잡도 가중치

        Args:
            current_time (datetime): 기준 시간 (기본값: 현재)

        Returns:
            float: 요일별 가중치 (0.65 ~ 1.3)
        """
        if current_time is None:
            current_time = timezone.now()

        weekday = current_time.weekday()

        # 요일별 혼잡도 패턴 (실제 병원 데이터 기반)
        weekday_factors = {
            0: 1.3,   # 월요일 (가장 붐빔)
            1: 1.0,   # 화요일
            2: 1.0,   # 수요일
            3: 1.1,   # 목요일
            4: 0.9,   # 금요일
            5: 0.7,   # 토요일
            6: 0.65,  # 일요일 (가장 한산)
        }

        return weekday_factors.get(weekday, 1.0)

    @staticmethod
    def _get_default_metrics():
        """데이터 수집 실패 시 기본값 반환"""
        return {
            'waiting_count': 0,
            'called_count': 0,
            'in_progress_count': 0,
            'priority_distribution': {
                'normal': 0,
                'urgent': 0,
                'emergency': 0,
                'total': 0
            },
            'recent_no_shows': 0,
            'recent_completions': 0,
            'avg_exam_duration': 15.0,
            'recent_avg_duration': 15.0,
            'avg_wait_time': 0.0,
            'total_active_patients': 0,
        }
