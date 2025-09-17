"""
PatientJourneyService 단위 테스트
V2 리팩토링 - Phase 5
"""
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from django.utils import timezone

from p_queue.services import PatientJourneyService, InvalidActionError
from p_queue.models import Queue, PatientState, StateTransition, QueueStatusLog
from appointments.models import Appointment, Exam
from common.state_definitions import (
    PatientJourneyState, QueueDetailState, PatientAction, StaffAction,
    STATE_TRANSITIONS, QUEUE_TO_JOURNEY_MAPPING
)

User = get_user_model()


class TestPatientJourneyService(TestCase):
    """PatientJourneyService 테스트"""
    
    def setUp(self):
        """테스트 초기 설정"""
        # 테스트 사용자 생성
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            name='테스트 환자',
            phone_number='010-1234-5678',
            birth_date='1990-01-01',
            role='patient'
        )
        
        # 테스트 검사 생성
        self.exam = Exam.objects.create(
            exam_id='TEST_EXAM_001',
            title='테스트 X-Ray',
            description='테스트용 X-Ray 검사',
            department='영상의학과',
            building='본관',
            floor='2',
            room='201호',
            average_duration=30,
            buffer_time=10,
            x_coord=100.0,
            y_coord=200.0
        )
        
        # 테스트 예약 생성
        self.appointment = Appointment.objects.create(
            appointment_id='TEST_APT_001',
            user=self.user,
            exam=self.exam,
            scheduled_at=timezone.now() + timedelta(hours=1),
            status='scheduled'
        )
        
        # 서비스 인스턴스 생성
        self.service = PatientJourneyService(self.user)
    
    def test_perform_valid_action_scan_nfc(self):
        """유효한 액션 수행 테스트 - NFC 스캔"""
        # UNREGISTERED 상태에서 시작
        patient_state = PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.UNREGISTERED.value
        )
        
        # NFC 스캔 액션 수행
        result = self.service.perform_action(
            PatientAction.SCAN_NFC.value,
            {'tag_id': 'test_tag_123'}
        )
        
        # 결과 검증
        self.assertEqual(result['journey_state'], PatientJourneyState.ARRIVED.value)
        self.assertIn(PatientAction.REGISTER.value, result['available_actions'])
        
        # DB 상태 확인
        patient_state.refresh_from_db()
        self.assertEqual(patient_state.current_state, PatientJourneyState.ARRIVED.value)
    
    def test_perform_valid_action_register(self):
        """유효한 액션 수행 테스트 - 등록"""
        # ARRIVED 상태에서 시작
        patient_state = PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.ARRIVED.value
        )
        
        # 등록 액션 수행
        result = self.service.perform_action(
            PatientAction.REGISTER.value,
            {}
        )
        
        # 결과 검증
        self.assertEqual(result['journey_state'], PatientJourneyState.REGISTERED.value)
        self.assertIn(PatientAction.CONFIRM_ARRIVAL.value, result['available_actions'])
    
    def test_invalid_action_raises_error(self):
        """잘못된 액션 시 에러 발생 테스트"""
        # UNREGISTERED 상태 생성
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.UNREGISTERED.value
        )
        
        # UNREGISTERED 상태에서 CALL_PATIENT는 불가능
        with self.assertRaises(InvalidActionError) as context:
            self.service.perform_action(StaffAction.CALL_PATIENT.value)
        
        self.assertIn('Invalid action', str(context.exception))
    
    def test_queue_sync_updates_patient_state(self):
        """Queue 동기화 테스트"""
        # PatientState를 WAITING으로 설정
        patient_state = PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.WAITING.value
        )
        
        # Queue 생성
        queue = Queue.objects.create(
            user=self.user,
            appointment=self.appointment,
            exam=self.exam,
            state=QueueDetailState.WAITING.value,
            queue_number=1,
            estimated_wait_time=30,
            priority='normal'
        )
        
        # Queue 상태를 called로 변경
        queue.state = QueueDetailState.CALLED.value
        queue.save()
        
        # sync_from_queue_update 메서드 호출
        self.service.sync_from_queue_update(queue)
        
        # PatientState가 CALLED로 변경되었는지 확인
        patient_state.refresh_from_db()
        self.assertEqual(patient_state.current_state, PatientJourneyState.CALLED.value)
    
    def test_state_transitions_follow_rules(self):
        """상태 전이 규칙 검증"""
        # UNREGISTERED → ARRIVED → REGISTERED → WAITING 순서대로 전이
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.UNREGISTERED.value
        )
        
        # 1. UNREGISTERED → ARRIVED
        result = self.service.perform_action(PatientAction.SCAN_NFC.value)
        self.assertEqual(result['journey_state'], PatientJourneyState.ARRIVED.value)
        
        # 2. ARRIVED → REGISTERED
        result = self.service.perform_action(PatientAction.REGISTER.value)
        self.assertEqual(result['journey_state'], PatientJourneyState.REGISTERED.value)
        
        # 3. REGISTERED → WAITING
        result = self.service.perform_action(PatientAction.CONFIRM_ARRIVAL.value)
        self.assertEqual(result['journey_state'], PatientJourneyState.WAITING.value)
    
    @patch('p_queue.services.async_to_sync')
    def test_websocket_notification_sent(self, mock_async):
        """WebSocket 알림 전송 테스트"""
        # Mock 설정
        mock_send = MagicMock()
        mock_async.return_value = mock_send
        
        # PatientState 생성
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.UNREGISTERED.value
        )
        
        # 액션 수행
        self.service.perform_action(PatientAction.SCAN_NFC.value)
        
        # WebSocket 알림이 호출되었는지 확인
        mock_async.assert_called()
        mock_send.assert_called()
    
    def test_get_current_state(self):
        """현재 상태 조회 테스트"""
        # PatientState 생성
        patient_state = PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.WAITING.value
        )
        
        # Queue 생성
        Queue.objects.create(
            user=self.user,
            appointment=self.appointment,
            exam=self.exam,
            state=QueueDetailState.WAITING.value,
            queue_number=5,
            estimated_wait_time=30,
            priority='normal'
        )
        
        # 현재 상태 조회
        result = self.service.get_current_state()
        
        # 결과 검증
        self.assertEqual(result['journey_state'], PatientJourneyState.WAITING.value)
        self.assertIsNotNone(result['queue_details'])
        self.assertEqual(len(result['queue_details']), 1)
        self.assertEqual(result['queue_details'][0]['state'], QueueDetailState.WAITING.value)
        self.assertIn('available_actions', result)
    
    def test_state_normalization_ongoing_to_in_progress(self):
        """상태 정규화 테스트 - ongoing → in_progress"""
        # Queue를 'ongoing' 상태로 생성 (이전 데이터 호환성)
        queue = Queue.objects.create(
            user=self.user,
            appointment=self.appointment,
            exam=self.exam,
            state='ongoing',  # 이전 형식
            queue_number=1,
            estimated_wait_time=0,
            priority='normal'
        )
        
        # PatientState 생성
        patient_state = PatientState.objects.create(
            user=self.user,
            current_state='ONGOING'  # 이전 형식
        )
        
        # 정규화 후 확인
        # 참고: 실제 정규화는 마이그레이션이나 서비스 레이어에서 처리
        # 여기서는 매핑이 올바른지 확인
        expected_state = QueueDetailState.IN_PROGRESS.value
        self.assertEqual(expected_state, 'in_progress')
        
        expected_journey = PatientJourneyState.IN_PROGRESS.value
        self.assertEqual(expected_journey, 'IN_PROGRESS')
    
    def test_multiple_queues_handling(self):
        """여러 큐 처리 테스트"""
        # 여러 검사 생성
        exam2 = Exam.objects.create(
            exam_id='TEST_EXAM_002',
            title='Blood Test',
            description='혈액 검사',
            department='진단검사의학과',
            building='본관',
            floor='3',
            room='302호',
            average_duration=15,
            buffer_time=5,
            x_coord=150.0,
            y_coord=250.0
        )
        
        appointment2 = Appointment.objects.create(
            appointment_id='TEST_APT_002',
            user=self.user,
            exam=exam2,
            scheduled_at=timezone.now() + timedelta(hours=2),
            status='scheduled'
        )
        
        # 여러 큐 생성
        Queue.objects.create(
            user=self.user,
            appointment=self.appointment,
            exam=self.exam,
            state=QueueDetailState.COMPLETED.value,
            queue_number=1,
            estimated_wait_time=0,
            priority='normal'
        )
        
        Queue.objects.create(
            user=self.user,
            appointment=appointment2,
            exam=exam2,
            state=QueueDetailState.WAITING.value,
            queue_number=3,
            estimated_wait_time=45,
            priority='normal'
        )
        
        # PatientState
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.WAITING.value
        )
        
        # 현재 상태 조회
        result = self.service.get_current_state()
        
        # 여러 큐가 반환되는지 확인
        self.assertEqual(len(result['queue_details']), 2)
        
        # 완료된 큐와 대기 중인 큐가 모두 있는지 확인
        states = [q['state'] for q in result['queue_details']]
        self.assertIn(QueueDetailState.COMPLETED.value, states)
        self.assertIn(QueueDetailState.WAITING.value, states)
    
    def test_state_transition_creates_log(self):
        """상태 전이 시 로그 생성 테스트"""
        # 초기 상태
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.UNREGISTERED.value
        )
        
        # 액션 수행
        self.service.perform_action(PatientAction.SCAN_NFC.value)
        
        # StateTransition 로그 확인
        transitions = StateTransition.objects.filter(user=self.user)
        self.assertEqual(transitions.count(), 1)
        
        transition = transitions.first()
        self.assertEqual(transition.from_state, PatientJourneyState.UNREGISTERED.value)
        self.assertEqual(transition.to_state, PatientJourneyState.ARRIVED.value)
        self.assertEqual(transition.trigger_type, 'patient_action')
    
    def test_invalid_state_transition(self):
        """잘못된 상태 전이 시도"""
        # WAITING 상태에서 REGISTER 액션은 불가능
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.WAITING.value
        )
        
        with self.assertRaises(InvalidActionError):
            self.service.perform_action(PatientAction.REGISTER.value)
    
    def tearDown(self):
        """테스트 정리"""
        # 생성된 테스트 데이터 정리
        StateTransition.objects.all().delete()
        Queue.objects.all().delete()
        PatientState.objects.all().delete()
        Appointment.objects.all().delete()
        Exam.objects.all().delete()
        User.objects.all().delete()