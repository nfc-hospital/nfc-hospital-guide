"""
p_queue 앱의 실제 테스트 케이스
Django TestCase를 사용하여 격리된 환경에서 테스트 실행
"""

from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from authentication.models import User
from appointments.models import Appointment, Exam
from p_queue.models import Queue, PatientState, StateTransition
from datetime import datetime, timezone
import uuid


class PatientStateTestCase(TestCase):
    """환자 상태 관리 관련 테스트"""
    
    def setUp(self):
        """각 테스트 메서드 실행 전 호출"""
        # 테스트용 환자 생성
        self.test_patient = User.objects.create_user(
            email='test_patient@example.com',
            password='testpass123',
            name='테스트환자',
            phone_number='010-9999-8888',
            birth_date='1990-01-01',
            role='patient'
        )
        
        # 테스트용 검사 생성
        self.test_exam = Exam.objects.create(
            exam_id='test-xray',
            title='테스트 X선 검사',
            description='테스트용 검사',
            department='영상의학과',
            building='본관',
            floor='2F',
            room='201호',
            average_duration=30,
            buffer_time=10,
            x_coord=100.0,
            y_coord=200.0
        )
        
        # 테스트용 예약 생성
        self.test_appointment = Appointment.objects.create(
            appointment_id=f'test-apt-{uuid.uuid4().hex[:8]}',
            user=self.test_patient,
            exam=self.test_exam,
            scheduled_at=datetime.now(timezone.utc),
            status='scheduled'
        )
    
    def tearDown(self):
        """각 테스트 메서드 실행 후 호출"""
        # Django TestCase는 자동으로 트랜잭션 롤백을 수행하므로
        # 명시적인 데이터 삭제는 필요하지 않음
        pass
    
    def test_patient_state_creation(self):
        """환자 상태 생성 테스트"""
        patient_state = PatientState.objects.create(
            user=self.test_patient,
            current_state='UNREGISTERED',
            is_logged_in=False
        )
        
        self.assertEqual(patient_state.current_state, 'UNREGISTERED')
        self.assertFalse(patient_state.is_logged_in)
        self.assertEqual(patient_state.user.user_id, self.test_patient.id)
    
    def test_patient_state_transition(self):
        """환자 상태 전환 테스트"""
        # 초기 상태 생성
        patient_state = PatientState.objects.create(
            user=self.test_patient,
            current_state='UNREGISTERED',
            is_logged_in=False
        )
        
        # 상태 전환
        old_state = patient_state.current_state
        patient_state.current_state = 'ARRIVED'
        patient_state.is_logged_in = True
        patient_state.save()
        
        # 전환 기록 생성
        transition = StateTransition.objects.create(
            user=self.test_patient,
            from_state=old_state,
            to_state='ARRIVED',
            trigger_type='NFC_SCAN',
            trigger_source='nfc-lobby-001'
        )
        
        # 검증
        self.assertEqual(patient_state.current_state, 'ARRIVED')
        self.assertTrue(patient_state.is_logged_in)
        self.assertEqual(transition.from_state, 'UNREGISTERED')
        self.assertEqual(transition.to_state, 'ARRIVED')
    
    def test_multiple_state_transitions(self):
        """여러 번의 상태 전환 추적 테스트"""
        patient_state, _ = PatientState.objects.get_or_create(
            user=self.test_patient,
            defaults={'current_state': 'UNREGISTERED', 'is_logged_in': False}
        )
        
        # 상태 전환 시퀀스
        transitions = [
            ('UNREGISTERED', 'ARRIVED'),
            ('ARRIVED', 'REGISTERED'),
            ('REGISTERED', 'WAITING'),
            ('WAITING', 'CALLED'),
            ('CALLED', 'ONGOING'),
            ('ONGOING', 'COMPLETED')
        ]
        
        for from_state, to_state in transitions:
            patient_state.current_state = to_state
            patient_state.save()
            
            StateTransition.objects.create(
                user=self.test_patient,
                from_state=from_state,
                to_state=to_state,
                trigger_type='TEST',
                trigger_source='unit_test'
            )
        
        # 전체 전환 기록 검증
        all_transitions = StateTransition.objects.filter(
            user=self.test_patient
        ).order_by('created_at')
        
        self.assertEqual(all_transitions.count(), len(transitions))
        self.assertEqual(patient_state.current_state, 'COMPLETED')


