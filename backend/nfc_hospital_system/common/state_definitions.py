from enum import Enum
from typing import Dict, List, Optional

class PatientJourneyState(Enum):
    """환자 전체 여정 상태 (최상위)"""
    UNREGISTERED = 'UNREGISTERED'
    ARRIVED = 'ARRIVED'
    REGISTERED = 'REGISTERED'
    WAITING = 'WAITING'
    CALLED = 'CALLED'
    IN_PROGRESS = 'IN_PROGRESS'  # ONGOING 대신 통일
    COMPLETED = 'COMPLETED'
    PAYMENT = 'PAYMENT'
    FINISHED = 'FINISHED'

class QueueDetailState(Enum):
    """대기열 세부 상태"""
    WAITING = 'waiting'
    DELAYED = 'delayed'
    CALLED = 'called'
    NO_SHOW = 'no_show'
    IN_PROGRESS = 'in_progress'  # ongoing 대신 통일
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'

class PatientAction(Enum):
    """환자가 수행할 수 있는 액션"""
    SCAN_NFC = 'scan_nfc'
    REGISTER = 'register'
    CONFIRM_ARRIVAL = 'confirm_arrival'
    ENTER_EXAM_ROOM = 'enter_exam_room'
    COMPLETE_EXAM = 'complete_exam'
    MAKE_PAYMENT = 'make_payment'
    LEAVE_HOSPITAL = 'leave_hospital'

class StaffAction(Enum):
    """의료진이 수행할 수 있는 액션"""
    CALL_PATIENT = 'call_patient'
    START_EXAM = 'start_exam'
    COMPLETE_EXAM = 'complete_exam'
    MARK_NO_SHOW = 'mark_no_show'
    CANCEL_APPOINTMENT = 'cancel_appointment'

# 상태 전이 규칙 정의
STATE_TRANSITIONS = {
    PatientJourneyState.UNREGISTERED: {
        PatientAction.SCAN_NFC: PatientJourneyState.ARRIVED,
    },
    PatientJourneyState.ARRIVED: {
        PatientAction.REGISTER: PatientJourneyState.REGISTERED,
    },
    PatientJourneyState.REGISTERED: {
        PatientAction.CONFIRM_ARRIVAL: PatientJourneyState.WAITING,
    },
    PatientJourneyState.WAITING: {
        StaffAction.CALL_PATIENT: PatientJourneyState.CALLED,
        StaffAction.MARK_NO_SHOW: PatientJourneyState.WAITING,  # 상태 유지
    },
    PatientJourneyState.CALLED: {
        PatientAction.ENTER_EXAM_ROOM: PatientJourneyState.IN_PROGRESS,
        StaffAction.START_EXAM: PatientJourneyState.IN_PROGRESS,
        StaffAction.MARK_NO_SHOW: PatientJourneyState.WAITING,  # 다시 대기
    },
    PatientJourneyState.IN_PROGRESS: {
        PatientAction.COMPLETE_EXAM: PatientJourneyState.COMPLETED,
        StaffAction.COMPLETE_EXAM: PatientJourneyState.COMPLETED,
    },
    PatientJourneyState.COMPLETED: {
        PatientAction.CONFIRM_ARRIVAL: PatientJourneyState.WAITING,  # 다음 검사
        PatientAction.MAKE_PAYMENT: PatientJourneyState.PAYMENT,
    },
    PatientJourneyState.PAYMENT: {
        PatientAction.MAKE_PAYMENT: PatientJourneyState.FINISHED,
    },
    PatientJourneyState.FINISHED: {
        PatientAction.LEAVE_HOSPITAL: PatientJourneyState.UNREGISTERED,
    },
}

# Queue 상태와 Journey 상태 매핑
QUEUE_TO_JOURNEY_MAPPING = {
    QueueDetailState.WAITING: PatientJourneyState.WAITING,
    QueueDetailState.DELAYED: PatientJourneyState.WAITING,
    QueueDetailState.CALLED: PatientJourneyState.CALLED,
    QueueDetailState.NO_SHOW: PatientJourneyState.WAITING,
    QueueDetailState.IN_PROGRESS: PatientJourneyState.IN_PROGRESS,
    QueueDetailState.COMPLETED: PatientJourneyState.COMPLETED,
    QueueDetailState.CANCELLED: PatientJourneyState.COMPLETED,
}

# Journey 상태와 Queue 상태 역매핑
JOURNEY_TO_QUEUE_MAPPING = {
    PatientJourneyState.WAITING: QueueDetailState.WAITING,
    PatientJourneyState.CALLED: QueueDetailState.CALLED,
    PatientJourneyState.IN_PROGRESS: QueueDetailState.IN_PROGRESS,
    PatientJourneyState.COMPLETED: QueueDetailState.COMPLETED,
}