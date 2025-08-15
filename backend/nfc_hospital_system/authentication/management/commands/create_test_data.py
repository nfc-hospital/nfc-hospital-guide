"""
테스트 데이터 생성 스크립트
각 상태별 테스트 계정과 관련 데이터를 생성합니다.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from authentication.models import User
from appointments.models import Appointment, Exam
from integrations.models import EmrSyncStatus
from p_queue.models import Queue, PatientState
from django.utils import timezone
import uuid


class Command(BaseCommand):
    help = '각 상태별 테스트 계정과 데이터를 생성합니다'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('테스트 데이터 생성을 시작합니다...'))
        
        # 테스트용 검사 데이터 생성
        exam1, _ = Exam.objects.get_or_create(
            exam_id='exam_001',
            defaults={
                'title': '혈액검사',
                'description': '기본 혈액 검사',
                'department': '진단검사의학과',
                'building': '본관',
                'floor': '2',
                'room': '201',
                'average_duration': 15,
                'buffer_time': 5
            }
        )
        
        exam2, _ = Exam.objects.get_or_create(
            exam_id='exam_002',
            defaults={
                'title': 'X-Ray 촬영',
                'description': '흉부 X-Ray',
                'department': '영상의학과',
                'building': '본관',
                'floor': '1',
                'room': '105',
                'average_duration': 10,
                'buffer_time': 5
            }
        )
        
        exam3, _ = Exam.objects.get_or_create(
            exam_id='exam_003',
            defaults={
                'title': '심전도 검사',
                'description': '기본 심전도 검사',
                'department': '순환기내과',
                'building': '본관',
                'floor': '3',
                'room': '301',
                'average_duration': 20,
                'buffer_time': 5
            }
        )
        
        now = timezone.now()
        
        # 1. REGISTERED 상태 테스트 계정
        user_registered, created = User.objects.get_or_create(
            email='test_registered@test.com',
            defaults={
                'name': '등록완료 테스트',
                'phone_number': '010-1111-1111',
                'birth_date': '1990-01-01',
                'role': 'patient',
                'patient_id': 'P001'
            }
        )
        if created:
            user_registered.set_password('test1234')
            user_registered.save()
        
        # PatientState 생성
        PatientState.objects.update_or_create(
            user=user_registered,
            defaults={
                'current_state': 'REGISTERED',
                'is_logged_in': True,
                'current_exam': exam1.exam_id
            }
        )
        
        # 오늘 예약 3개 생성
        for i, exam in enumerate([exam1, exam2, exam3], 1):
            apt, _ = Appointment.objects.get_or_create(
                appointment_id=f'APT_REG_{i}',  # Primary Key로 조회
                defaults={
                    'user': user_registered,
                    'exam': exam,
                    'scheduled_at': now + timedelta(hours=i),
                    'status': 'scheduled'
                }
            )
            # EMR 동기화 상태 생성 - user 필드 사용
            EmrSyncStatus.objects.get_or_create(
                user=user_registered,
                sync_id=f'EMR_REG_{i}',
                defaults={
                    'patient_emr_id': f'EMR_P001_{i}',
                    'last_sync_time': timezone.now(),
                    'sync_success': True,
                    'retry_count': 0,
                    'emr_appointment_date': now.date(),
                    'emr_appointment_time': (now + timedelta(hours=i)).time(),
                    'emr_department': exam.department,
                    'emr_room_number': exam.room,
                    'mapped_state': 'scheduled',
                    'mapping_rules_version': '1.0'
                }
            )
        
        # 2. WAITING 상태 테스트 계정
        user_waiting, created = User.objects.get_or_create(
            email='test_waiting@test.com',
            defaults={
                'name': '대기중 테스트',
                'phone_number': '010-2222-2222',
                'birth_date': '1985-05-05',
                'role': 'patient',
                'patient_id': 'P002'
            }
        )
        if created:
            user_waiting.set_password('test1234')
            user_waiting.save()
        
        PatientState.objects.update_or_create(
            user=user_waiting,
            defaults={
                'current_state': 'WAITING',
                'is_logged_in': True,
                'current_exam': exam1.exam_id
            }
        )
        
        # 예약 3개와 대기열 2개 생성
        appointments_waiting = []
        for i, exam in enumerate([exam1, exam2, exam3], 1):
            apt, _ = Appointment.objects.get_or_create(
                appointment_id=f'APT_WAIT_{i}',  # Primary Key로 조회
                defaults={
                    'user': user_waiting,
                    'exam': exam,
                    'scheduled_at': now + timedelta(hours=i),
                    'status': 'scheduled'
                }
            )
            # EMR 동기화 상태 생성 - user 필드 사용
            EmrSyncStatus.objects.get_or_create(
                user=user_waiting,
                sync_id=f'EMR_WAIT_{i}',
                defaults={
                    'patient_emr_id': f'EMR_P002_{i}',
                    'last_sync_time': timezone.now(),
                    'sync_success': True,
                    'retry_count': 0,
                    'emr_appointment_date': now.date(),
                    'emr_appointment_time': (now + timedelta(hours=i)).time(),
                    'emr_department': exam.department,
                    'emr_room_number': exam.room,
                    'mapped_state': 'scheduled',
                    'mapping_rules_version': '1.0'
                }
            )
            appointments_waiting.append(apt)
        
        # 첫 2개 예약에 대해 대기열 생성
        for i, apt in enumerate(appointments_waiting[:2], 1):
            Queue.objects.get_or_create(
                appointment=apt,
                user=user_waiting,
                exam=apt.exam,
                defaults={
                    'queue_id': uuid.uuid4(),
                    'state': 'waiting',
                    'queue_number': i,
                    'estimated_wait_time': 15 * i,
                    'priority': 'normal'
                }
            )
        
        # 3. ONGOING 상태 테스트 계정
        user_ongoing, created = User.objects.get_or_create(
            email='test_ongoing@test.com',
            defaults={
                'name': '진행중 테스트',
                'phone_number': '010-3333-3333',
                'birth_date': '1992-12-12',
                'role': 'patient',
                'patient_id': 'P003'
            }
        )
        if created:
            user_ongoing.set_password('test1234')
            user_ongoing.save()
        
        PatientState.objects.update_or_create(
            user=user_ongoing,
            defaults={
                'current_state': 'ONGOING',
                'is_logged_in': True,
                'current_exam': exam1.exam_id
            }
        )
        
        # 예약 3개와 대기열 2개 (하나는 진행중)
        appointments_ongoing = []
        for i, exam in enumerate([exam1, exam2, exam3], 1):
            apt, _ = Appointment.objects.get_or_create(
                appointment_id=f'APT_ONG_{i}',  # Primary Key로 조회
                defaults={
                    'user': user_ongoing,
                    'exam': exam,
                    'scheduled_at': now + timedelta(hours=i),
                    'status': 'ongoing' if i == 1 else 'scheduled'
                }
            )
            # EMR 동기화 상태 생성 - user 필드 사용
            EmrSyncStatus.objects.get_or_create(
                user=user_ongoing,
                sync_id=f'EMR_ONG_{i}',
                defaults={
                    'patient_emr_id': f'EMR_P003_{i}',
                    'last_sync_time': timezone.now(),
                    'sync_success': True,
                    'retry_count': 0,
                    'emr_appointment_date': now.date(),
                    'emr_appointment_time': (now + timedelta(hours=i)).time(),
                    'emr_department': exam.department,
                    'emr_room_number': exam.room,
                    'mapped_state': 'ongoing' if i == 1 else 'scheduled',
                    'mapping_rules_version': '1.0'
                }
            )
            appointments_ongoing.append(apt)
        
        # 첫 번째는 진행중, 두 번째는 대기중
        Queue.objects.get_or_create(
            appointment=appointments_ongoing[0],
            user=user_ongoing,
            exam=appointments_ongoing[0].exam,
            defaults={
                'queue_id': uuid.uuid4(),
                'state': 'ongoing',
                'queue_number': 1,
                'estimated_wait_time': 0,
                'priority': 'normal',
                'called_at': now - timedelta(minutes=5)
            }
        )
        
        Queue.objects.get_or_create(
            appointment=appointments_ongoing[1],
            user=user_ongoing,
            exam=appointments_ongoing[1].exam,
            defaults={
                'queue_id': uuid.uuid4(),
                'state': 'waiting',
                'queue_number': 2,
                'estimated_wait_time': 20,
                'priority': 'normal'
            }
        )
        
        # 4. PAYMENT 상태 테스트 계정
        user_payment, created = User.objects.get_or_create(
            email='test_payment@test.com',
            defaults={
                'name': '수납대기 테스트',
                'phone_number': '010-4444-4444',
                'birth_date': '1988-08-08',
                'role': 'patient',
                'patient_id': 'P004'
            }
        )
        if created:
            user_payment.set_password('test1234')
            user_payment.save()
        
        PatientState.objects.update_or_create(
            user=user_payment,
            defaults={
                'current_state': 'PAYMENT',
                'is_logged_in': True
            }
        )
        
        # 예약 2개, 모두 완료된 대기열
        for i, exam in enumerate([exam1, exam2], 1):
            apt, _ = Appointment.objects.get_or_create(
                appointment_id=f'APT_PAY_{i}',  # Primary Key로 조회
                defaults={
                    'user': user_payment,
                    'exam': exam,
                    'scheduled_at': now - timedelta(hours=i),
                    'status': 'done'
                }
            )
            # EMR 동기화 상태 생성 - user 필드 사용
            EmrSyncStatus.objects.get_or_create(
                user=user_payment,
                sync_id=f'EMR_PAY_{i}',
                defaults={
                    'patient_emr_id': f'EMR_P004_{i}',
                    'last_sync_time': timezone.now(),
                    'sync_success': True,
                    'retry_count': 0,
                    'emr_appointment_date': now.date(),
                    'emr_appointment_time': (now - timedelta(hours=i)).time(),
                    'emr_department': exam.department,
                    'emr_room_number': exam.room,
                    'mapped_state': 'done',
                    'mapping_rules_version': '1.0'
                }
            )
            
            Queue.objects.get_or_create(
                appointment=apt,
                user=user_payment,
                exam=apt.exam,
                defaults={
                    'queue_id': uuid.uuid4(),
                    'state': 'completed',
                    'queue_number': i,
                    'estimated_wait_time': 0,
                    'priority': 'normal',
                    'called_at': now - timedelta(hours=i+1)
                }
            )
        
        # 5. FINISHED 상태 테스트 계정
        user_finished, created = User.objects.get_or_create(
            email='test_finished@test.com',
            defaults={
                'name': '완료 테스트',
                'phone_number': '010-5555-5555',
                'birth_date': '1995-03-15',
                'role': 'patient',
                'patient_id': 'P005'
            }
        )
        if created:
            user_finished.set_password('test1234')
            user_finished.save()
        
        PatientState.objects.update_or_create(
            user=user_finished,
            defaults={
                'current_state': 'FINISHED',
                'is_logged_in': True
            }
        )
        
        self.stdout.write(self.style.SUCCESS('\n=== 테스트 계정 정보 ==='))
        self.stdout.write('모든 계정의 비밀번호: test1234\n')
        
        test_accounts = [
            ('test_registered@test.com', 'REGISTERED', '접수/로그인 완료 상태, 예약 3개'),
            ('test_waiting@test.com', 'WAITING', '대기중 상태, 예약 3개, 대기열 2개'),
            ('test_ongoing@test.com', 'ONGOING', '검사 진행중 상태, 예약 3개, 대기열 2개(1개 진행중)'),
            ('test_payment@test.com', 'PAYMENT', '수납 대기 상태, 예약 2개(완료), 대기열 2개(완료)'),
            ('test_finished@test.com', 'FINISHED', '모든 일정 완료 상태'),
        ]
        
        for email, state, description in test_accounts:
            self.stdout.write(f'\n{state}:')
            self.stdout.write(f'  Email: {email}')
            self.stdout.write(f'  설명: {description}')
        
        self.stdout.write(self.style.SUCCESS('\n테스트 데이터 생성이 완료되었습니다!'))