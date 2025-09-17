"""
통합 테스트
V2 리팩토링 - API 및 WebSocket 통합 테스트
"""
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
import json
from unittest.mock import patch, MagicMock

from p_queue.models import Queue, PatientState
from appointments.models import Appointment, Exam
from common.state_definitions import PatientJourneyState, QueueDetailState

User = get_user_model()


class TestPatientJourneyAPI(TestCase):
    """Patient Journey API 통합 테스트"""
    
    def setUp(self):
        """테스트 초기 설정"""
        self.client = APIClient()
        
        # 테스트 사용자 생성
        self.user = User.objects.create_user(
            email='api@test.com',
            password='testpass123',
            name='API 테스트',
            phone_number='010-7777-6666',
            birth_date='1992-02-02',
            role='patient'
        )
        
        # JWT 토큰 생성 및 인증
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # 테스트 검사 생성
        self.exam = Exam.objects.create(
            exam_id='API_EXAM_001',
            title='API 테스트 검사',
            description='API 통합 테스트용',
            department='테스트과',
            building='본관',
            floor='1',
            room='101호',
            average_duration=30,
            buffer_time=10,
            x_coord=100.0,
            y_coord=100.0
        )
        
        # 테스트 예약 생성
        self.appointment = Appointment.objects.create(
            appointment_id='API_APT_001',
            user=self.user,
            exam=self.exam,
            scheduled_at=timezone.now() + timedelta(hours=1),
            status='scheduled'
        )
    
    def test_get_current_state_api(self):
        """현재 상태 조회 API 테스트"""
        # PatientState 생성
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.WAITING.value
        )
        
        # Queue 생성
        Queue.objects.create(
            user=self.user,
            appointment=self.appointment,
            exam=self.exam,
            state=QueueDetailState.WAITING.value,
            queue_number=3,
            estimated_wait_time=45,
            priority='normal'
        )
        
        # API 호출
        response = self.client.get('/api/v1/queue/patient-journey/current_state/')
        
        # 응답 확인
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(data['journey_state'], PatientJourneyState.WAITING.value)
        self.assertIn('queue_details', data)
        self.assertIn('available_actions', data)
        self.assertEqual(len(data['queue_details']), 1)
        self.assertEqual(data['queue_details'][0]['state'], QueueDetailState.WAITING.value)
    
    def test_perform_action_api(self):
        """액션 수행 API 테스트"""
        # 초기 상태 설정
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.UNREGISTERED.value
        )
        
        # NFC 스캔 액션 수행
        response = self.client.post('/api/v1/queue/patient-journey/perform_action/', {
            'action_type': 'scan_nfc',
            'payload': {'tag_id': 'test_tag_456'}
        })
        
        # 응답 확인
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(data['journey_state'], PatientJourneyState.ARRIVED.value)
        self.assertIn('available_actions', data)
        self.assertIn('register', data['available_actions'])
    
    def test_invalid_action_returns_error(self):
        """잘못된 액션 시 에러 반환 테스트"""
        # UNREGISTERED 상태 설정
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.UNREGISTERED.value
        )
        
        # 잘못된 액션 수행 (UNREGISTERED에서 call_patient 불가)
        response = self.client.post('/api/v1/queue/patient-journey/perform_action/', {
            'action_type': 'call_patient',
            'payload': {}
        })
        
        # 에러 응답 확인
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        data = response.json()
        self.assertIn('error', data)
    
    def test_my_current_queues_api(self):
        """현재 대기열 조회 API 테스트"""
        # 여러 큐 생성
        Queue.objects.create(
            user=self.user,
            appointment=self.appointment,
            exam=self.exam,
            state=QueueDetailState.WAITING.value,
            queue_number=5,
            estimated_wait_time=60,
            priority='normal'
        )
        
        # 두 번째 검사 및 큐 생성
        exam2 = Exam.objects.create(
            exam_id='API_EXAM_002',
            title='Blood Test',
            description='혈액 검사',
            department='진단검사의학과',
            building='본관',
            floor='2',
            room='201호',
            average_duration=15,
            buffer_time=5,
            x_coord=150.0,
            y_coord=150.0
        )
        
        appointment2 = Appointment.objects.create(
            appointment_id='API_APT_002',
            user=self.user,
            exam=exam2,
            scheduled_at=timezone.now() + timedelta(hours=2),
            status='scheduled'
        )
        
        Queue.objects.create(
            user=self.user,
            appointment=appointment2,
            exam=exam2,
            state=QueueDetailState.COMPLETED.value,
            queue_number=1,
            estimated_wait_time=0,
            priority='normal'
        )
        
        # API 호출
        response = self.client.get('/api/v1/queue/my-current/')
        
        # 응답 확인
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        if 'results' in data:
            queues = data['results']
        else:
            queues = data
        
        self.assertEqual(len(queues), 2)
        
        # 상태 확인 (ongoing이 없어야 함)
        for queue in queues:
            self.assertNotEqual(queue['state'], 'ongoing')
            self.assertIn(queue['state'], ['waiting', 'completed', 'in_progress'])
    
    def test_state_normalization_in_api_response(self):
        """API 응답에서 상태 정규화 확인"""
        # 'in_progress' 상태의 큐 생성
        Queue.objects.create(
            user=self.user,
            appointment=self.appointment,
            exam=self.exam,
            state=QueueDetailState.IN_PROGRESS.value,  # 'in_progress'
            queue_number=1,
            estimated_wait_time=0,
            priority='normal'
        )
        
        # PatientState 생성
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.IN_PROGRESS.value  # 'IN_PROGRESS'
        )
        
        # 현재 상태 API 호출
        response = self.client.get('/api/v1/queue/patient-journey/current_state/')
        
        # 응답 확인
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(data['journey_state'], 'IN_PROGRESS')
        self.assertEqual(data['queue_details'][0]['state'], 'in_progress')
        
        # 'ongoing' 또는 'ONGOING'이 없는지 확인
        response_text = json.dumps(data)
        self.assertNotIn('ongoing', response_text.lower())
        self.assertNotIn('ONGOING', response_text)


