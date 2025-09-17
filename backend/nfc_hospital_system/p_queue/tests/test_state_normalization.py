"""
상태 정규화 테스트
V2 리팩토링 - ongoing → in_progress 정규화 검증
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import connection
from django.utils import timezone
from datetime import timedelta

from p_queue.models import Queue, PatientState, QueueStatusLog
from appointments.models import Appointment, Exam
from common.state_definitions import QueueDetailState, PatientJourneyState

User = get_user_model()


class TestStateNormalization(TestCase):
    """상태 정규화 테스트"""
    
    def setUp(self):
        """테스트 초기 설정"""
        # 테스트 사용자 생성
        self.user = User.objects.create_user(
            email='normalize@test.com',
            password='testpass123',
            name='정규화 테스트',
            phone_number='010-9999-8888',
            birth_date='1985-05-05',
            role='patient'
        )
        
        # 테스트 검사 생성
        self.exam = Exam.objects.create(
            exam_id='NORM_EXAM_001',
            title='정규화 테스트 검사',
            description='상태 정규화 테스트용',
            department='테스트과',
            building='테스트동',
            floor='1',
            room='101호',
            average_duration=20,
            buffer_time=5,
            x_coord=50.0,
            y_coord=50.0
        )
        
        # 테스트 예약 생성
        self.appointment = Appointment.objects.create(
            appointment_id='NORM_APT_001',
            user=self.user,
            exam=self.exam,
            scheduled_at=timezone.now() + timedelta(hours=1),
            status='scheduled'
        )
    
    def test_queue_state_values_are_normalized(self):
        """Queue 모델의 STATE_CHOICES에 'ongoing'이 없는지 확인"""
        # Queue 모델의 STATE_CHOICES 확인
        state_values = [choice[0] for choice in Queue.STATE_CHOICES]
        
        # 'ongoing'이 없어야 함
        self.assertNotIn('ongoing', state_values)
        
        # 'in_progress'가 있어야 함
        self.assertIn('in_progress', state_values)
    
    def test_patient_state_values_are_normalized(self):
        """PatientState 모델의 STATE_CHOICES에 'ONGOING'이 없는지 확인"""
        # PatientState 모델의 STATE_CHOICES 확인
        state_values = [choice[0] for choice in PatientState.STATE_CHOICES]
        
        # 'ONGOING'이 없어야 함
        self.assertNotIn('ONGOING', state_values)
        
        # 'IN_PROGRESS'가 있어야 함
        self.assertIn('IN_PROGRESS', state_values)
    
    def test_queue_detail_state_enum_values(self):
        """QueueDetailState enum에 올바른 값이 있는지 확인"""
        # QueueDetailState enum 값 확인
        self.assertEqual(QueueDetailState.IN_PROGRESS.value, 'in_progress')
        self.assertNotEqual(QueueDetailState.IN_PROGRESS.value, 'ongoing')
        
        # 모든 상태 값 확인
        all_states = [state.value for state in QueueDetailState]
        self.assertNotIn('ongoing', all_states)
        self.assertIn('in_progress', all_states)
    
    def test_patient_journey_state_enum_values(self):
        """PatientJourneyState enum에 올바른 값이 있는지 확인"""
        # PatientJourneyState enum 값 확인
        self.assertEqual(PatientJourneyState.IN_PROGRESS.value, 'IN_PROGRESS')
        self.assertNotEqual(PatientJourneyState.IN_PROGRESS.value, 'ONGOING')
        
        # 모든 상태 값 확인
        all_states = [state.value for state in PatientJourneyState]
        self.assertNotIn('ONGOING', all_states)
        self.assertIn('IN_PROGRESS', all_states)
    
    def test_no_ongoing_in_new_queues(self):
        """새로 생성되는 Queue에 'ongoing' 상태가 없는지 확인"""
        # 새 Queue 생성
        queue = Queue.objects.create(
            user=self.user,
            appointment=self.appointment,
            exam=self.exam,
            state=QueueDetailState.IN_PROGRESS.value,  # 'in_progress' 사용
            queue_number=1,
            estimated_wait_time=0,
            priority='normal'
        )
        
        # 상태 확인
        self.assertEqual(queue.state, 'in_progress')
        self.assertNotEqual(queue.state, 'ongoing')
        
        # DB에서 다시 조회
        queue_from_db = Queue.objects.get(queue_id=queue.queue_id)
        self.assertEqual(queue_from_db.state, 'in_progress')
    
    def test_no_ongoing_in_new_patient_states(self):
        """새로 생성되는 PatientState에 'ONGOING' 상태가 없는지 확인"""
        # 새 PatientState 생성
        patient_state = PatientState.objects.create(
            user=self.user,
            current_state=PatientJourneyState.IN_PROGRESS.value  # 'IN_PROGRESS' 사용
        )
        
        # 상태 확인
        self.assertEqual(patient_state.current_state, 'IN_PROGRESS')
        self.assertNotEqual(patient_state.current_state, 'ONGOING')
        
        # DB에서 다시 조회
        ps_from_db = PatientState.objects.get(state_id=patient_state.state_id)
        self.assertEqual(ps_from_db.current_state, 'IN_PROGRESS')
    
    def test_queue_status_log_normalization(self):
        """QueueStatusLog에 'ongoing' 상태가 기록되지 않는지 확인"""
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
        
        # 상태 변경 및 로그 생성
        queue.state = QueueDetailState.IN_PROGRESS.value
        queue.save()
        
        # QueueStatusLog 생성
        log = QueueStatusLog.objects.create(
            queue=queue,
            previous_state=QueueDetailState.WAITING.value,
            new_state=QueueDetailState.IN_PROGRESS.value,
            reason='테스트 상태 변경'
        )
        
        # 로그 확인
        self.assertEqual(log.new_state, 'in_progress')
        self.assertNotEqual(log.new_state, 'ongoing')
    
    def test_database_has_no_ongoing_records(self):
        """데이터베이스에 'ongoing' 레코드가 없는지 확인"""
        # Queue 테이블 확인
        ongoing_queues = Queue.objects.filter(state='ongoing').count()
        self.assertEqual(ongoing_queues, 0, "Queue 테이블에 'ongoing' 상태가 있습니다")
        
        # PatientState 테이블 확인
        ongoing_patients = PatientState.objects.filter(current_state='ONGOING').count()
        self.assertEqual(ongoing_patients, 0, "PatientState 테이블에 'ONGOING' 상태가 있습니다")
        
        # QueueStatusLog 테이블 확인
        ongoing_logs_prev = QueueStatusLog.objects.filter(previous_state='ongoing').count()
        ongoing_logs_new = QueueStatusLog.objects.filter(new_state='ongoing').count()
        self.assertEqual(ongoing_logs_prev, 0, "QueueStatusLog에 previous_state='ongoing'이 있습니다")
        self.assertEqual(ongoing_logs_new, 0, "QueueStatusLog에 new_state='ongoing'이 있습니다")
    
    def test_appointment_status_normalization(self):
        """Appointment 상태 정규화 확인"""
        # Appointment 상태 변경
        self.appointment.status = 'in_progress'
        self.appointment.save()
        
        # 확인
        self.assertEqual(self.appointment.status, 'in_progress')
        self.assertNotEqual(self.appointment.status, 'ongoing')
        
        # DB에서 다시 조회
        apt_from_db = Appointment.objects.get(appointment_id=self.appointment.appointment_id)
        self.assertEqual(apt_from_db.status, 'in_progress')
    
    def test_raw_sql_query_no_ongoing(self):
        """Raw SQL 쿼리로 'ongoing' 레코드 확인"""
        with connection.cursor() as cursor:
            # Queue 테이블 확인
            cursor.execute("SELECT COUNT(*) FROM queues WHERE state = %s", ['ongoing'])
            queue_count = cursor.fetchone()[0]
            self.assertEqual(queue_count, 0, "Raw SQL: Queue 테이블에 'ongoing'이 있습니다")
            
            # PatientState 테이블 확인
            cursor.execute("SELECT COUNT(*) FROM patient_states WHERE current_state = %s", ['ONGOING'])
            ps_count = cursor.fetchone()[0]
            self.assertEqual(ps_count, 0, "Raw SQL: PatientState 테이블에 'ONGOING'이 있습니다")
            
            # Appointment 테이블 확인
            cursor.execute("SELECT COUNT(*) FROM appointments WHERE status = %s", ['ongoing'])
            apt_count = cursor.fetchone()[0]
            self.assertEqual(apt_count, 0, "Raw SQL: Appointment 테이블에 'ongoing'이 있습니다")
    
    def test_state_mapping_consistency(self):
        """상태 매핑의 일관성 확인"""
        from common.state_definitions import QUEUE_TO_JOURNEY_MAPPING, JOURNEY_TO_QUEUE_MAPPING
        
        # Queue → Journey 매핑 확인
        queue_mapped = QUEUE_TO_JOURNEY_MAPPING.get(QueueDetailState.IN_PROGRESS)
        self.assertEqual(queue_mapped, PatientJourneyState.IN_PROGRESS)
        
        # Journey → Queue 역매핑 확인
        journey_mapped = JOURNEY_TO_QUEUE_MAPPING.get(PatientJourneyState.IN_PROGRESS)
        self.assertEqual(journey_mapped, QueueDetailState.IN_PROGRESS)
        
        # 'ongoing' 키가 매핑에 없는지 확인
        self.assertNotIn('ongoing', [k.value for k in QUEUE_TO_JOURNEY_MAPPING.keys()])
        self.assertNotIn('ONGOING', [k.value for k in JOURNEY_TO_QUEUE_MAPPING.keys()])
    
    def tearDown(self):
        """테스트 정리"""
        # 생성된 테스트 데이터 정리
        QueueStatusLog.objects.all().delete()
        Queue.objects.all().delete()
        PatientState.objects.all().delete()
        Appointment.objects.all().delete()
        Exam.objects.all().delete()
        User.objects.all().delete()