"""
HybridCongestion 알고리즘: LSTM 예측 + 실시간 Queue 데이터 기반 보정

순수 LSTM 예측에 7가지 규칙 기반 보정을 적용하여 예측 정확도를 향상시킵니다.
"""

from .hybrid_metrics_collector import HybridMetricsCollector
from django.utils import timezone
import logging
import math

logger = logging.getLogger(__name__)


class HybridCongestionAlgorithm:
    """LSTM 예측에 실시간 데이터 기반 보정을 적용하는 하이브리드 알고리즘"""

    # 규칙별 가중치 (튜닝 가능)
    RULE_WEIGHTS = {
        'current_baseline': 0.40,   # 현재값 기준 보정 (가장 중요)
        'queue_length': 0.20,       # 대기 인원 영향력
        'priority': 0.10,           # 우선순위 영향력
        'transition_rate': 0.15,    # 호출 속도 영향력
        'day_of_week': 0.05,        # 요일 패턴 영향력
        'no_show': 0.05,            # 노쇼 영향력
        'completion_velocity': 0.15 # 검사 완료 속도 영향력
    }

    @classmethod
    def apply_all_corrections(cls, lstm_prediction, department, current_time=None, current_wait_time=None):
        """
        모든 보정 규칙을 적용하여 최종 예측값 산출

        Args:
            lstm_prediction (float): LSTM 모델의 원래 예측값 (분 단위)
            department (str): 부서명
            current_time (datetime): 기준 시간 (기본값: 현재)
            current_wait_time (float): 현재 실제 대기시간 (분 단위, Rule 7용)

        Returns:
            dict: {
                'corrected_wait_time': float,  # 보정된 최종 예측값
                'confidence': float,            # 신뢰도 점수 (0-1)
                'corrections': dict,            # 각 규칙별 보정값
                'applied_rules': list           # 적용된 규칙 목록
            }
        """
        if current_time is None:
            current_time = timezone.now()

        try:
            # 실시간 메트릭 수집
            metrics = HybridMetricsCollector.get_real_time_queue_metrics(department)
            transition_rates = HybridMetricsCollector.get_transition_rates(department)

            # 각 규칙별 보정 계수 계산
            corrections = {}
            applied_rules = []

            # RULE 1: Queue Length Adjustment
            queue_factor = cls._rule_queue_length(lstm_prediction, metrics)
            if queue_factor != 1.0:
                corrections['queue_length'] = queue_factor
                applied_rules.append('queue_length')

            # RULE 2: Priority Weighting
            priority_factor = cls._rule_priority_weighting(metrics)
            if priority_factor != 1.0:
                corrections['priority'] = priority_factor
                applied_rules.append('priority')

            # RULE 3: Transition Rate
            transition_factor = cls._rule_transition_rate(transition_rates)
            if transition_factor != 1.0:
                corrections['transition_rate'] = transition_factor
                applied_rules.append('transition_rate')

            # RULE 4: Day of Week
            day_factor = cls._rule_day_of_week(current_time)
            if day_factor != 1.0:
                corrections['day_of_week'] = day_factor
                applied_rules.append('day_of_week')

            # RULE 5: No-Show Impact
            no_show_factor = cls._rule_no_show(metrics)
            if no_show_factor != 1.0:
                corrections['no_show'] = no_show_factor
                applied_rules.append('no_show')

            # RULE 6: Completion Velocity
            velocity_factor = cls._rule_completion_velocity(metrics)
            if velocity_factor != 1.0:
                corrections['completion_velocity'] = velocity_factor
                applied_rules.append('completion_velocity')

            # RULE 7: Current Baseline Adjustment (현재 대기시간 기준 보정)
            if current_wait_time is not None and current_wait_time > 0:
                baseline_factor = cls._rule_current_baseline_adjustment(lstm_prediction, current_wait_time)
                if baseline_factor != 1.0:
                    corrections['current_baseline'] = baseline_factor
                    applied_rules.append('current_baseline')
                    logger.info(f"[Rule7-ACTIVE] {department}: current={current_wait_time:.1f}min, lstm={lstm_prediction:.1f}min, factor={baseline_factor:.2f}")

            # 가중 평균으로 최종 보정 계수 계산
            final_factor = cls._calculate_weighted_factor(corrections)

            # 최종 예측값 계산
            corrected_wait_time = lstm_prediction * final_factor

            # 신뢰도 계산
            confidence = cls._calculate_confidence(
                lstm_prediction,
                corrected_wait_time,
                metrics,
                len(applied_rules)
            )

            # 범위 제한 (5분 ~ 120분)
            corrected_wait_time = max(5, min(corrected_wait_time, 120))

            result = {
                'corrected_wait_time': round(corrected_wait_time, 1),
                'confidence': round(confidence, 2),
                'corrections': corrections,
                'applied_rules': applied_rules,
                'lstm_base': round(lstm_prediction, 1),
                'correction_factor': round(final_factor, 2)
            }

            return result

        except Exception as e:
            logger.error(f"Error in hybrid correction for {department}: {e}")
            # 오류 시 원래 LSTM 예측 반환
            return {
                'corrected_wait_time': round(lstm_prediction, 1),
                'confidence': 0.70,  # 보정 실패 시 낮은 신뢰도
                'corrections': {},
                'applied_rules': [],
                'lstm_base': round(lstm_prediction, 1),
                'correction_factor': 1.0
            }

    @staticmethod
    def _rule_queue_length(lstm_prediction, metrics):
        """
        RULE 1: 실제 대기 인원에 따른 보정

        Args:
            lstm_prediction (float): LSTM 예측값
            metrics (dict): 실시간 메트릭

        Returns:
            float: 보정 계수 (0.7 ~ 1.5)
        """
        waiting_count = metrics['waiting_count']
        avg_exam_duration = metrics['avg_exam_duration']

        if waiting_count == 0:
            # 대기 인원이 없으면 대기 시간 감소
            return 0.7

        # 실제 대기 시간 추정 (대기 인원 * 평균 검사 시간)
        estimated_actual_wait = waiting_count * avg_exam_duration

        # LSTM 예측과 실제 추정의 비율
        if lstm_prediction > 0:
            ratio = estimated_actual_wait / lstm_prediction
            # 비율에 따른 보정 (0.7 ~ 1.5 범위)
            factor = max(0.7, min(1.5, ratio))
            return factor
        else:
            return 1.0

    @staticmethod
    def _rule_priority_weighting(metrics):
        """
        RULE 2: 우선순위 분포에 따른 보정

        긴급/응급 환자가 많으면 일반 환자 대기 시간 증가

        Args:
            metrics (dict): 실시간 메트릭

        Returns:
            float: 보정 계수 (0.9 ~ 1.2)
        """
        priority_dist = metrics['priority_distribution']
        total = priority_dist['total']

        if total == 0:
            return 1.0

        urgent_ratio = priority_dist['urgent'] / total
        emergency_ratio = priority_dist['emergency'] / total

        # 긴급/응급 환자 비율이 높으면 일반 환자 대기 증가
        priority_impact = urgent_ratio * 0.1 + emergency_ratio * 0.15

        # 0.9 ~ 1.2 범위로 제한
        factor = 1.0 + priority_impact
        return max(0.9, min(1.2, factor))

    @staticmethod
    def _rule_transition_rate(transition_rates):
        """
        RULE 3: 상태 전환 속도에 따른 보정

        호출 속도가 예상보다 느리면 대기 시간 증가

        Args:
            transition_rates (dict): 전환 속도 메트릭

        Returns:
            float: 보정 계수 (0.8 ~ 1.3)
        """
        if transition_rates['is_busier_than_expected']:
            # 예상보다 빠르게 처리 중 → 대기 시간 감소
            return 0.85
        elif transition_rates['is_slower_than_expected']:
            # 예상보다 느리게 처리 중 → 대기 시간 증가
            return 1.25
        else:
            # 정상 범위
            return 1.0

    @staticmethod
    def _rule_day_of_week(current_time):
        """
        RULE 4: 요일별 패턴 보정

        Args:
            current_time (datetime): 기준 시간

        Returns:
            float: 보정 계수 (0.65 ~ 1.3)
        """
        return HybridMetricsCollector.get_day_of_week_factor(current_time)

    @staticmethod
    def _rule_no_show(metrics):
        """
        RULE 5: 노쇼 비율에 따른 보정

        노쇼가 많으면 실제 대기 시간 감소

        Args:
            metrics (dict): 실시간 메트릭

        Returns:
            float: 보정 계수 (0.8 ~ 1.0)
        """
        recent_no_shows = metrics['recent_no_shows']
        total_active = metrics['total_active_patients']

        if total_active == 0:
            return 1.0

        # 노쇼 비율 계산
        no_show_rate = recent_no_shows / max(total_active + recent_no_shows, 1)

        # 노쇼가 많을수록 대기 시간 감소 (최대 20% 감소)
        reduction = no_show_rate * 0.2
        factor = 1.0 - reduction

        return max(0.8, min(1.0, factor))

    @staticmethod
    def _rule_completion_velocity(metrics):
        """
        RULE 6: 검사 완료 속도에 따른 보정

        최근 검사가 빠르게 끝나면 대기 시간 감소

        Args:
            metrics (dict): 실시간 메트릭

        Returns:
            float: 보정 계수 (0.75 ~ 1.25)
        """
        avg_exam_duration = metrics['avg_exam_duration']
        recent_avg_duration = metrics['recent_avg_duration']

        if avg_exam_duration == 0:
            return 1.0

        # 최근 평균 소요 시간의 비율
        velocity_ratio = recent_avg_duration / avg_exam_duration

        # 빠르게 끝나면 factor < 1.0, 느리게 끝나면 factor > 1.0
        factor = velocity_ratio

        # 0.75 ~ 1.25 범위로 제한
        return max(0.75, min(1.25, factor))

    @staticmethod
    def _rule_current_baseline_adjustment(lstm_prediction, current_wait_time):
        """
        RULE 7: 현재 대기시간 기준 적응적 보정 (Adaptive Correction)

        LSTM 예측이 현재 실제 대기시간과 크게 차이날 경우,
        현재값 쪽으로 당겨서 보정 (30분 후이므로 약간의 변동 허용)

        Args:
            lstm_prediction (float): LSTM 예측값 (분 단위)
            current_wait_time (float): 현재 실제 대기시간 (분 단위)

        Returns:
            float: 보정 계수 (0.4 ~ 3.0)
        """
        if current_wait_time == 0 or lstm_prediction <= 0:
            return 1.0

        # LSTM 예측과 현재값의 비율
        ratio = current_wait_time / lstm_prediction

        # 케이스 1: LSTM이 현재값의 절반 이하로 예측 (과소예측)
        if ratio > 2.0:
            # 30분 후 예측이므로 현재값의 90% 정도로 보정
            target = current_wait_time * 0.90
            correction_factor = target / lstm_prediction
            # 최대 5.0배까지 보정 허용
            return min(correction_factor, 5.0)

        # 케이스 2: LSTM이 현재값의 2배 이상 예측 (과대예측)
        elif ratio < 0.5:
            # 현재값의 120% 정도로 보정 (약간 증가 가능)
            target = current_wait_time * 1.2
            correction_factor = target / lstm_prediction
            # 최소 0.4배까지 축소 허용 (예: LSTM 35분 → 14분)
            return max(correction_factor, 0.4)

        # 케이스 3: 정상 범위 (현재값의 50~200% 사이)
        else:
            # 현재값과 LSTM 예측의 중간값 쪽으로 부드럽게 보정
            # 30분 후이므로 현재값에서 약간 벗어나는 것 허용
            target = current_wait_time * 0.9  # 현재값의 90%
            correction_factor = target / lstm_prediction
            return max(0.7, min(1.3, correction_factor))

    @classmethod
    def _calculate_weighted_factor(cls, corrections):
        """
        각 규칙의 보정 계수를 가중 평균하여 최종 보정 계수 계산

        Rule 7 (current_baseline)이 있으면 강하게 반영

        Args:
            corrections (dict): 규칙별 보정 계수

        Returns:
            float: 최종 보정 계수
        """
        if not corrections:
            return 1.0

        # Rule 7 (현재 대기시간 기준)이 있으면 우선 적용
        if 'current_baseline' in corrections:
            baseline_factor = corrections['current_baseline']
            other_corrections = {k: v for k, v in corrections.items() if k != 'current_baseline'}

            if not other_corrections:
                # Rule 7만 있으면 그대로 반환
                return baseline_factor

            # Rule 7 (85%) + 다른 규칙들 (15%) 비율로 혼합
            baseline_weight = 0.85
            other_weight = 0.15

            # 다른 규칙들의 가중 평균 계산
            other_weighted_sum = 0.0
            other_total_weight = 0.0

            for rule, factor in other_corrections.items():
                weight = cls.RULE_WEIGHTS.get(rule, 0.1)
                other_weighted_sum += (factor - 1.0) * weight
                other_total_weight += weight

            other_factor = 1.0 + (other_weighted_sum / other_total_weight if other_total_weight > 0 else 0)

            # Rule 7과 다른 규칙들 혼합
            final_factor = baseline_factor * baseline_weight + other_factor * other_weight

        else:
            # Rule 7이 없으면 기존 방식대로 가중 평균
            weighted_sum = 0.0
            total_weight = 0.0

            for rule, factor in corrections.items():
                weight = cls.RULE_WEIGHTS.get(rule, 0.1)
                weighted_sum += (factor - 1.0) * weight  # 1.0 기준으로 편차 계산
                total_weight += weight

            # 1.0 기준에서 가중 평균 편차를 더함
            final_factor = 1.0 + (weighted_sum / total_weight if total_weight > 0 else 0)

        # 최종 범위 제한 (0.4 ~ 5.0) - Rule 7 최대값 5.0에 맞춤
        return max(0.4, min(5.0, final_factor))

    @staticmethod
    def _calculate_confidence(lstm_prediction, corrected_prediction, metrics, num_rules_applied):
        """
        예측 신뢰도 점수 계산

        Args:
            lstm_prediction (float): LSTM 원래 예측
            corrected_prediction (float): 보정된 예측
            metrics (dict): 실시간 메트릭
            num_rules_applied (int): 적용된 규칙 수

        Returns:
            float: 신뢰도 점수 (0.0 ~ 1.0)
        """
        base_confidence = 0.75  # 기본 신뢰도

        # 1. 실시간 데이터 품질에 따른 신뢰도 조정
        total_active = metrics['total_active_patients']
        if total_active > 10:
            # 활성 환자가 많으면 신뢰도 증가
            base_confidence += 0.10
        elif total_active == 0:
            # 활성 환자가 없으면 신뢰도 감소
            base_confidence -= 0.15

        # 2. 적용된 규칙 수에 따른 신뢰도 조정
        if num_rules_applied >= 4:
            # 많은 규칙이 적용되면 신뢰도 증가
            base_confidence += 0.08
        elif num_rules_applied == 0:
            # 규칙이 적용되지 않으면 순수 LSTM 신뢰도
            base_confidence = 0.70

        # 3. LSTM 예측과 보정값의 차이에 따른 조정
        if lstm_prediction > 0:
            deviation = abs(corrected_prediction - lstm_prediction) / lstm_prediction
            if deviation > 0.5:
                # 보정이 크면 신뢰도 약간 감소
                base_confidence -= 0.05

        # 범위 제한 (0.5 ~ 0.95)
        return max(0.5, min(0.95, base_confidence))