class TestPatientJourneyFlow(TransactionTestCase):
    """전체 환자 여정 플로우 테스트"""
    
    def setUp(self):
        """테스트 초기 설정"""
        self.client = APIClient()
        
        # 테스트 사용자 생성
        self.user = User.objects.create_user(
            email='flow@test.com',
            password='testpass123',
            name='플로우 테스트',
            phone_number='010-5555-4444',
            birth_date='1988-08-08',
            role='patient'
        )
        
        # JWT 토큰 생성 및 인증
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        # 테스트 데이터 생성
        self.setup_test_data()
    
    def setup_test_data(self):
        """테스트 데이터 설정"""
        # 검사 생성
        self.exam1 = Exam.objects.create(
            exam_id='FLOW_EXAM_001',
            title='X-Ray',
            description='흉부 X-Ray',
            department='영상의학과',
            building='본관',
            floor='2',
            room='201호',
            average_duration=20,
            buffer_time=10,
            x_coord=100.0,
            y_coord=100.0
        )
        
        self.exam2 = Exam.objects.create(
            exam_id='FLOW_EXAM_002',
            title='Blood Test',
            description='혈액 검사',
            department='진단검사의학과',
            building='본관',
            floor='3',
            room='301호',
            average_duration=15,
            buffer_time=5,
            x_coord=200.0,
            y_coord=200.0
        )
        
        # 예약 생성
        self.appointment1 = Appointment.objects.create(
            appointment_id='FLOW_APT_001',
            user=self.user,
            exam=self.exam1,
            scheduled_at=timezone.now() + timedelta(hours=1),
            status='scheduled'
        )
        
        self.appointment2 = Appointment.objects.create(
            appointment_id='FLOW_APT_002',
            user=self.user,
            exam=self.exam2,
            scheduled_at=timezone.now() + timedelta(hours=2),
            status='scheduled'
        )
    
    @patch('p_queue.services.async_to_sync')
    def test_complete_patient_journey(self, mock_async):
        """완전한 환자 여정 테스트 (UNREGISTERED → FINISHED)"""
        mock_async.return_value = MagicMock()
        
        # 1. 초기 상태: UNREGISTERED
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.UNREGISTERED.value
        )
        
        # 2. NFC 스캔 → ARRIVED
        response = self.client.post('/api/v1/queue/patient-journey/perform_action/', {
            'action_type': 'scan_nfc',
            'payload': {'tag_id': 'test_tag'}
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['journey_state'], PatientJourneyState.ARRIVED.value)
        
        # 3. 등록 → REGISTERED
        response = self.client.post('/api/v1/queue/patient-journey/perform_action/', {
            'action_type': 'register',
            'payload': {}
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['journey_state'], PatientJourneyState.REGISTERED.value)
        
        # 4. 도착 확인 → WAITING
        response = self.client.post('/api/v1/queue/patient-journey/perform_action/', {
            'action_type': 'confirm_arrival',
            'payload': {'appointment_id': self.appointment1.appointment_id}
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['journey_state'], PatientJourneyState.WAITING.value)
        
        # 큐 생성 확인
        queue = Queue.objects.filter(
            user=self.user,
            appointment=self.appointment1
        ).first()
        self.assertIsNotNone(queue)
        self.assertEqual(queue.state, QueueDetailState.WAITING.value)
        
        # 5. 의료진이 호출 → CALLED
        # 여기서는 직접 상태 변경 (실제로는 관리자 API 사용)
        patient_state = PatientState.objects.get(user=self.user)
        patient_state.current_state = PatientJourneyState.CALLED.value
        patient_state.save()
        
        queue.state = QueueDetailState.CALLED.value
        queue.save()
        
        # 6. 검사실 입장 → IN_PROGRESS
        response = self.client.post('/api/v1/queue/patient-journey/perform_action/', {
            'action_type': 'enter_exam_room',
            'payload': {}
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['journey_state'], PatientJourneyState.IN_PROGRESS.value)
        
        # 큐 상태 확인 (ongoing이 아닌 in_progress)
        queue.refresh_from_db()
        self.assertEqual(queue.state, QueueDetailState.IN_PROGRESS.value)
        self.assertNotEqual(queue.state, 'ongoing')
        
        # 7. 검사 완료 → COMPLETED
        response = self.client.post('/api/v1/queue/patient-journey/perform_action/', {
            'action_type': 'complete_exam',
            'payload': {}
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['journey_state'], PatientJourneyState.COMPLETED.value)
        
        # 8. 수납 → PAYMENT
        response = self.client.post('/api/v1/queue/patient-journey/perform_action/', {
            'action_type': 'make_payment',
            'payload': {}
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['journey_state'], PatientJourneyState.PAYMENT.value)
        
        # 9. 수납 완료 → FINISHED
        response = self.client.post('/api/v1/queue/patient-journey/perform_action/', {
            'action_type': 'make_payment',
            'payload': {'completed': True}
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['journey_state'], PatientJourneyState.FINISHED.value)
        
        # 최종 상태 확인
        patient_state.refresh_from_db()
        self.assertEqual(patient_state.current_state, PatientJourneyState.FINISHED.value)
    
    def test_multiple_exams_flow(self):
        """여러 검사가 있는 경우의 플로우 테스트"""
        # 초기 상태 설정
        PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.REGISTERED.value
        )
        
        # 첫 번째 검사 대기열 생성
        queue1 = Queue.objects.create(
            user=self.user,
            appointment=self.appointment1,
            exam=self.exam1,
            state=QueueDetailState.WAITING.value,
            queue_number=3,
            estimated_wait_time=30,
            priority='normal'
        )
        
        # 두 번째 검사 대기열 생성
        queue2 = Queue.objects.create(
            user=self.user,
            appointment=self.appointment2,
            exam=self.exam2,
            state=QueueDetailState.WAITING.value,
            queue_number=5,
            estimated_wait_time=60,
            priority='normal'
        )
        
        # 현재 상태 조회
        response = self.client.get('/api/v1/queue/patient-journey/current_state/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data['queue_details']), 2)
        
        # 첫 번째 검사 진행
        queue1.state = QueueDetailState.IN_PROGRESS.value
        queue1.save()
        
        # 상태 조회
        response = self.client.get('/api/v1/queue/patient-journey/current_state/')
        data = response.json()
        
        # in_progress 큐 확인 (ongoing이 아님)
        in_progress_queues = [q for q in data['queue_details'] if q['state'] == 'in_progress']
        self.assertEqual(len(in_progress_queues), 1)
        
        ongoing_queues = [q for q in data['queue_details'] if q['state'] == 'ongoing']
        self.assertEqual(len(ongoing_queues), 0)
    
    def tearDown(self):
        """테스트 정리"""
        # 생성된 테스트 데이터 정리
        Queue.objects.all().delete()
        PatientState.objects.all().delete()
        Appointment.objects.all().delete()
        Exam.objects.all().delete()
        User.objects.all().delete()