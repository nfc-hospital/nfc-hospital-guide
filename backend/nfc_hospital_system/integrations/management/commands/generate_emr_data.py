import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from p_queue.models import Queue, PatientState, QueueStatusLog
from appointments.models import Exam, Appointment
from integrations.models import EmrSyncStatus
from authentication.models import User
import uuid


class Command(BaseCommand):
    help = 'Generates virtual EMR data for LSTM model training using bulk creation.'

    def add_arguments(self, parser):
        parser.add_argument('--months', type=int, default=3, help='Number of months of data to generate.')
        parser.add_argument('--daily-patients', type=int, default=250, help='Average number of patients per day.')

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Optimized EMR data generation process started...")

        # 1. 데이터 초기화
        self.stdout.write("Deleting existing data...")
        Queue.objects.all().delete()
        PatientState.objects.all().delete()
        QueueStatusLog.objects.all().delete()
        EmrSyncStatus.objects.all().delete()
        Appointment.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("Existing data deleted."))

        # 2. 데이터 생성 준비
        admin_user = User.objects.filter(role__in=['super', 'dept']).first()
        if not admin_user:
            self.stdout.write(self.style.ERROR("No admin user found. Please create one."))
            return

        # 환자 유저들 가져오기
        patient_users = list(User.objects.filter(role='patient'))
        if len(patient_users) < 50:
            self.stdout.write(self.style.WARNING(f"Only {len(patient_users)} patient users found. Creating additional virtual patients..."))
            # 가상 환자 생성
            for i in range(50 - len(patient_users)):
                virtual_patient = User.objects.create(
                    email=f"virtual_patient_{i}@hospital.com",
                    name=f"가상환자{i}",
                    phone_number=f"010-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
                    birth_date=timezone.now().date() - timedelta(days=random.randint(365*20, 365*80)),
                    role='patient',
                    patient_id=f"VP{i:04d}"
                )
                patient_users.append(virtual_patient)

        exams = list(Exam.objects.filter(is_active=True))
        if not exams:
            self.stdout.write(self.style.ERROR("No exams found. Please create exams first."))
            return

        self.stdout.write(f"Found {len(exams)} exams across departments")

        # 3. 데이터 생성 실행
        self.stdout.write("Generating new patient journey data...")
        end_date = timezone.now()
        start_date = end_date - timedelta(days=options['months'] * 30)

        total_patients_generated = self.generate_patient_data(
            start_date, end_date,
            options['daily_patients'],
            exams, admin_user, patient_users
        )

        self.stdout.write(self.style.SUCCESS(f"Successfully generated and saved data for {total_patients_generated} patients."))

        # 4. 최종 통계 출력
        self.stdout.write(f"Data includes:")
        self.stdout.write(f"- {Queue.objects.count()} queue entries")
        self.stdout.write(f"- {QueueStatusLog.objects.count()} status logs")
        self.stdout.write(f"- {EmrSyncStatus.objects.count()} EMR sync records")
        self.stdout.write(f"- {Appointment.objects.count()} appointments")
        self.stdout.write(f"- {PatientState.objects.count()} patient states")

    def generate_patient_data(self, start_date, end_date, daily_patients, exams, admin_user, patient_users):
        WEEKDAY_FACTOR = {0: 1.3, 1: 1.0, 2: 1.0, 3: 1.0, 4: 0.7, 5: 0.3, 6: 0.3}
        HOURLY_FACTOR = {9: 1.5, 10: 1.5, 11: 1.3, 12: 0.6, 13: 1.0, 14: 1.2, 15: 1.2, 16: 1.0, 17: 0.8}
        STATE_TRANSITIONS = {
            'UNREGISTERED': (0, 0),
            'ARRIVED': (5, 2),
            'REGISTERED': (10, 3),
            'WAITING': (30, 15),
            'CALLED': (5, 2),
            'IN_PROGRESS': (15, 5),
            'COMPLETED': (5, 2),
            'PAYMENT': (10, 5),
            'FINISHED': (0, 0)
        }

        appointments_to_create = []
        patient_states_to_create = []
        queues_to_create = []
        status_logs_to_create = []
        emr_statuses_to_create = []

        total_patients = 0
        current_date = start_date

        self.stdout.write(f"Generating data from {start_date.date()} to {end_date.date()}")

        while current_date < end_date:
            weekday = current_date.weekday()
            if weekday > 4:  # Skip weekends
                current_date += timedelta(days=1)
                continue

            day_patients_count = int(daily_patients * WEEKDAY_FACTOR.get(weekday, 1.0) * random.uniform(0.9, 1.1))

            for hour in range(9, 18):
                if hour not in HOURLY_FACTOR:
                    continue

                hour_patients_count = int(day_patients_count * (HOURLY_FACTOR[hour] / sum(HOURLY_FACTOR.values())) * random.uniform(0.8, 1.2))

                for _ in range(hour_patients_count):
                    exam = random.choice(exams)
                    patient = random.choice(patient_users)

                    # Generate unique IDs
                    appointment_id = f"APT-{uuid.uuid4().hex[:12]}"
                    queue_id = uuid.uuid4()
                    emr_patient_id = f"EMR-{patient.patient_id or patient.user_id}-{total_patients}"

                    current_time = timezone.make_aware(datetime(
                        current_date.year, current_date.month, current_date.day, hour,
                        random.randint(0, 59), random.randint(0, 59)
                    ))

                    # 1. Appointment
                    appointment = Appointment(
                        appointment_id=appointment_id,
                        user=patient,
                        exam=exam,
                        scheduled_at=current_time,
                        status='completed'
                    )
                    appointments_to_create.append(appointment)

                    # 2. PatientState
                    patient_state = PatientState(
                        state_id=str(uuid.uuid4()),
                        user=patient,
                        current_state='FINISHED',
                        current_exam=exam,
                        emr_patient_id=emr_patient_id,
                        created_at=current_time,
                        updated_at=current_time + timedelta(minutes=90)
                    )
                    patient_states_to_create.append(patient_state)

                    # 3. Queue
                    queue_entry = Queue(
                        queue_id=queue_id,
                        appointment=appointment,
                        user=patient,
                        exam=exam,
                        state='completed',
                        queue_number=total_patients % 100 + 1,
                        created_at=current_time,
                        updated_at=current_time + timedelta(minutes=90),
                        estimated_wait_time=0
                    )
                    queues_to_create.append(queue_entry)

                    # 4. EMRSyncStatus
                    emr_status = EmrSyncStatus(
                        sync_id=str(uuid.uuid4()),
                        patient_emr_id=emr_patient_id,
                        user=patient,
                        last_sync_time=current_time,
                        sync_success=True,
                        mapped_state='FINISHED',
                        emr_department=exam.department,
                        emr_appointment_date=current_time.date(),
                        emr_appointment_time=current_time.time(),
                        created_at=current_time,
                        updated_at=current_time + timedelta(minutes=90)
                    )
                    emr_statuses_to_create.append(emr_status)

                    # 5. QueueStatusLog entries
                    previous_state = None
                    for state, (avg_duration, variance) in STATE_TRANSITIONS.items():
                        if state == 'UNREGISTERED':
                            continue

                        duration = max(0, avg_duration + random.randint(-variance, variance))
                        current_time += timedelta(minutes=duration)

                        log_entry = QueueStatusLog(
                            log_id=uuid.uuid4(),
                            queue=queue_entry,
                            previous_state=previous_state.lower() if previous_state else None,
                            new_state=state.lower() if state != 'IN_PROGRESS' else 'in_progress',
                            changed_by=admin_user,
                            created_at=current_time,
                            queue_position_at_time=total_patients % 100 + 1,
                            estimated_wait_time_at_time=max(0, 90 - duration)
                        )
                        status_logs_to_create.append(log_entry)
                        previous_state = state

                    total_patients += 1

                    # Progress update
                    if total_patients % 1000 == 0:
                        self.stdout.write(f"Prepared {total_patients} patient journeys...")

            current_date += timedelta(days=1)

        # Bulk create all data
        self.stdout.write(f"Bulk creating {total_patients} patient journeys...")

        # First create appointments as they are referenced by queues
        Appointment.objects.bulk_create(appointments_to_create, batch_size=500)
        self.stdout.write("Appointments created...")

        # Create patient states (independent)
        # Remove duplicates for patient states (one per user)
        unique_states = {}
        for state in patient_states_to_create:
            if state.user_id not in unique_states:
                unique_states[state.user_id] = state
        PatientState.objects.bulk_create(unique_states.values(), batch_size=500)
        self.stdout.write("Patient states created...")

        # Create queues (references appointments)
        Queue.objects.bulk_create(queues_to_create, batch_size=500)
        self.stdout.write("Queues created...")

        # Create EMR sync statuses
        EmrSyncStatus.objects.bulk_create(emr_statuses_to_create, batch_size=500)
        self.stdout.write("EMR sync statuses created...")

        # Create queue status logs (references queues)
        QueueStatusLog.objects.bulk_create(status_logs_to_create, batch_size=500)
        self.stdout.write("Queue status logs created...")

        return total_patients