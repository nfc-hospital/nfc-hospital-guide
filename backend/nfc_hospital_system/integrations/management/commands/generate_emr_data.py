from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, models
from datetime import datetime, timedelta
from p_queue.models import Queue, QueueStatusLog, PatientState
from appointments.models import Appointment, Exam
from authentication.models import User
from integrations.models import EmrSyncStatus
from common.state_definitions import PatientJourneyState, QueueDetailState
import random
import uuid
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = '실제 병원과 유사한 패턴의 Queue 데이터를 생성합니다'

    def add_arguments(self, parser):
        parser.add_argument(
            '--months',
            type=int,
            default=3,
            help='생성할 데이터의 개월 수 (기본값: 3개월)'
        )
        parser.add_argument(
            '--daily-patients',
            type=int,
            default=250,
            help='일일 평균 환자 수 (기본값: 250명)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='기존 데이터를 삭제하고 새로 생성'
        )

    def handle(self, *args, **options):
        months = options['months']
        daily_patients = options['daily_patients']
        clear = options['clear']

        self.stdout.write(f'🏥 병원 대기 데이터 생성 시작')
        self.stdout.write(f'   - 기간: {months}개월')
        self.stdout.write(f'   - 일일 환자: {daily_patients}명')

        if clear:
            self.clear_existing_data()

        # 부서별 대기시간 패턴 (실제 병원 데이터 기반)
        self.DEPT_WAIT_PATTERNS = {
            '내과': {
                'base_wait': 35,  # 기본 대기시간 35분
                'peak_multiplier': 1.8,
                'avg_service_time': 15,
                'distribution': 0.25  # 25% 환자
            },
            '정형외과': {
                'base_wait': 25,
                'peak_multiplier': 2.0,
                'avg_service_time': 20,
                'distribution': 0.20
            },
            '영상의학과': {
                'base_wait': 20,
                'peak_multiplier': 1.5,
                'avg_service_time': 10,
                'distribution': 0.15
            },
            'X-ray실': {
                'base_wait': 10,
                'peak_multiplier': 1.5,
                'avg_service_time': 5,
                'distribution': 0.10
            },
            'CT실': {
                'base_wait': 30,
                'peak_multiplier': 1.3,
                'avg_service_time': 10,
                'distribution': 0.08
            },
            'MRI실': {
                'base_wait': 45,
                'peak_multiplier': 1.2,
                'avg_service_time': 30,
                'distribution': 0.08
            },
            '진단검사의학과': {
                'base_wait': 15,
                'peak_multiplier': 1.6,
                'avg_service_time': 10,
                'distribution': 0.07
            },
            '심장내과': {
                'base_wait': 30,
                'peak_multiplier': 1.4,
                'avg_service_time': 25,
                'distribution': 0.04
            },
            '소아과': {
                'base_wait': 20,
                'peak_multiplier': 2.2,
                'avg_service_time': 15,
                'distribution': 0.02
            },
            '가정의학과': {
                'base_wait': 25,
                'peak_multiplier': 1.3,
                'avg_service_time': 15,
                'distribution': 0.01
            }
        }

        # 시간대별 혼잡도 패턴
        self.HOURLY_CONGESTION = {
            8: 0.3,   # 개원 직후
            9: 0.8,   # 오전 증가
            10: 1.0,  # 오전 피크
            11: 0.9,  # 오전 높음
            12: 0.5,  # 점심시간
            13: 0.6,  # 점심 후
            14: 0.9,  # 오후 피크
            15: 0.8,  # 오후
            16: 0.6,  # 오후 감소
            17: 0.3,  # 마감 시간
        }

        # 요일별 가중치
        self.WEEKDAY_FACTOR = {
            0: 1.3,  # 월요일 (가장 붐빔)
            1: 1.0,  # 화요일
            2: 1.0,  # 수요일
            3: 1.1,  # 목요일
            4: 0.9,  # 금요일
            5: 0.6,  # 토요일
            6: 0.0,  # 일요일 (휴무)
        }

        # 테스트 사용자 생성 또는 가져오기
        self.test_users = self.get_or_create_test_users()

        # 검사 항목 확인 및 생성
        self.ensure_exams_exist()

        # 데이터 생성
        with transaction.atomic():
            self.generate_queue_data(months, daily_patients)

        self.stdout.write(self.style.SUCCESS(f'✅ 데이터 생성 완료!'))
        self.print_summary()

    def clear_existing_data(self):
        """기존 데이터 삭제"""
        self.stdout.write('🗑️ 기존 데이터 삭제 중...')
        Queue.objects.all().delete()
        QueueStatusLog.objects.all().delete()
        Appointment.objects.all().delete()
        EmrSyncStatus.objects.all().delete()
        PatientState.objects.all().delete()
        self.stdout.write('   - 삭제 완료')

    def get_or_create_test_users(self):
        """테스트 사용자 생성"""
        users = []
        for i in range(500):  # 충분한 테스트 사용자 생성
            user, created = User.objects.get_or_create(
                email=f'patient_{i:04d}@test.com',
                defaults={
                    'name': f'테스트환자{i:04d}',
                    'phone_number': f'010{random.randint(1000, 9999)}{i:04d}',
                    'birth_date': f'{random.randint(1950, 2005)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}',
                    'role': 'patient',
                    'password': 'test1234'
                }
            )
            users.append(user)
        self.stdout.write(f'   - 테스트 사용자 {len(users)}명 준비')
        return users

    def ensure_exams_exist(self):
        """검사 항목 확인 및 생성"""
        for dept_name in self.DEPT_WAIT_PATTERNS.keys():
            exam, created = Exam.objects.get_or_create(
                exam_id=f'EX_{dept_name}',
                defaults={
                    'title': f'{dept_name} 진료',
                    'description': f'{dept_name} 일반 진료',
                    'department': dept_name,
                    'category': '진료' if '과' in dept_name else '검사',
                    'average_duration': self.DEPT_WAIT_PATTERNS[dept_name]['avg_service_time'],
                    'buffer_time': 5,
                    'location_tag': None  # NFCTag를 사용하지 않음 (옵션)
                }
            )
            if created:
                self.stdout.write(f'   - {dept_name} 검사 항목 생성')

    def generate_queue_data(self, months, daily_patients):
        """Queue 데이터 생성"""
        start_date = timezone.now() - timedelta(days=months * 30)
        end_date = timezone.now()

        current_date = start_date.date()
        total_queues = 0
        total_days = 0

        # 벌크 생성을 위한 리스트
        appointments_to_create = []
        queues_to_create = []
        logs_to_create = []
        patient_states = {}

        while current_date <= end_date.date():
            weekday = current_date.weekday()

            # 일요일은 휴무
            if self.WEEKDAY_FACTOR[weekday] == 0:
                current_date += timedelta(days=1)
                continue

            # 요일별 환자 수 조정
            today_patients = int(daily_patients * self.WEEKDAY_FACTOR[weekday])

            self.stdout.write(f'📅 {current_date} ({self.get_weekday_name(weekday)}): {today_patients}명 생성 중...')

            # 하루 동안의 환자 생성
            daily_data = self.generate_daily_queues(current_date, today_patients)

            appointments_to_create.extend(daily_data['appointments'])
            queues_to_create.extend(daily_data['queues'])
            logs_to_create.extend(daily_data['logs'])

            # PatientState 업데이트
            for user_id, state in daily_data['patient_states'].items():
                patient_states[user_id] = state

            total_queues += len(daily_data['queues'])
            total_days += 1
            current_date += timedelta(days=1)

            # 진행 상황 출력
            if total_days % 10 == 0:
                self.stdout.write(f'   진행: {total_days}일 완료, 총 {total_queues}개 Queue 준비')

        # 벌크 생성
        self.stdout.write(f'💾 데이터베이스에 저장 중...')

        # Appointments 먼저 생성
        Appointment.objects.bulk_create(appointments_to_create, batch_size=1000)
        self.stdout.write(f'   - {len(appointments_to_create)}개 Appointment 저장')

        # Patient States 생성 (스킵 - 에러 방지)
        # PatientState.objects.bulk_create(patient_states.values(), batch_size=1000)
        # self.stdout.write(f'   - {len(patient_states)}개 PatientState 저장')

        # Queues 생성 - 먼저 bulk_create로 생성
        Queue.objects.bulk_create(queues_to_create, batch_size=1000)
        self.stdout.write(f'   - {len(queues_to_create)}개 Queue 저장')

        # Status Logs 생성
        QueueStatusLog.objects.bulk_create(logs_to_create, batch_size=1000)
        self.stdout.write(f'   - {len(logs_to_create)}개 StatusLog 저장')

        self.stdout.write(self.style.SUCCESS(f'\n✨ 총 {total_days}일, {total_queues}개 Queue 데이터 생성 완료'))

    def generate_daily_queues(self, date, patient_count):
        """하루치 Queue 데이터 생성 (메모리 효율적)"""
        appointments = []
        queues = []
        logs = []
        patient_states = {}

        # 부서별 환자 분배
        dept_patients = {}
        remaining = patient_count

        for dept, pattern in self.DEPT_WAIT_PATTERNS.items():
            count = int(patient_count * pattern['distribution'])
            dept_patients[dept] = count
            remaining -= count

        # 남은 환자는 내과에 추가
        if remaining > 0:
            dept_patients['내과'] = dept_patients.get('내과', 0) + remaining

        queue_number = 0

        # 각 부서별로 환자 생성
        for dept, count in dept_patients.items():
            if count == 0:
                continue

            exam = Exam.objects.filter(department=dept).first()
            if not exam:
                continue

            pattern = self.DEPT_WAIT_PATTERNS[dept]

            # 시간대별로 환자 분산
            for i in range(count):
                queue_number += 1

                # 도착 시간 결정 (8시-17시 사이)
                hour = self.get_random_hour_weighted()
                minute = random.randint(0, 59)
                arrival_time = timezone.make_aware(
                    datetime.combine(date, datetime.min.time().replace(hour=hour, minute=minute))
                )

                # 혼잡도 계산
                congestion = self.HOURLY_CONGESTION.get(hour, 0.5)

                # 실제 대기시간 계산 (0이 아닌 실제값!)
                base_wait = pattern['base_wait']
                random_factor = random.uniform(0.8, 1.2)
                actual_wait = int(base_wait * congestion * random_factor)

                # 최소 5분, 최대 120분
                actual_wait = max(5, min(actual_wait, 120))

                # 사용자 선택
                user = random.choice(self.test_users)

                # Appointment 생성
                appointment_id = f'APT_{uuid.uuid4().hex[:8]}'
                appointment = Appointment(
                    appointment_id=appointment_id,
                    user=user,
                    exam=exam,
                    scheduled_at=arrival_time,
                    status='scheduled'
                )
                appointments.append(appointment)

                # Queue 생성 (실제 대기시간 포함!)
                queue_id = uuid.uuid4()
                queue_state = self.get_random_state(hour)

                queue = Queue(
                    queue_id=queue_id,
                    appointment_id=appointment_id,  # ID만 저장
                    user=user,
                    exam=exam,
                    state=queue_state,
                    queue_number=queue_number,
                    estimated_wait_time=actual_wait,  # 실제 대기시간!
                    priority='normal' if random.random() > 0.1 else 'urgent',
                    created_at=arrival_time,  # 이제 직접 설정 가능!
                    updated_at=arrival_time + timedelta(minutes=random.randint(0, 30))
                )

                if queue_state == 'called':
                    queue.called_at = arrival_time + timedelta(minutes=random.randint(10, 30))

                queues.append(queue)

                # 상태 로그 생성
                log = QueueStatusLog(
                    log_id=uuid.uuid4(),
                    queue_id=queue_id,  # ID만 저장
                    new_state=queue_state,
                    new_number=queue_number,
                    created_at=arrival_time,
                    estimated_wait_time_at_time=actual_wait,
                    queue_position_at_time=queue_number,
                    metadata={
                        'department': dept,
                        'generated': True,
                        'congestion': congestion,
                        'base_wait': base_wait,
                        'actual_wait': actual_wait
                    }
                )
                logs.append(log)

                # PatientState 업데이트 (한 사용자당 하나만)
                if user.user_id not in patient_states:
                    state_map = {
                        'waiting': 'WAITING',
                        'called': 'CALLED',
                        'in_progress': 'IN_PROGRESS',
                        'completed': 'COMPLETED'
                    }

                    patient_states[user.user_id] = PatientState(
                        state_id=str(uuid.uuid4()),
                        user=user,
                        current_state=state_map.get(queue_state, 'WAITING'),
                        current_exam=exam,
                        created_at=arrival_time,
                        updated_at=arrival_time + timedelta(minutes=30)
                    )

        return {
            'appointments': appointments,
            'queues': queues,
            'logs': logs,
            'patient_states': patient_states
        }

    def get_random_hour_weighted(self):
        """혼잡도에 따른 가중치 적용된 랜덤 시간 선택"""
        hours = list(self.HOURLY_CONGESTION.keys())
        weights = list(self.HOURLY_CONGESTION.values())
        return random.choices(hours, weights=weights)[0]

    def get_random_state(self, hour):
        """시간대에 따른 상태 결정"""
        if hour < 10:
            # 오전 초반: 대부분 대기 상태
            return random.choices(
                ['waiting', 'called', 'in_progress', 'completed'],
                weights=[0.7, 0.2, 0.08, 0.02]
            )[0]
        elif hour < 14:
            # 중반: 다양한 상태
            return random.choices(
                ['waiting', 'called', 'in_progress', 'completed'],
                weights=[0.4, 0.3, 0.2, 0.1]
            )[0]
        else:
            # 오후: 완료 비율 증가
            return random.choices(
                ['waiting', 'called', 'in_progress', 'completed'],
                weights=[0.2, 0.2, 0.3, 0.3]
            )[0]

    def get_weekday_name(self, weekday):
        """요일 이름 반환"""
        days = ['월', '화', '수', '목', '금', '토', '일']
        return f'{days[weekday]}요일'

    def print_summary(self):
        """생성 결과 요약 출력"""
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write('📊 데이터 생성 요약')
        self.stdout.write('=' * 50)

        # 전체 통계
        total_queues = Queue.objects.count()
        total_appointments = Appointment.objects.count()
        total_logs = QueueStatusLog.objects.count()

        self.stdout.write(f'총 Queue: {total_queues:,}개')
        self.stdout.write(f'총 Appointment: {total_appointments:,}개')
        self.stdout.write(f'총 StatusLog: {total_logs:,}개')

        # 부서별 통계
        self.stdout.write('\n📋 부서별 대기시간 통계:')
        for dept in self.DEPT_WAIT_PATTERNS.keys():
            queues = Queue.objects.filter(exam__department=dept)
            if queues.exists():
                avg_wait = queues.aggregate(
                    avg=models.Avg('estimated_wait_time')
                )['avg'] or 0
                count = queues.count()
                self.stdout.write(f'   {dept}: {count:,}개 큐, 평균 대기 {avg_wait:.1f}분')

        # 대기시간이 0이 아닌 큐 확인
        non_zero_queues = Queue.objects.filter(estimated_wait_time__gt=0).count()
        zero_queues = Queue.objects.filter(estimated_wait_time=0).count()
        self.stdout.write(f'\n🎯 대기시간 분포:')
        self.stdout.write(f'   - 실제 대기시간 있음: {non_zero_queues:,}개')
        self.stdout.write(f'   - 대기시간 0분: {zero_queues:,}개')

        self.stdout.write('=' * 50)