class QueueManagementTestCase(TestCase):
    """대기열 관리 관련 테스트"""
    
    @classmethod
    def setUpTestData(cls):
        """테스트 클래스 전체에서 사용할 데이터 설정"""
        # 여러 테스트 환자 생성
        cls.patients = []
        for i in range(5):
            patient = User.objects.create_user(
                email=f'patient{i}@test.com',
                password='testpass123',
                name=f'테스트환자{i}',
                phone_number=f'010-9999-{i:04d}',
                birth_date='1990-01-01',
                role='patient'
            )
            cls.patients.append(patient)
        
        # 테스트 검사 생성
        cls.exam = Exam.objects.create(
            exam_id='test-blood',
            title='혈액검사',
            description='테스트용 혈액검사',
            department='진단검사의학과',
            building='본관',
            floor='3F',
            room='301호',
            average_duration=15,
            buffer_time=5,
            x_coord=150.0,
            y_coord=250.0
        )
    
    def setUp(self):
        """각 테스트 전 대기열 생성"""
        self.queues = []
        for i, patient in enumerate(self.patients):
            # 예약 생성
            appointment = Appointment.objects.create(
                appointment_id=f'test-apt-{i}',
                user=patient,
                exam=self.exam,
                scheduled_at=datetime.now(timezone.utc),
                status='scheduled'
            )
            
            # 대기열 생성
            queue = Queue.objects.create(
                user=patient,
                exam=self.exam,
                appointment=appointment,
                state='waiting',
                queue_number=i + 1,
                estimated_wait_time=i * 10,
                priority='normal'
            )
            self.queues.append(queue)
    
    def test_queue_ordering(self):
        """대기열 순서 테스트"""
        waiting_queues = Queue.objects.filter(
            exam=self.exam,
            state='waiting'
        ).order_by('queue_number')
        
        self.assertEqual(waiting_queues.count(), 5)
        
        # 순서 검증
        for i, queue in enumerate(waiting_queues):
            self.assertEqual(queue.queue_number, i + 1)
    
    def test_queue_state_change(self):
        """대기열 상태 변경 테스트"""
        first_queue = self.queues[0]
        
        # 호출 상태로 변경
        first_queue.state = 'called'
        first_queue.called_at = datetime.now(timezone.utc)
        first_queue.save()
        
        # 대기 중인 큐 수 확인
        waiting_count = Queue.objects.filter(
            exam=self.exam,
            state='waiting'
        ).count()
        
        self.assertEqual(waiting_count, 4)
        self.assertEqual(first_queue.state, 'called')
        self.assertIsNotNone(first_queue.called_at)
    
    def test_queue_priority_handling(self):
        """우선순위 처리 테스트"""
        # 응급 환자 추가
        emergency_patient = User.objects.create_user(
            email='emergency@test.com',
            password='testpass123',
            name='응급환자',
            phone_number='010-9999-9999',
            birth_date='1990-01-01',
            role='patient'
        )
        
        emergency_appointment = Appointment.objects.create(
            appointment_id='test-emergency',
            user=emergency_patient,
            exam=self.exam,
            scheduled_at=datetime.now(timezone.utc),
            status='scheduled'
        )
        
        emergency_queue = Queue.objects.create(
            user=emergency_patient,
            exam=self.exam,
            appointment=emergency_appointment,
            state='waiting',
            queue_number=0,  # 우선순위 큐는 0번
            estimated_wait_time=0,
            priority='emergency'
        )
        
        # 우선순위별 대기열 조회
        all_queues = Queue.objects.filter(
            exam=self.exam,
            state='waiting'
        ).order_by('-priority', 'queue_number')
        
        # 응급 환자가 첫 번째인지 확인
        self.assertEqual(all_queues.first().priority, 'emergency')
        self.assertEqual(all_queues.first().user.user_id, emergency_patient.id)


