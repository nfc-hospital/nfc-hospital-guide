from typing import Optional, Dict, Any
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import PatientState, Queue, StateTransition, QueueStatusLog
from common.state_definitions import (
    PatientJourneyState, QueueDetailState, PatientAction, StaffAction,
    STATE_TRANSITIONS, QUEUE_TO_JOURNEY_MAPPING, JOURNEY_TO_QUEUE_MAPPING
)
from appointments.models import Appointment

# 종료된 것으로 간주되는 Appointment 상태 (완료, 취소, 미방문)
FINAL_APPOINTMENT_STATUSES = ['completed', 'examined', 'cancelled', 'no_show']

class InvalidActionError(Exception):
    """잘못된 액션 요청"""
    pass

class PatientJourneyService:
    """환자 여정 상태 관리 서비스"""
    
    def __init__(self, user):
        self.user = user
        self.channel_layer = get_channel_layer()
        
    @transaction.atomic
    def perform_action(self, action_type: str, payload: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        액션을 수행하고 상태를 전이시킴
        
        Args:
            action_type: 수행할 액션 타입
            payload: 액션에 필요한 추가 데이터
            
        Returns:
            변경된 상태 정보
            
        Raises:
            InvalidActionError: 잘못된 액션이나 전이 불가능한 경우
        """
        if payload is None:
            payload = {}
            
        # 현재 상태 조회
        patient_state = self._get_or_create_patient_state()
        current_state = PatientJourneyState(patient_state.current_state)
        
        # 액션 타입 확인
        try:
            if action_type in [a.value for a in PatientAction]:
                action = PatientAction(action_type)
            elif action_type in [a.value for a in StaffAction]:
                action = StaffAction(action_type)
            else:
                raise InvalidActionError(f"Unknown action type: {action_type}")
        except ValueError:
            raise InvalidActionError(f"Invalid action: {action_type}")
        
        # 상태 전이 가능 여부 확인
        if current_state not in STATE_TRANSITIONS:
            raise InvalidActionError(f"No transitions defined for state: {current_state.value}")
            
        transitions = STATE_TRANSITIONS[current_state]
        if action not in transitions:
            raise InvalidActionError(
                f"Action '{action_type}' is not allowed in state '{current_state.value}'"
            )
        
        # 새로운 상태 결정
        new_state = transitions[action]

        # IN_PROGRESS 완료 시 동적 분기 처리
        if (current_state == PatientJourneyState.IN_PROGRESS and
            action in [PatientAction.COMPLETE_EXAM, StaffAction.COMPLETE_EXAM]):
            # 현재 진행 중인 큐를 완료 처리
            active_queue = Queue.objects.filter(
                user=self.user,
                state=QueueDetailState.IN_PROGRESS.value
            ).first()

            if active_queue:
                active_queue.state = QueueDetailState.COMPLETED.value
                active_queue.save()

                QueueStatusLog.objects.create(
                    queue=active_queue,
                    previous_state=QueueDetailState.IN_PROGRESS.value,
                    new_state=QueueDetailState.COMPLETED.value,
                    reason=f"Exam completed by {action_type}",
                    changed_by=self.user if isinstance(action, PatientAction) else None
                )

                # ✅ 중요: 완료된 검사의 Appointment 상태도 'completed'로 업데이트
                # 이렇게 해야 다음 검사를 찾을 때 완료된 검사가 제외됨
                completed_appointment = active_queue.appointment
                completed_appointment.status = 'completed'
                completed_appointment.save()
                print(f"[DEBUG] ✅ 완료된 검사의 Appointment 상태를 'completed'로 변경: {completed_appointment.appointment_id}")

            # ✅ 다음 대기 중인 appointment 확인 (분기 로직 강화)
            today = timezone.now().date()

            # 🔍 디버깅: 모든 당일 예약 조회
            all_today_appointments = Appointment.objects.filter(
                user=self.user,
                scheduled_at__date=today
            ).order_by('created_at')

            # 🔍 디버깅: 완료되지 않은 예약만 필터링
            pending_appointments = all_today_appointments.exclude(
                status__in=FINAL_APPOINTMENT_STATUSES  # 완료/취소/미방문 제외
            ).exclude(
                appointment_id=active_queue.appointment_id if active_queue else None
            )

            # 🔍 개발 환경에서 로그 출력
            if True:  # 개발용 - 운영에서는 settings.DEBUG로 변경
                print(f"[DEBUG] 🔍 IN_PROGRESS 완료 처리 - 다음 검사 찾기")
                print(f"[DEBUG] 👤 User: {self.user.user_id}")
                print(f"[DEBUG] 📅 Today: {today}")
                print(f"[DEBUG] 🏥 Active Queue: {active_queue.appointment_id if active_queue else 'None'}")
                print(f"[DEBUG] 📋 전체 당일 예약 수: {all_today_appointments.count()}")
                print(f"[DEBUG] ⏳ 대기 중인 예약 수: {pending_appointments.count()}")
                for apt in pending_appointments:
                    print(f"[DEBUG]   → {apt.appointment_id}: {apt.exam.title} (status={apt.status})")

            next_appointment = pending_appointments.first()

            if next_appointment:
                # ✅ 다음 검사가 있으면 WAITING으로
                new_state = PatientJourneyState.WAITING

                print(f"[DEBUG] ✅ 다음 검사 발견: {next_appointment.exam.title} → WAITING 상태로 전환")

                # 새로운 Queue 생성
                Queue.objects.create(
                    user=self.user,
                    appointment=next_appointment,
                    exam=next_appointment.exam,
                    state=QueueDetailState.WAITING.value,
                    queue_number=self._get_next_queue_number(next_appointment.exam),
                    estimated_wait_time=self._calculate_wait_time(next_appointment.exam),
                    priority='normal'
                )

                # ✅ 다음 appointment의 status를 'waiting'으로 명시적 업데이트
                next_appointment.status = 'waiting'
                next_appointment.save()
                print(f"[DEBUG] ✅ {next_appointment.exam.title} 상태를 'waiting'으로 변경")

            else:
                # ✅ 다음 검사가 없으면 PAYMENT로
                new_state = PatientJourneyState.PAYMENT
                print(f"[DEBUG] 💰 다음 검사 없음 → PAYMENT 상태로 전환")

        # 상태 변경 수행
        old_state_value = patient_state.current_state
        patient_state.current_state = new_state.value
        patient_state.save()

        # REGISTERED 상태일 때 당일 예약을 pending → scheduled로 변경
        if new_state == PatientJourneyState.REGISTERED:
            today = timezone.now().date()
            Appointment.objects.filter(
                user=self.user,
                scheduled_at__date=today,
                status='pending'
            ).update(status='scheduled')

        # Queue 상태 동기화 (필요한 경우)
        self._sync_queue_state(new_state, payload)
        
        # 상태 전환 로그 생성 (상세 정보 포함)
        # 현재 진행 중인 Queue/Exam 정보 수집
        active_queue = Queue.objects.filter(
            user=self.user,
            state__in=[QueueDetailState.WAITING.value,
                      QueueDetailState.CALLED.value,
                      QueueDetailState.IN_PROGRESS.value]
        ).first()

        StateTransition.objects.create(
            user=self.user,
            from_state=old_state_value,
            to_state=new_state.value,
            trigger_type=self._get_trigger_type(action),
            trigger_source=f"{action_type} | queue_id:{active_queue.queue_id if active_queue else 'N/A'} | apt_id:{active_queue.appointment_id if active_queue else 'N/A'}",
            location_at_transition=payload.get('location') if payload else None,
            exam_id=active_queue.exam.exam_id if active_queue else None
        )
        
        # WebSocket 알림 전송
        self._send_state_update(new_state.value, action_type)
        
        # 응답 데이터 구성
        return self._build_response(patient_state)
    
    def get_current_state(self) -> Dict[str, Any]:
        """현재 환자 상태 조회"""
        patient_state = self._get_or_create_patient_state()
        return self._build_response(patient_state)
    
    @transaction.atomic
    def sync_from_queue_update(self, queue: Queue):
        """Queue 상태 변경에 따른 PatientState 동기화"""
        try:
            queue_state = QueueDetailState(queue.state)

            # QueueDetailState.COMPLETED 특별 처리
            if queue_state == QueueDetailState.COMPLETED:
                # ✅ 중요: 완료된 검사의 Appointment 상태도 'completed'로 업데이트
                # 이렇게 해야 다음 검사를 찾을 때 완료된 검사가 제외됨
                completed_appointment = queue.appointment
                completed_appointment.status = 'completed'
                completed_appointment.save()
                print(f"[DEBUG] ✅ sync_from_queue_update: 완료된 Appointment 상태를 'completed'로 변경: {completed_appointment.appointment_id}")

                # ✅ 다음 대기 중인 appointment 확인 (분기 로직 강화)
                today = timezone.now().date()

                # 🔍 디버깅: 모든 당일 예약 조회
                all_today_appointments = Appointment.objects.filter(
                    user=self.user,
                    scheduled_at__date=today
                ).order_by('created_at')

                # 🔍 디버깅: 완료되지 않은 예약만 필터링
                pending_appointments = all_today_appointments.exclude(
                    status__in=FINAL_APPOINTMENT_STATUSES  # 완료/취소/미방문 제외
                ).exclude(
                    appointment_id=queue.appointment_id
                )

                # 🔍 개발 환경에서 로그 출력
                if True:  # 개발용 - 운영에서는 settings.DEBUG로 변경
                    print(f"[DEBUG] 🔄 sync_from_queue_update - COMPLETED 처리")
                    print(f"[DEBUG] 👤 User: {self.user.user_id}")
                    print(f"[DEBUG] 📋 전체 당일 예약 수: {all_today_appointments.count()}")
                    print(f"[DEBUG] ⏳ 대기 중인 예약 수: {pending_appointments.count()}")

                next_appointment = pending_appointments.first()

                if next_appointment:
                    journey_state = PatientJourneyState.WAITING
                    print(f"[DEBUG] ✅ 다음 검사 발견: {next_appointment.exam.title} → WAITING")

                    # 새로운 Queue 생성
                    Queue.objects.create(
                        user=self.user,
                        appointment=next_appointment,
                        exam=next_appointment.exam,
                        state=QueueDetailState.WAITING.value,
                        queue_number=self._get_next_queue_number(next_appointment.exam),
                        estimated_wait_time=self._calculate_wait_time(next_appointment.exam),
                        priority='normal'
                    )

                    # ✅ 다음 appointment의 status를 'waiting'으로 명시적 업데이트
                    next_appointment.status = 'waiting'
                    next_appointment.save()
                    print(f"[DEBUG] ✅ {next_appointment.exam.title} 상태를 'waiting'으로 변경")
                else:
                    journey_state = PatientJourneyState.PAYMENT
                    print(f"[DEBUG] 💰 다음 검사 없음 → PAYMENT")
            else:
                journey_state = QUEUE_TO_JOURNEY_MAPPING.get(queue_state)

            if journey_state:
                patient_state = self._get_or_create_patient_state()
                if patient_state.current_state != journey_state.value:
                    old_state = patient_state.current_state
                    patient_state.current_state = journey_state.value
                    patient_state.save()

                    # 상태 전환 로그
                    StateTransition.objects.create(
                        user=self.user,
                        from_state=old_state,
                        to_state=journey_state.value,
                        trigger_type='queue_sync',
                        trigger_source=f"Queue state changed to {queue.state}"
                    )

                    # WebSocket 알림
                    self._send_state_update(journey_state.value, 'queue_sync')
        except ValueError:
            # 알 수 없는 queue state는 무시
            pass
    
    @transaction.atomic
    def sync_from_patient_state(self, patient_state: PatientState):
        """PatientState 변경에 따른 Queue 동기화"""
        try:
            journey_state = PatientJourneyState(patient_state.current_state)
            queue_state = JOURNEY_TO_QUEUE_MAPPING.get(journey_state)
            
            if queue_state:
                # 활성 큐 조회
                active_queue = Queue.objects.filter(
                    user=self.user,
                    state__in=[QueueDetailState.WAITING.value, 
                               QueueDetailState.CALLED.value,
                               QueueDetailState.IN_PROGRESS.value]
                ).first()
                
                if active_queue and active_queue.state != queue_state.value:
                    old_state = active_queue.state
                    active_queue.state = queue_state.value
                    active_queue.save()
                    
                    # Queue 상태 변경 로그
                    QueueStatusLog.objects.create(
                        queue=active_queue,
                        previous_state=old_state,
                        new_state=queue_state.value,
                        reason="Synced from PatientState",
                        changed_by=None  # System
                    )
        except ValueError:
            pass
    
    def _get_or_create_patient_state(self) -> PatientState:
        """환자 상태 조회 또는 생성"""
        patient_state, created = PatientState.objects.get_or_create(
            user=self.user,
            defaults={
                'current_state': PatientJourneyState.UNREGISTERED.value,
                'is_logged_in': True,
                'login_method': 'simple'
            }
        )
        return patient_state
    
    def _sync_queue_state(self, new_journey_state: PatientJourneyState, payload: Dict[str, Any]):
        """Journey 상태에 따른 Queue 상태 동기화"""
        queue_state = JOURNEY_TO_QUEUE_MAPPING.get(new_journey_state)
        
        if queue_state:
            # 활성 큐가 있는지 확인
            active_queue = Queue.objects.filter(
                user=self.user,
                state__in=[QueueDetailState.WAITING.value, 
                          QueueDetailState.CALLED.value,
                          QueueDetailState.IN_PROGRESS.value]
            ).first()
            
            if active_queue:
                old_state = active_queue.state
                active_queue.state = queue_state.value
                active_queue.save()
                
                QueueStatusLog.objects.create(
                    queue=active_queue,
                    previous_state=old_state,
                    new_state=queue_state.value,
                    reason=f"Journey state changed to {new_journey_state.value}",
                    changed_by=None,
                    metadata=payload
                )
    
    def _get_trigger_type(self, action) -> str:
        """액션으로부터 트리거 타입 결정"""
        if isinstance(action, PatientAction):
            if action == PatientAction.SCAN_NFC:
                return 'nfc_tag'
            return 'patient_action'
        elif isinstance(action, StaffAction):
            return 'staff_action'
        return 'system_auto'
    
    def _send_state_update(self, new_state: str, action_type: str):
        """WebSocket을 통한 상태 업데이트 알림"""
        try:
            async_to_sync(self.channel_layer.group_send)(
                f"patient_{self.user.id}",
                {
                    "type": "state_update",
                    "journey_state": new_state,
                    "action": action_type,
                    "timestamp": timezone.now().isoformat()
                }
            )
        except Exception as e:
            # WebSocket 전송 실패는 무시 (로깅만)
            print(f"WebSocket notification failed: {e}")
    
    def _build_response(self, patient_state: PatientState) -> Dict[str, Any]:
        """응답 데이터 구성"""
        # 활성 큐 조회
        active_queues = Queue.objects.filter(
            user=self.user,
            state__in=[QueueDetailState.WAITING.value,
                      QueueDetailState.DELAYED.value,
                      QueueDetailState.CALLED.value,
                      QueueDetailState.IN_PROGRESS.value]
        ).select_related('exam', 'appointment')
        
        # 당일 예약 조회
        today = timezone.now().date()
        appointments = Appointment.objects.filter(
            user=self.user,
            scheduled_at__date=today
        ).select_related('exam')
        
        # 다음 가능한 액션 계산
        current_state = PatientJourneyState(patient_state.current_state)
        available_actions = []
        if current_state in STATE_TRANSITIONS:
            for action in STATE_TRANSITIONS[current_state].keys():
                available_actions.append(action.value)
        
        return {
            'journey_state': patient_state.current_state,
            'queue_details': [
                {
                    'queue_id': str(q.queue_id),
                    'exam_id': q.exam.exam_id,
                    'exam_name': q.exam.title,
                    'state': q.state,
                    'queue_number': q.queue_number,
                    'estimated_wait_time': q.estimated_wait_time
                }
                for q in active_queues
            ],
            'appointments': [
                {
                    'appointment_id': a.appointment_id,
                    'exam_id': a.exam.exam_id,
                    'exam_name': a.exam.title,
                    'scheduled_at': a.scheduled_at.isoformat(),
                    'status': a.status
                }
                for a in appointments
            ],
            'available_actions': available_actions,
            'timestamp': timezone.now().isoformat()
        }

    def _get_next_queue_number(self, exam) -> int:
        """다음 대기 번호 계산"""
        last_queue = Queue.objects.filter(
            exam=exam,
            created_at__date=timezone.now().date()
        ).order_by('-queue_number').first()

        return (last_queue.queue_number + 1) if last_queue else 1

    def _calculate_wait_time(self, exam) -> int:
        """대기 시간 추정 (분 단위)"""
        waiting_count = Queue.objects.filter(
            exam=exam,
            state__in=[QueueDetailState.WAITING.value, QueueDetailState.CALLED.value]
        ).count()

        # 검사 평균 소요 시간 + 버퍼 시간
        avg_duration = getattr(exam, 'average_duration', 15)
        buffer_time = getattr(exam, 'buffer_time', 5)

        return waiting_count * (avg_duration + buffer_time)