"""
Enhanced EMR data generation with realistic hospital admission patterns
Based on medical research and real-world hospital data patterns
"""

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
import math
import json

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Generate realistic hospital queue data with advanced patterns'

    def add_arguments(self, parser):
        parser.add_argument(
            '--months',
            type=int,
            default=3,
            help='Number of months to generate (default: 3)'
        )
        parser.add_argument(
            '--daily-patients',
            type=int,
            default=300,
            help='Average daily patients (default: 300)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before generating'
        )

    def handle(self, *args, **options):
        months = options['months']
        daily_patients = options['daily_patients']
        clear = options['clear']

        self.stdout.write(f'🏥 Enhanced Hospital Queue Data Generation')
        self.stdout.write(f'   - Period: {months} months')
        self.stdout.write(f'   - Daily patients: {daily_patients}')

        if clear:
            self.clear_existing_data()

        # Enhanced department patterns with realistic medical data
        self.DEPT_PATTERNS = {
            '내과': {
                'base_wait': 35,
                'peak_multiplier': 2.0,
                'avg_service_time': 15,
                'distribution': 0.28,
                'emergency_rate': 0.15,
                'age_distribution': {'young': 0.2, 'middle': 0.4, 'elderly': 0.4},
                'seasonal_factor': {'winter': 1.3, 'spring': 1.0, 'summer': 0.8, 'fall': 1.1},
                'referral_to': ['X-ray실', 'CT실', '진단검사의학과'],
                'referral_probability': 0.4
            },
            '정형외과': {
                'base_wait': 25,
                'peak_multiplier': 1.8,
                'avg_service_time': 20,
                'distribution': 0.18,
                'emergency_rate': 0.25,
                'age_distribution': {'young': 0.3, 'middle': 0.35, 'elderly': 0.35},
                'seasonal_factor': {'winter': 1.2, 'spring': 0.9, 'summer': 1.1, 'fall': 1.0},
                'referral_to': ['X-ray실', 'MRI실'],
                'referral_probability': 0.6
            },
            '소아과': {
                'base_wait': 20,
                'peak_multiplier': 2.5,
                'avg_service_time': 12,
                'distribution': 0.12,
                'emergency_rate': 0.20,
                'age_distribution': {'young': 1.0, 'middle': 0.0, 'elderly': 0.0},
                'seasonal_factor': {'winter': 1.5, 'spring': 1.2, 'summer': 0.7, 'fall': 1.1},
                'referral_to': ['X-ray실', '진단검사의학과'],
                'referral_probability': 0.3
            },
            '응급의학과': {
                'base_wait': 5,
                'peak_multiplier': 3.0,
                'avg_service_time': 30,
                'distribution': 0.10,
                'emergency_rate': 1.0,
                'age_distribution': {'young': 0.25, 'middle': 0.35, 'elderly': 0.40},
                'seasonal_factor': {'winter': 1.1, 'spring': 1.0, 'summer': 1.2, 'fall': 1.0},
                'referral_to': ['X-ray실', 'CT실', 'MRI실', '진단검사의학과'],
                'referral_probability': 0.8
            },
            'X-ray실': {
                'base_wait': 10,
                'peak_multiplier': 1.5,
                'avg_service_time': 5,
                'distribution': 0.08,
                'emergency_rate': 0.3,
                'age_distribution': {'young': 0.3, 'middle': 0.35, 'elderly': 0.35},
                'seasonal_factor': {'winter': 1.2, 'spring': 1.0, 'summer': 0.9, 'fall': 1.0},
                'referral_to': [],
                'referral_probability': 0.0
            },
            'CT실': {
                'base_wait': 25,
                'peak_multiplier': 1.4,
                'avg_service_time': 15,
                'distribution': 0.06,
                'emergency_rate': 0.4,
                'age_distribution': {'young': 0.15, 'middle': 0.40, 'elderly': 0.45},
                'seasonal_factor': {'winter': 1.1, 'spring': 1.0, 'summer': 0.95, 'fall': 1.0},
                'referral_to': [],
                'referral_probability': 0.0
            },
            'MRI실': {
                'base_wait': 45,
                'peak_multiplier': 1.2,
                'avg_service_time': 30,
                'distribution': 0.05,
                'emergency_rate': 0.1,
                'age_distribution': {'young': 0.1, 'middle': 0.45, 'elderly': 0.45},
                'seasonal_factor': {'winter': 1.0, 'spring': 1.0, 'summer': 1.0, 'fall': 1.0},
                'referral_to': [],
                'referral_probability': 0.0
            },
            '진단검사의학과': {
                'base_wait': 15,
                'peak_multiplier': 1.6,
                'avg_service_time': 10,
                'distribution': 0.07,
                'emergency_rate': 0.2,
                'age_distribution': {'young': 0.25, 'middle': 0.40, 'elderly': 0.35},
                'seasonal_factor': {'winter': 1.3, 'spring': 1.0, 'summer': 0.85, 'fall': 1.1},
                'referral_to': [],
                'referral_probability': 0.0
            },
            '심장내과': {
                'base_wait': 30,
                'peak_multiplier': 1.5,
                'avg_service_time': 25,
                'distribution': 0.04,
                'emergency_rate': 0.35,
                'age_distribution': {'young': 0.05, 'middle': 0.35, 'elderly': 0.60},
                'seasonal_factor': {'winter': 1.2, 'spring': 1.0, 'summer': 0.9, 'fall': 1.0},
                'referral_to': ['심전도실', 'CT실'],
                'referral_probability': 0.5
            }
        }

        # Hourly patterns based on real hospital data
        self.HOURLY_PATTERNS = {
            # Early morning: emergency dominant
            6: {'congestion': 0.2, 'emergency_multiplier': 2.0},
            7: {'congestion': 0.3, 'emergency_multiplier': 1.8},

            # Morning rush
            8: {'congestion': 0.4, 'emergency_multiplier': 1.2},
            9: {'congestion': 0.85, 'emergency_multiplier': 1.0},
            10: {'congestion': 1.0, 'emergency_multiplier': 0.8},
            11: {'congestion': 0.95, 'emergency_multiplier': 0.8},

            # Lunch time dip
            12: {'congestion': 0.5, 'emergency_multiplier': 1.1},
            13: {'congestion': 0.6, 'emergency_multiplier': 1.0},

            # Afternoon peak
            14: {'congestion': 0.9, 'emergency_multiplier': 0.9},
            15: {'congestion': 0.85, 'emergency_multiplier': 0.9},
            16: {'congestion': 0.7, 'emergency_multiplier': 1.0},
            17: {'congestion': 0.4, 'emergency_multiplier': 1.2},

            # Evening
            18: {'congestion': 0.3, 'emergency_multiplier': 1.5},
            19: {'congestion': 0.25, 'emergency_multiplier': 1.8},
            20: {'congestion': 0.2, 'emergency_multiplier': 2.0},
        }

        # Day of week patterns (real hospital statistics)
        self.WEEKDAY_PATTERNS = {
            0: {'factor': 1.35, 'name': 'Monday'},     # Busiest after weekend
            1: {'factor': 1.1, 'name': 'Tuesday'},
            2: {'factor': 1.0, 'name': 'Wednesday'},
            3: {'factor': 1.05, 'name': 'Thursday'},
            4: {'factor': 0.95, 'name': 'Friday'},
            5: {'factor': 0.7, 'name': 'Saturday'},    # Half day
            6: {'factor': 0.3, 'name': 'Sunday'},      # Emergency only
        }

        # Special events (holidays, flu season, etc.)
        self.SPECIAL_EVENTS = {
            'new_year': {'dates': [(1, 1), (1, 2)], 'factor': 0.4},
            'lunar_new_year': {'dates': [(2, 10), (2, 11), (2, 12)], 'factor': 0.3},
            'children_day': {'dates': [(5, 5)], 'factor': 0.5},
            'chuseok': {'dates': [(9, 28), (9, 29), (9, 30)], 'factor': 0.3},
            'christmas': {'dates': [(12, 24), (12, 25)], 'factor': 0.4},
            'flu_season': {'months': [1, 2, 12], 'factor': 1.3, 'depts': ['내과', '소아과']},
        }

        # Create test users
        self.test_users = self.get_or_create_test_users()

        # Ensure exams exist
        self.ensure_exams_exist()

        # Generate data
        with transaction.atomic():
            self.generate_enhanced_queue_data(months, daily_patients)

        self.stdout.write(self.style.SUCCESS('✅ Enhanced data generation complete!'))
        self.print_detailed_summary()

    def clear_existing_data(self):
        """Clear existing data"""
        self.stdout.write('🗑️ Clearing existing data...')
        Queue.objects.all().delete()
        QueueStatusLog.objects.all().delete()
        Appointment.objects.all().delete()
        EmrSyncStatus.objects.all().delete()
        PatientState.objects.all().delete()
        self.stdout.write('   - Data cleared')

    def get_or_create_test_users(self):
        """Create realistic test users with age distribution"""
        users = []
        age_groups = [
            {'range': (0, 10), 'count': 100, 'prefix': 'child'},
            {'range': (11, 20), 'count': 80, 'prefix': 'teen'},
            {'range': (21, 40), 'count': 150, 'prefix': 'adult'},
            {'range': (41, 60), 'count': 120, 'prefix': 'middle'},
            {'range': (61, 90), 'count': 100, 'prefix': 'elderly'},
        ]

        user_id = 0
        for group in age_groups:
            for i in range(group['count']):
                birth_year = 2024 - random.randint(group['range'][0], group['range'][1])
                user, created = User.objects.get_or_create(
                    email=f'{group["prefix"]}_{user_id:04d}@test.com',
                    defaults={
                        'name': f'환자{user_id:04d}',
                        'phone_number': f'010{random.randint(1000, 9999)}{user_id:04d}',
                        'birth_date': f'{birth_year}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}',
                        'role': 'patient',
                        'password': 'test1234'
                    }
                )
                users.append(user)
                user_id += 1

        self.stdout.write(f'   - {len(users)} test users prepared')
        return users

    def ensure_exams_exist(self):
        """Create exam items for all departments"""
        for dept_name, pattern in self.DEPT_PATTERNS.items():
            exam, created = Exam.objects.get_or_create(
                exam_id=f'EX_{dept_name}',
                defaults={
                    'title': f'{dept_name} {"진료" if "과" in dept_name else "검사"}',
                    'description': f'{dept_name} medical service',
                    'department': dept_name,
                    'category': '진료' if '과' in dept_name else '검사',
                    'average_duration': pattern['avg_service_time'],
                    'buffer_time': 5,
                    'building': 'Main' if '과' in dept_name else 'Diagnostic',
                    'floor': random.choice(['1F', '2F', '3F', '4F']),
                    'room': f'{dept_name[:2]}{random.randint(101, 499)}',
                    'x_coord': random.uniform(0, 100),
                    'y_coord': random.uniform(0, 100)
                }
            )
            if created:
                self.stdout.write(f'   - Created exam for {dept_name}')

    def get_season(self, date):
        """Get season for given date"""
        month = date.month
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'fall'

    def get_special_event_factor(self, date):
        """Check for special events and return factor"""
        factor = 1.0

        # Check specific dates
        for event, data in self.SPECIAL_EVENTS.items():
            if 'dates' in data:
                for month, day in data['dates']:
                    if date.month == month and date.day == day:
                        factor *= data['factor']

        # Check monthly events (flu season)
        if 'flu_season' in self.SPECIAL_EVENTS:
            flu_data = self.SPECIAL_EVENTS['flu_season']
            if date.month in flu_data['months']:
                factor *= flu_data.get('factor', 1.0)

        return factor

    def generate_enhanced_queue_data(self, months, daily_patients):
        """Generate enhanced queue data with realistic patterns"""
        start_date = timezone.now() - timedelta(days=months * 30)
        end_date = timezone.now()

        current_date = start_date.date()
        total_queues = 0
        total_days = 0

        # Batch creation lists
        appointments_to_create = []
        queues_to_create = []
        logs_to_create = []
        patient_journeys = {}  # Track patient journeys

        while current_date <= end_date.date():
            weekday = current_date.weekday()
            weekday_data = self.WEEKDAY_PATTERNS[weekday]

            # Apply weekday factor
            base_patients = int(daily_patients * weekday_data['factor'])

            # Apply special event factor
            event_factor = self.get_special_event_factor(current_date)
            today_patients = int(base_patients * event_factor)

            if today_patients < 10:  # Skip days with too few patients
                current_date += timedelta(days=1)
                continue

            self.stdout.write(
                f'📅 {current_date} ({weekday_data["name"]}): '
                f'Generating {today_patients} patients'
            )

            # Generate daily data
            daily_data = self.generate_daily_enhanced_queues(
                current_date, today_patients
            )

            appointments_to_create.extend(daily_data['appointments'])
            queues_to_create.extend(daily_data['queues'])
            logs_to_create.extend(daily_data['logs'])

            # Track patient journeys
            for patient_id, journey in daily_data['journeys'].items():
                if patient_id not in patient_journeys:
                    patient_journeys[patient_id] = []
                patient_journeys[patient_id].extend(journey)

            total_queues += len(daily_data['queues'])
            total_days += 1
            current_date += timedelta(days=1)

            # Progress report
            if total_days % 7 == 0:
                self.stdout.write(
                    f'   Progress: {total_days} days, '
                    f'{total_queues} queues prepared'
                )

        # Save to database
        self.stdout.write('💾 Saving to database...')

        # Save appointments
        Appointment.objects.bulk_create(appointments_to_create, batch_size=1000)
        self.stdout.write(f'   - {len(appointments_to_create)} appointments saved')

        # Save queues
        Queue.objects.bulk_create(queues_to_create, batch_size=1000)
        self.stdout.write(f'   - {len(queues_to_create)} queues saved')

        # Save logs
        QueueStatusLog.objects.bulk_create(logs_to_create, batch_size=1000)
        self.stdout.write(f'   - {len(logs_to_create)} logs saved')

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✨ Total: {total_days} days, {total_queues} queues generated'
            )
        )

    def generate_daily_enhanced_queues(self, date, patient_count):
        """Generate one day of enhanced queue data"""
        appointments = []
        queues = []
        logs = []
        journeys = {}

        season = self.get_season(date)

        # Distribute patients across departments
        dept_patients = {}
        for dept, pattern in self.DEPT_PATTERNS.items():
            # Apply seasonal factor
            seasonal_factor = pattern['seasonal_factor'].get(season, 1.0)
            count = int(patient_count * pattern['distribution'] * seasonal_factor)
            dept_patients[dept] = {
                'count': count,
                'pattern': pattern
            }

        global_queue_number = 0

        for dept, data in dept_patients.items():
            if data['count'] == 0:
                continue

            exam = Exam.objects.filter(department=dept).first()
            if not exam:
                continue

            pattern = data['pattern']

            for i in range(data['count']):
                global_queue_number += 1

                # Determine if emergency
                is_emergency = random.random() < pattern['emergency_rate']

                # Select appropriate user based on age distribution
                user = self.select_user_by_age(pattern['age_distribution'])

                # Generate arrival time
                hour = self.get_arrival_hour(is_emergency)
                minute = random.randint(0, 59)
                arrival_time = timezone.make_aware(
                    datetime.combine(
                        date,
                        datetime.min.time().replace(hour=hour, minute=minute)
                    )
                )

                # Calculate wait time with multiple factors
                wait_time = self.calculate_realistic_wait_time(
                    pattern, hour, is_emergency, season
                )

                # Create patient journey
                patient_journey = self.create_patient_journey(
                    user, exam, arrival_time, wait_time, is_emergency
                )

                # Create appointment
                appointment_id = f'APT_{uuid.uuid4().hex[:8]}'
                appointment = Appointment(
                    appointment_id=appointment_id,
                    user=user,
                    exam=exam,
                    scheduled_at=arrival_time,
                    status='scheduled' if not is_emergency else 'emergency',
                    arrival_confirmed=False
                )
                appointments.append(appointment)

                # Create queue with state progression
                queue_states = self.generate_state_progression(
                    arrival_time, wait_time, pattern['avg_service_time']
                )

                for state_data in queue_states:
                    queue_id = uuid.uuid4()
                    queue = Queue(
                        queue_id=queue_id,
                        appointment_id=appointment_id,
                        user=user,
                        exam=exam,
                        state=state_data['state'],
                        queue_number=global_queue_number,
                        estimated_wait_time=state_data['wait_time'],
                        priority='urgent' if is_emergency else 'normal',
                        created_at=state_data['timestamp'],
                        updated_at=state_data['timestamp']
                    )

                    if state_data['state'] == 'called':
                        queue.called_at = state_data['timestamp']

                    queues.append(queue)

                    # Create log
                    log = QueueStatusLog(
                        log_id=uuid.uuid4(),
                        queue_id=queue_id,
                        new_state=state_data['state'],
                        new_number=global_queue_number,
                        created_at=state_data['timestamp'],
                        estimated_wait_time_at_time=state_data['wait_time'],
                        queue_position_at_time=state_data.get('position', 0),
                        metadata={
                            'department': dept,
                            'is_emergency': is_emergency,
                            'season': season,
                            'hour': hour,
                            'realistic': True
                        }
                    )
                    logs.append(log)

                # Track journey
                if user.user_id not in journeys:
                    journeys[user.user_id] = []
                journeys[user.user_id].append(patient_journey)

                # Handle referrals
                if random.random() < pattern['referral_probability'] and pattern['referral_to']:
                    referral_dept = random.choice(pattern['referral_to'])
                    referral_data = self.create_referral(
                        user, referral_dept, arrival_time + timedelta(minutes=wait_time + 30)
                    )
                    if referral_data:
                        appointments.extend(referral_data['appointments'])
                        queues.extend(referral_data['queues'])
                        logs.extend(referral_data['logs'])

        return {
            'appointments': appointments,
            'queues': queues,
            'logs': logs,
            'journeys': journeys
        }

    def select_user_by_age(self, age_distribution):
        """Select user based on age distribution"""
        age_group = random.choices(
            ['young', 'middle', 'elderly'],
            weights=[
                age_distribution.get('young', 0.33),
                age_distribution.get('middle', 0.33),
                age_distribution.get('elderly', 0.34)
            ]
        )[0]

        # Filter users by age group
        if age_group == 'young':
            candidates = [u for u in self.test_users if 'child' in u.email or 'teen' in u.email]
        elif age_group == 'middle':
            candidates = [u for u in self.test_users if 'adult' in u.email or 'middle' in u.email]
        else:
            candidates = [u for u in self.test_users if 'elderly' in u.email]

        return random.choice(candidates) if candidates else random.choice(self.test_users)

    def get_arrival_hour(self, is_emergency):
        """Get arrival hour based on emergency status"""
        if is_emergency:
            # Emergency patients arrive throughout the day
            hours = list(range(0, 24))
            weights = [self.HOURLY_PATTERNS.get(h, {'emergency_multiplier': 1.0})['emergency_multiplier']
                      for h in hours]
        else:
            # Regular patients during operating hours
            hours = list(self.HOURLY_PATTERNS.keys())
            weights = [self.HOURLY_PATTERNS[h]['congestion'] for h in hours]

        return random.choices(hours, weights=weights)[0] if hours else 9

    def calculate_realistic_wait_time(self, pattern, hour, is_emergency, season):
        """Calculate realistic wait time with multiple factors"""
        base_wait = pattern['base_wait']

        # Hour factor
        hour_data = self.HOURLY_PATTERNS.get(hour, {'congestion': 0.5})
        hour_factor = hour_data['congestion']

        # Emergency factor
        emergency_factor = 0.3 if is_emergency else 1.0

        # Peak multiplier
        peak_factor = 1.0
        if hour in [10, 11, 14, 15]:  # Peak hours
            peak_factor = pattern['peak_multiplier']

        # Random variation (±20%)
        random_factor = random.uniform(0.8, 1.2)

        # Calculate final wait time
        wait_time = int(
            base_wait * hour_factor * emergency_factor *
            peak_factor * random_factor
        )

        # Ensure reasonable bounds
        if is_emergency:
            wait_time = min(wait_time, 15)  # Emergency max 15 min
        else:
            wait_time = max(5, min(wait_time, 180))  # Regular 5-180 min

        return wait_time

    def generate_state_progression(self, arrival_time, wait_time, service_time):
        """Generate realistic state progression for a patient"""
        states = []
        current_time = arrival_time

        # Waiting state
        states.append({
            'state': 'waiting',
            'timestamp': current_time,
            'wait_time': wait_time,
            'position': random.randint(1, 20)
        })

        # Called state (after wait time)
        current_time += timedelta(minutes=wait_time)
        states.append({
            'state': 'called',
            'timestamp': current_time,
            'wait_time': 0,
            'position': 0
        })

        # In progress state (5 minutes after called)
        current_time += timedelta(minutes=5)
        states.append({
            'state': 'in_progress',
            'timestamp': current_time,
            'wait_time': 0,
            'position': 0
        })

        # Completed state (after service time)
        current_time += timedelta(minutes=service_time)
        states.append({
            'state': 'completed',
            'timestamp': current_time,
            'wait_time': 0,
            'position': 0
        })

        return states

    def create_patient_journey(self, user, exam, arrival_time, wait_time, is_emergency):
        """Create a patient journey record"""
        return {
            'user_id': user.user_id,
            'exam': exam.exam_id,
            'arrival': arrival_time,
            'wait_time': wait_time,
            'is_emergency': is_emergency,
            'states': ['arrived', 'waiting', 'called', 'in_progress', 'completed']
        }

    def create_referral(self, user, referral_dept, referral_time):
        """Create referral to another department"""
        exam = Exam.objects.filter(department=referral_dept).first()
        if not exam:
            return None

        appointment_id = f'REF_{uuid.uuid4().hex[:8]}'
        appointment = Appointment(
            appointment_id=appointment_id,
            user=user,
            exam=exam,
            scheduled_at=referral_time,
            status='referred'
        )

        queue_id = uuid.uuid4()
        queue = Queue(
            queue_id=queue_id,
            appointment_id=appointment_id,
            user=user,
            exam=exam,
            state='waiting',
            queue_number=random.randint(1, 100),
            estimated_wait_time=15,  # Referrals usually faster
            priority='normal',
            created_at=referral_time,
            updated_at=referral_time
        )

        log = QueueStatusLog(
            log_id=uuid.uuid4(),
            queue_id=queue_id,
            new_state='waiting',
            new_number=queue.queue_number,
            created_at=referral_time,
            metadata={'referral': True}
        )

        return {
            'appointments': [appointment],
            'queues': [queue],
            'logs': [log]
        }

    def print_detailed_summary(self):
        """Print detailed summary of generated data"""
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('📊 Enhanced Data Generation Summary')
        self.stdout.write('=' * 60)

        # Overall statistics
        total_queues = Queue.objects.count()
        total_appointments = Appointment.objects.count()
        total_logs = QueueStatusLog.objects.count()

        self.stdout.write(f'Total Queues: {total_queues:,}')
        self.stdout.write(f'Total Appointments: {total_appointments:,}')
        self.stdout.write(f'Total Logs: {total_logs:,}')

        # Department statistics
        self.stdout.write('\n📋 Department Statistics:')
        for dept in self.DEPT_PATTERNS.keys():
            queues = Queue.objects.filter(exam__department=dept)
            if queues.exists():
                stats = queues.aggregate(
                    count=models.Count('queue_id'),
                    avg_wait=models.Avg('estimated_wait_time'),
                    min_wait=models.Min('estimated_wait_time'),
                    max_wait=models.Max('estimated_wait_time')
                )
                self.stdout.write(
                    f'   {dept}: {stats["count"]:,} queues, '
                    f'Wait time: {stats["min_wait"]:.0f}-{stats["max_wait"]:.0f} min '
                    f'(avg: {stats["avg_wait"]:.1f})'
                )

        # State distribution
        self.stdout.write('\n📈 State Distribution:')
        states = Queue.objects.values('state').annotate(count=models.Count('queue_id'))
        for state in states:
            percentage = (state['count'] / total_queues) * 100
            self.stdout.write(f'   {state["state"]}: {state["count"]:,} ({percentage:.1f}%)')

        # Priority distribution
        self.stdout.write('\n🚨 Priority Distribution:')
        priorities = Queue.objects.values('priority').annotate(count=models.Count('queue_id'))
        for priority in priorities:
            percentage = (priority['count'] / total_queues) * 100
            self.stdout.write(f'   {priority["priority"]}: {priority["count"]:,} ({percentage:.1f}%)')

        # Time-based analysis
        self.stdout.write('\n⏰ Hourly Distribution:')
        for hour in range(6, 21):
            hour_queues = Queue.objects.filter(
                created_at__hour=hour
            ).count()
            if hour_queues > 0:
                percentage = (hour_queues / total_queues) * 100
                bar = '█' * int(percentage / 2)
                self.stdout.write(f'   {hour:02d}:00: {bar} {hour_queues:,} ({percentage:.1f}%)')

        self.stdout.write('=' * 60)