class QueueAPITestCase(APITestCase):
    """대기열 API 엔드포인트 테스트"""
    
    def setUp(self):
        """API 테스트 설정"""
        # 테스트 환자 생성 및 로그인
        self.patient = User.objects.create_user(
            email='api_test@example.com',
            password='testpass123',
            name='API테스트환자',
            phone_number='010-8888-7777',
            birth_date='1990-01-01',
            role='patient'
        )
        
        # 인증 토큰 획득
        response = self.client.post(reverse('auth:simple-login'), {
            'phoneLast4': '7777',
            'birthDate': '900101'
        })
        
        if response.status_code == 200:
            self.access_token = response.data['data']['tokens']['access']
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # 테스트 검사 및 예약 생성
        self.exam = Exam.objects.create(
            exam_id='api-test-exam',
            title='API 테스트 검사',
            description='API 테스트용',
            department='테스트과',
            building='본관',
            floor='1F',
            room='101호',
            average_duration=20,
            buffer_time=5,
            x_coord=50.0,
            y_coord=50.0
        )
        
        self.appointment = Appointment.objects.create(
            appointment_id='api-test-apt',
            user=self.patient,
            exam=self.exam,
            scheduled_at=datetime.now(timezone.utc),
            status='scheduled'
        )
    
    def test_join_queue(self):
        """대기열 참가 API 테스트"""
        url = reverse('queue-join')
        data = {
            'appointment_id': self.appointment.appointment_id,
            'priority': 'normal'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('queue_id', response.data['data'])
        
        # 대기열 생성 확인
        queue = Queue.objects.get(appointment=self.appointment)
        self.assertEqual(queue.state, 'waiting')
        self.assertEqual(queue.user.user_id, self.patient.id)
    
    def test_my_position(self):
        """내 대기 순서 조회 API 테스트"""
        # 먼저 대기열에 참가
        queue = Queue.objects.create(
            user=self.patient,
            exam=self.exam,
            appointment=self.appointment,
            state='waiting',
            queue_number=5,
            estimated_wait_time=30,
            priority='normal'
        )
        
        url = reverse('my-position')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']['queues']), 1)
        
        queue_data = response.data['data']['queues'][0]
        self.assertEqual(queue_data['queue_number'], 5)
        self.assertEqual(queue_data['state'], 'waiting')
    
    def test_unauthorized_access(self):
        """인증되지 않은 접근 테스트"""
        # 인증 토큰 제거
        self.client.credentials()
        
        url = reverse('my-position')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TransactionTestCase(TransactionTestCase):
    """트랜잭션이 필요한 복잡한 테스트"""
    
    def test_concurrent_queue_updates(self):
        """동시 대기열 업데이트 테스트"""
        # 여러 사용자가 동시에 대기열에 참가하는 시나리오
        # TransactionTestCase를 사용하여 실제 트랜잭션 동작 테스트
        
        from django.db import transaction
        from threading import Thread
        import time
        
        exam = Exam.objects.create(
            exam_id='concurrent-test',
            title='동시성 테스트',
            description='동시성 테스트용',
            department='테스트과',
            building='본관',
            floor='1F',
            room='101호',
            average_duration=20,
            buffer_time=5,
            x_coord=0.0,
            y_coord=0.0
        )
        
        results = []
        
        def create_queue(user_id):
            """대기열 생성 함수"""
            try:
                with transaction.atomic():
                    user = User.objects.create_user(
                        email=f'concurrent{user_id}@test.com',
                        password='testpass123',
                        name=f'동시성테스트{user_id}',
                        phone_number=f'010-7777-{user_id:04d}',
                        birth_date='1990-01-01',
                        role='patient'
                    )
                    
                    appointment = Appointment.objects.create(
                        appointment_id=f'concurrent-apt-{user_id}',
                        user=user,
                        exam=exam,
                        scheduled_at=datetime.now(timezone.utc),
                        status='scheduled'
                    )
                    
                    # 현재 대기 인원 수 계산
                    current_count = Queue.objects.filter(
                        exam=exam,
                        state='waiting'
                    ).count()
                    
                    queue = Queue.objects.create(
                        user=user,
                        exam=exam,
                        appointment=appointment,
                        state='waiting',
                        queue_number=current_count + 1,
                        estimated_wait_time=current_count * 10,
                        priority='normal'
                    )
                    
                    results.append(queue.queue_number)
            except Exception as e:
                results.append(f'Error: {str(e)}')
        
        # 5개의 스레드로 동시 실행
        threads = []
        for i in range(5):
            thread = Thread(target=create_queue, args=(i,))
            threads.append(thread)
            thread.start()
        
        # 모든 스레드 완료 대기
        for thread in threads:
            thread.join()
        
        # 결과 검증 - 큐 번호가 중복되지 않아야 함
        queue_numbers = [r for r in results if isinstance(r, int)]
        self.assertEqual(len(queue_numbers), len(set(queue_numbers)),
                        "큐 번호가 중복되었습니다")
        
        # 생성된 큐 수 확인
        total_queues = Queue.objects.filter(exam=exam).count()
        self.assertEqual(total_queues, 5)