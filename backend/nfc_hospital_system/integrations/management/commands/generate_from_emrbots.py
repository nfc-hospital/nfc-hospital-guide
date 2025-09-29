"""
EMRBots 패턴을 사용한 Queue 데이터 생성
실제 의료 데이터 패턴을 기반으로 현실적인 대기열 데이터 생성
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, models
from datetime import datetime, timedelta
from p_queue.models import Queue, QueueStatusLog
from appointments.models import Appointment, Exam
from authentication.models import User
from common.state_definitions import QueueDetailState
import random
import uuid
import json
import os
import numpy as np

class Command(BaseCommand):
    help = 'Generate Queue data based on EMRBots patterns'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to generate (default: 30)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before generating'
        )

    def handle(self, *args, **options):
        days = options['days']
        clear = options['clear']

        self.stdout.write(f'\n🏥 EMRBots 패턴 기반 Queue 데이터 생성')
        self.stdout.write(f'   - 기간: {days}일')

        # EMRBots 패턴 로드
        self.load_emrbots_patterns()

        if clear:
            self.clear_existing_data()

        # 테스트 사용자 생성
        self.test_users = self.create_test_users_from_patterns()

        # 검사 항목 생성
        self.ensure_exams_exist()

        # 데이터 생성
        with transaction.atomic():
            self.generate_queue_data_from_patterns(days)

        self.stdout.write(self.style.SUCCESS('\n✅ EMRBots 패턴 기반 데이터 생성 완료!'))
        self.print_summary()

    def load_emrbots_patterns(self):
        """EMRBots 분석 패턴 로드"""
        pattern_file = os.path.join('data', 'emrbots_patterns', 'hospital_patterns.json')

        if not os.path.exists(pattern_file):
            self.stdout.write(self.style.ERROR('패턴 파일이 없습니다. analyze_emrbots를 먼저 실행하세요.'))
            exit(1)

        with open(pattern_file, 'r', encoding='utf-8') as f:
            self.patterns = json.load(f)

        self.stdout.write(f'✅ EMRBots 패턴 로드 완료')

        # 패턴 추출
        self.hourly_congestion = self.patterns['queue_patterns']['hourly_congestion']
        self.weekday_patterns = self.patterns['queue_patterns']['weekday_patterns']
        self.dept_distribution = self.patterns['queue_patterns']['department_distribution']
        self.wait_time_patterns = self.patterns['queue_patterns']['wait_time_patterns']
        self.age_patterns = self.patterns['queue_patterns']['age_patterns']
        self.gender_patterns = self.patterns['queue_patterns']['gender_patterns']

    def clear_existing_data(self):
        """기존 데이터 삭제"""
        self.stdout.write('🗑️ 기존 데이터 삭제 중...')
        Queue.objects.all().delete()
        QueueStatusLog.objects.all().delete()
        Appointment.objects.all().delete()
        self.stdout.write('   - 삭제 완료')

    def create_test_users_from_patterns(self):
        """EMRBots 패턴에 따른 테스트 사용자 생성"""
        users = []

        # 연령 분포에 따른 사용자 생성
        age_distribution = {
            '0-18': 0.00,    # EMRBots에는 소아 환자가 거의 없음
            '19-35': 0.05,   # 젊은 층 적음
            '36-50': 0.19,
            '51-65': 0.32,
            '65+': 0.44      # 고령자가 가장 많음
        }

        total_users = 500

        for age_group, ratio in age_distribution.items():
            count = int(total_users * ratio)

            if age_group == '0-18':
                age_range = (5, 18)
            elif age_group == '19-35':
                age_range = (19, 35)
            elif age_group == '36-50':
                age_range = (36, 50)
            elif age_group == '51-65':
                age_range = (51, 65)
            else:  # 65+
                age_range = (65, 90)

            for i in range(count):
                # 성별 분포 적용 (EMRBots 패턴)
                gender = 'M' if random.random() < self.gender_patterns.get('Male', 0.5) else 'F'

                birth_year = 2024 - random.randint(age_range[0], age_range[1])
                user, created = User.objects.get_or_create(
                    email=f'{age_group.replace("-", "_").replace("+", "plus")}_{gender}_{i:04d}@emrbots.com',
                    defaults={
                        'name': f'EMR환자{len(users):04d}',
                        'phone_number': f'010{random.randint(1000, 9999)}{len(users):04d}',
                        'birth_date': f'{birth_year}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}',
                        'role': 'patient',
                        'password': 'test1234'
                    }
                )
                users.append(user)

        self.stdout.write(f'   - {len(users)}명 테스트 사용자 준비 (EMRBots 패턴 반영)')
        return users

    def ensure_exams_exist(self):
        """부서별 검사 항목 생성"""
        for dept_name in self.dept_distribution.keys():
            # 기본 부서 정보
            dept_info = {
                '진단검사의학과': {'service_time': 10, 'building': 'Lab', 'category': '검사'},
                '내과': {'service_time': 15, 'building': 'Main', 'category': '진료'},
                '정형외과': {'service_time': 20, 'building': 'Main', 'category': '진료'},
                'X-ray실': {'service_time': 5, 'building': 'Radiology', 'category': '영상'},
                'CT실': {'service_time': 15, 'building': 'Radiology', 'category': '영상'},
                'MRI실': {'service_time': 30, 'building': 'Radiology', 'category': '영상'},
                '심장내과': {'service_time': 25, 'building': 'Main', 'category': '진료'},
                '채혈실': {'service_time': 5, 'building': 'Lab', 'category': '검사'}
            }.get(dept_name, {'service_time': 15, 'building': 'Main', 'category': '진료'})

            exam, created = Exam.objects.get_or_create(
                exam_id=f'EX_{dept_name}',
                defaults={
                    'title': f'{dept_name} 검사/진료',
                    'description': f'{dept_name} medical service (EMRBots)',
                    'department': dept_name,
                    'category': dept_info['category'],
                    'average_duration': dept_info['service_time'],
                    'buffer_time': 5,
                    'building': dept_info['building'],
                    'floor': random.choice(['1F', '2F', '3F']),
                    'room': f'{dept_name[:2]}{random.randint(101, 299)}',
                    'x_coord': random.uniform(0, 100),
                    'y_coord': random.uniform(0, 100)
                }
            )
            if created:
                self.stdout.write(f'   - {dept_name} 검사 항목 생성')

    def generate_queue_data_from_patterns(self, days):
        """EMRBots 패턴 기반 Queue 데이터 생성"""
        start_date = timezone.now() - timedelta(days=days)
        end_date = timezone.now()

        current_date = start_date.date()
        total_queues = 0
        total_days = 0

        appointments_to_create = []
        queues_to_create = []
        logs_to_create = []

        while current_date <= end_date.date():
            weekday = current_date.weekday()

            # EMRBots 요일 패턴 적용
            weekday_factor = float(self.weekday_patterns.get(str(weekday), 0.14))

            # 기본 일일 환자 수 (부서 분포와 요일 패턴 고려)
            base_daily_patients = 200  # 기본값
            today_patients = int(base_daily_patients * weekday_factor * 7)  # 7은 정규화 계수

            if today_patients < 10:
                current_date += timedelta(days=1)
                continue

            self.stdout.write(f'📅 {current_date}: {today_patients}명 생성 중...')

            # 하루 데이터 생성
            daily_data = self.generate_daily_queues(current_date, today_patients)

            appointments_to_create.extend(daily_data['appointments'])
            queues_to_create.extend(daily_data['queues'])
            logs_to_create.extend(daily_data['logs'])

            total_queues += len(daily_data['queues'])
            total_days += 1
            current_date += timedelta(days=1)

            # 진행 상황
            if total_days % 7 == 0:
                self.stdout.write(f'   진행: {total_days}일, {total_queues}개 Queue 생성')

        # 데이터베이스 저장
        self.stdout.write('\n💾 데이터베이스 저장 중...')

        Appointment.objects.bulk_create(appointments_to_create, batch_size=1000)
        self.stdout.write(f'   - {len(appointments_to_create)}개 Appointment 저장')

        Queue.objects.bulk_create(queues_to_create, batch_size=1000)
        self.stdout.write(f'   - {len(queues_to_create)}개 Queue 저장')

        QueueStatusLog.objects.bulk_create(logs_to_create, batch_size=1000)
        self.stdout.write(f'   - {len(logs_to_create)}개 Log 저장')

        self.stdout.write(f'\n✨ 총 {total_days}일, {total_queues}개 Queue 생성 완료')

    def generate_daily_queues(self, date, patient_count):
        """하루치 Queue 데이터 생성"""
        appointments = []
        queues = []
        logs = []

        # 부서별 환자 분배 (EMRBots 패턴)
        dept_patients = {}
        for dept, ratio in self.dept_distribution.items():
            dept_patients[dept] = int(patient_count * ratio)

        queue_number = 0

        for dept, count in dept_patients.items():
            if count == 0:
                continue

            exam = Exam.objects.filter(department=dept).first()
            if not exam:
                continue

            for i in range(count):
                queue_number += 1

                # EMRBots 시간 패턴에 따른 도착 시간
                hour = self.get_arrival_hour_from_pattern()
                minute = random.randint(0, 59)
                arrival_time = timezone.make_aware(
                    datetime.combine(date, datetime.min.time().replace(hour=hour, minute=minute))
                )

                # 연령별 사용자 선택
                user = self.select_user_by_age()

                # 대기시간 계산 (EMRBots 패턴 적용)
                wait_time = self.calculate_wait_time(dept, hour)

                # Appointment 생성
                appointment_id = f'EMR_{uuid.uuid4().hex[:8]}'
                appointment = Appointment(
                    appointment_id=appointment_id,
                    user=user,
                    exam=exam,
                    scheduled_at=arrival_time,
                    status='scheduled'
                )
                appointments.append(appointment)

                # Queue 생성
                queue_id = uuid.uuid4()
                state = self.get_queue_state(hour)

                queue = Queue(
                    queue_id=queue_id,
                    appointment_id=appointment_id,
                    user=user,
                    exam=exam,
                    state=state,
                    queue_number=queue_number,
                    estimated_wait_time=wait_time,
                    priority='normal' if random.random() > 0.1 else 'urgent',
                    created_at=arrival_time,
                    updated_at=arrival_time
                )

                if state == 'called':
                    queue.called_at = arrival_time + timedelta(minutes=wait_time)

                queues.append(queue)

                # Log 생성
                log = QueueStatusLog(
                    log_id=uuid.uuid4(),
                    queue_id=queue_id,
                    new_state=state,
                    new_number=queue_number,
                    created_at=arrival_time,
                    estimated_wait_time_at_time=wait_time,
                    metadata={
                        'department': dept,
                        'emrbots_pattern': True,
                        'congestion': self.hourly_congestion.get(str(hour), 0.5)
                    }
                )
                logs.append(log)

        return {
            'appointments': appointments,
            'queues': queues,
            'logs': logs
        }

    def get_arrival_hour_from_pattern(self):
        """EMRBots 시간 패턴에 따른 도착 시간 선택"""
        # 문자열 키를 정수로 변환
        hours = []
        weights = []
        for h, w in self.hourly_congestion.items():
            hours.append(int(h))
            weights.append(float(w))

        # 가중치가 모두 0인 경우 처리
        if sum(weights) == 0:
            return random.randint(8, 17)

        return np.random.choice(hours, p=np.array(weights)/sum(weights))

    def select_user_by_age(self):
        """연령 패턴에 따른 사용자 선택"""
        # EMRBots는 주로 고령 환자
        age_weights = {
            '36_50': 0.19,
            '51_65': 0.32,
            '65plus': 0.44,
            '19_35': 0.05
        }

        # 연령 그룹별 사용자 필터링
        users_by_age = {}
        for user in self.test_users:
            for age_key in age_weights.keys():
                if age_key in user.email:
                    if age_key not in users_by_age:
                        users_by_age[age_key] = []
                    users_by_age[age_key].append(user)
                    break

        # 가중치에 따라 연령 그룹 선택
        if users_by_age:
            available_groups = list(users_by_age.keys())
            group_weights = [age_weights.get(g, 0.1) for g in available_groups]

            if sum(group_weights) > 0:
                selected_group = np.random.choice(
                    available_groups,
                    p=np.array(group_weights)/sum(group_weights)
                )
                return random.choice(users_by_age[selected_group])

        return random.choice(self.test_users)

    def calculate_wait_time(self, dept, hour):
        """EMRBots 패턴 기반 대기시간 계산"""
        base_wait = self.wait_time_patterns['base_wait']
        min_wait = self.wait_time_patterns['min_wait']
        max_wait = self.wait_time_patterns['max_wait']
        peak_multiplier = self.wait_time_patterns['peak_multiplier']

        # 시간대별 혼잡도
        congestion = float(self.hourly_congestion.get(str(hour), 0.5))

        # 부서별 조정
        dept_factor = {
            '진단검사의학과': 0.5,  # 검사는 빠름
            'X-ray실': 0.3,
            '채혈실': 0.2,
            'CT실': 0.8,
            'MRI실': 1.5,
            '내과': 1.0,
            '정형외과': 0.9,
            '심장내과': 1.2
        }.get(dept, 1.0)

        # 최종 대기시간 계산
        wait_time = base_wait * congestion * dept_factor

        # 피크 시간 적용
        if hour in [11, 14, 15, 18]:  # EMRBots 피크 시간
            wait_time *= peak_multiplier

        # 랜덤 변동
        wait_time *= random.uniform(0.8, 1.2)

        # 범위 제한
        wait_time = max(min_wait, min(wait_time, max_wait))

        return int(wait_time)

    def get_queue_state(self, hour):
        """시간에 따른 큐 상태 결정"""
        # 오전: 대부분 waiting
        if hour < 12:
            return random.choices(
                ['waiting', 'called', 'in_progress', 'completed'],
                weights=[0.6, 0.2, 0.15, 0.05]
            )[0]
        # 오후: 진행 중인 상태가 많음
        elif hour < 17:
            return random.choices(
                ['waiting', 'called', 'in_progress', 'completed'],
                weights=[0.3, 0.25, 0.3, 0.15]
            )[0]
        # 저녁: 완료 상태가 많음
        else:
            return random.choices(
                ['waiting', 'called', 'in_progress', 'completed'],
                weights=[0.2, 0.2, 0.3, 0.3]
            )[0]

    def print_summary(self):
        """생성 결과 요약"""
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('📊 EMRBots 패턴 기반 데이터 생성 요약')
        self.stdout.write('=' * 60)

        total_queues = Queue.objects.count()
        total_appointments = Appointment.objects.count()

        self.stdout.write(f'총 Queue: {total_queues:,}개')
        self.stdout.write(f'총 Appointment: {total_appointments:,}개')

        # 부서별 통계
        self.stdout.write('\n📋 부서별 통계:')
        for dept in self.dept_distribution.keys():
            dept_queues = Queue.objects.filter(exam__department=dept)
            if dept_queues.exists():
                avg_wait = dept_queues.aggregate(
                    avg=models.Avg('estimated_wait_time')
                )['avg'] or 0
                count = dept_queues.count()
                self.stdout.write(f'   {dept}: {count:,}개, 평균 대기 {avg_wait:.1f}분')

        # 연령별 분포 확인
        self.stdout.write('\n👥 연령별 환자 분포:')
        age_groups = {'19_35': 0, '36_50': 0, '51_65': 0, '65plus': 0}
        for user in self.test_users:
            for age_key in age_groups.keys():
                if age_key in user.email:
                    age_groups[age_key] += 1

        for age, count in age_groups.items():
            if count > 0:
                percentage = (count / len(self.test_users)) * 100
                self.stdout.write(f'   {age}: {count}명 ({percentage:.1f}%)')

        self.stdout.write('=' * 60)