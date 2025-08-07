from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()

class Queue(models.Model):
    """
    대기열을 관리하는 모델
    검사별 환자 대기 순서 및 상태 관리
    """

    STATE_CHOICES = [
        ('waiting', '대기중'),
        ('called', '호출됨'),
        ('in_progress', '진행중'),
        ('completed', '완료됨'),
        ('cancelled', '취소됨'),
    ]

    PRIORITY_CHOICES = [
        ('normal', '일반'),
        ('urgent', '긴급'),
        ('emergency', '응급'),
    ]

    # Primary Key
    queue_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='대기열 ID'
    )

    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.CASCADE,
        related_name='queues',
        verbose_name='예약',
        to_field='appointment_id',
        db_column='appointment_id'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='queues',
        verbose_name='환자',
        db_column='user_id'
    )

    exam = models.ForeignKey(
        'appointments.Exam',
        on_delete=models.CASCADE,
        related_name='queues',
        verbose_name='검사',
        to_field='exam_id',
        db_column="exam_id"
    )

    state = models.CharField(
        max_length=20,
        choices=STATE_CHOICES,
        default='waiting',
        verbose_name='대기열 상태'
    )

    queue_number = models.IntegerField(
        verbose_name='대기 순번'
    )

    estimated_wait_time = models.IntegerField(
        verbose_name='예상 대기 시간',
        help_text='분 단위',
        default=0,
    )

    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='normal',
        verbose_name='우선 순위 구분'
    )

    called_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='호출 시간'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='대기열 등록 시간'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='대기열 상태 변경 시간'
    )

    # 새로운 필드 추가
    schedule = models.ForeignKey(
        'DailySchedule', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='related_queues',
        verbose_name='일일 스케줄 연결',
        db_column='schedule_id'
    )

    class Meta:
        db_table = 'queues'
        verbose_name = '대기열'
        verbose_name_plural = '대기열 목록'
        ordering = ['priority', 'queue_number']
        indexes = [
            models.Index(fields=['exam', 'state']),
            models.Index(fields=['user']),
            models.Index(fields=['state', 'queue_number']),
            models.Index(fields=['created_at']),
            models.Index(fields=['priority', 'state']),
        ]

    def __str__(self):
        return f"대기번호 {self.queue_number} - {self.get_state_display()}"

    def call_patient(self):
        """환자 호출 처리"""
        self.state = 'called'
        self.called_at = timezone.now()
        self.save(update_fields=['state', 'called_at', 'updated_at'])

        # 대기시간 재계산 트리거
        self.recalculate_wait_times()

    def start_examination(self):
        """검사 시작 처리"""
        self.state = 'in_progress'
        self.save(update_fields=['state', 'updated_at'])

    def complete_examination(self):
        """검사 완료 처리"""
        self.state = 'completed'
        self.save(update_fields=['state', 'updated_at'])

        # 대기열 번호 재정렬
        self.reorder_queue_numbers()

    def cancel(self):
        """대기 취소 처리"""
        self.state = 'cancelled'
        self.save(update_fields=['state', 'updated_at'])

        # 대기열 번호 재정렬
        self.reorder_queue_numbers()

    def update_priority(self, new_priority):
        """우선순위 변경"""
        if new_priority in dict(self.PRIORITY_CHOICES):
            old_priority = self.priority
            self.priority = new_priority
            self.save(update_fields=['priority', 'updated_at'])

            # 우선순위 변경 시 대기열 재정렬
            if old_priority != new_priority:
                self.reorder_queue_numbers()

    def recalculate_wait_times(self):
        """대기시간 재계산"""
        waiting_queues_to_update = []
        waiting_queues = Queue.objects.filter(
            exam=self.exam,
            state='waiting'
        ).order_by('priority', 'queue_number')

        base_wait_time = 15  # 기본 검사 시간 15분
        current_wait = 0

        for queue in waiting_queues:
            queue.estimated_wait_time = current_wait
            waiting_queues_to_update.append(queue) # 업데이트할 객체를 리스트에 추가 =

            # 우선순위에 따른 가중치
            if queue.priority == 'emergency':
                current_wait += base_wait_time * 0.5
            elif queue.priority == 'urgent':
                current_wait += base_wait_time * 0.75
            else:
                current_wait += base_wait_time

        if waiting_queues_to_update:
            # 루프 밖에서 한 번에 벌크 업데이트 실행
            Queue.objects.bulk_update(waiting_queues_to_update, ['estimated_wait_time'])

    def reorder_queue_numbers(self):
        active_queues_to_update = []
        active_queues = Queue.objects.filter(
            exam=self.exam,
            state__in=['waiting', 'called']
        ).order_by('priority', 'created_at')  # 우선순위 내에서 생성 시간 기준으로 정렬하여 순서 안정화

        with transaction.atomic():  # 모든 업데이트를 하나의 트랜잭션으로 묶음
            for index, queue in enumerate(active_queues, start=1):
                if queue.queue_number != index:  # 변경이 필요한 경우에만 업데이트 리스트에 추가
                    queue.queue_number = index
                    active_queues_to_update.append(queue)

            if active_queues_to_update:
                # 루프 밖에서 한 번에 벌크 업데이트 실행
                Queue.objects.bulk_update(active_queues_to_update, ['queue_number'])

    @classmethod
    def get_current_queue_status(cls, exam):
        """특정 검사의 현재 대기열 상태 조회"""
        return cls.objects.filter(
            exam=exam,
            state__in=['waiting', 'called', 'in_progress']
        ).order_by('priority', 'queue_number')

    @classmethod
    def get_next_queue_number(cls, exam):
        """다음 대기번호 생성"""
        last_queue = cls.objects.filter(
            exam=exam
        ).order_by('-queue_number').first()

        return (last_queue.queue_number + 1) if last_queue else 1

    @classmethod
    def create_from_appointment(cls, appointment, priority='normal'):
        """예약으로부터 대기열 생성"""
        queue_number = cls.get_next_queue_number(appointment.exam)

        queue = cls.objects.create(
            appointment=appointment,
            user=appointment.user,
            exam=appointment.exam,
            queue_number=queue_number,
            priority=priority,
        )

        queue.recalculate_wait_times()

        return queue


class QueueStatusLog(models.Model):
    """
    대기열 상태 변경 로그
    대기열의 모든 상태 변경을 추적
    """

    log_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='로그 ID'
    )

    queue = models.ForeignKey(
        Queue,
        on_delete=models.CASCADE,
        related_name='status_logs',
        verbose_name='대기열',
        db_column='queue_id'
    )

    previous_state = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name='이전 상태',
    )

    new_state = models.CharField(
        max_length=20,
        verbose_name='새 상태'
    )

    previous_number = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='이전 대기번호',
    )

    new_number = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='새 대기번호'
    )

    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='queue_changes',
        verbose_name='변경자',
    )

    reason = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='변경 사유'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='변경 시간'
    )

    # 새 필드 추가
    queue_position_at_time = models.IntegerField(
        null=True, 
        blank=True, 
        verbose_name='변경 시점 대기순서'
    )
    estimated_wait_time_at_time = models.IntegerField(
        null=True, 
        blank=True, 
        verbose_name='변경 시점 예상대기시간'
    )
    location = models.CharField(
        max_length=36, 
        null=True, 
        blank=True, 
        verbose_name='변경 시점 위치'
    )
    metadata = models.JSONField(
        null=True, 
        blank=True, 
        verbose_name='추가 컨텍스트 정보'
    )

    class Meta:
        db_table = 'queue_status_logs'
        verbose_name = '대기열 상태 로그'
        verbose_name_plural = '대기열 상태 로그 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['queue', 'created_at']),
            models.Index(fields=['new_state']),
            models.Index(fields=['location']), 
        ]

    def __str__(self):
        return f"{self.queue.queue_id} - {self.previous_state} → {self.new_state}"

# 환자 상태 관리 모델 추가
class PatientState(models.Model):
    """환자별 현재 상태 관리"""
    state_id = models.CharField(max_length=36, primary_key=True, default=uuid.uuid4)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_state')  # 'users.User' → User
    
    STATE_CHOICES = [
        ('UNREGISTERED', 'Unregistered'),
        ('ARRIVED', 'Arrived'),
        ('REGISTERED', 'Registered'),
        ('WAITING', 'Waiting'),
        ('CALLED', 'Called'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('PAYMENT', 'Payment'),
        ('FINISHED', 'Finished'),
    ]
    current_state = models.CharField(max_length=20, choices=STATE_CHOICES, default='UNREGISTERED')
    current_location = models.CharField(max_length=36, null=True, blank=True)
    current_exam = models.CharField(max_length=50, null=True, blank=True)
    emr_patient_id = models.CharField(max_length=100, null=True, blank=True)
    
    # EMR 정보
    emr_raw_status = models.CharField(max_length=50, null=True, blank=True)
    emr_department = models.CharField(max_length=50, null=True, blank=True)
    emr_appointment_time = models.DateTimeField(null=True, blank=True)
    emr_latest_update = models.DateTimeField(null=True, blank=True)
    
    # 로그인 정보
    is_logged_in = models.BooleanField(default=False)
    login_method = models.CharField(max_length=20, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patient_states'
        indexes = [
            models.Index(fields=['current_state']),
            models.Index(fields=['emr_patient_id']),
            models.Index(fields=['emr_appointment_time']),
        ]
        
    def __str__(self):
        return f"{self.user.name} - {self.current_state}"


class StateTransition(models.Model):
    """상태 전환 히스토리"""
    transition_id = models.CharField(max_length=36, primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='state_transitions')  # 'users.User' → User
    
    STATE_CHOICES = [
        ('UNREGISTERED', 'Unregistered'),
        ('ARRIVED', 'Arrived'),
        ('REGISTERED', 'Registered'),
        ('WAITING', 'Waiting'),
        ('CALLED', 'Called'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('PAYMENT', 'Payment'),
        ('FINISHED', 'Finished'),
    ]
    from_state = models.CharField(max_length=20, choices=STATE_CHOICES, null=True, blank=True)
    to_state = models.CharField(max_length=20, choices=STATE_CHOICES)
    
    TRIGGER_CHOICES = [
        ('emr_sync', 'EMR Sync'),
        ('nfc_tag', 'NFC Tag'),
        ('system_auto', 'System Auto'),
        ('nurse_manual', 'Nurse Manual'),
    ]
    trigger_type = models.CharField(max_length=20, choices=TRIGGER_CHOICES)
    trigger_source = models.CharField(max_length=100, null=True, blank=True)
    
    # 컨텍스트 정보
    location_at_transition = models.CharField(max_length=36, null=True, blank=True)
    exam_id = models.CharField(max_length=50, null=True, blank=True)
    emr_reference = models.CharField(max_length=100, null=True, blank=True)
    
    # EMR 상태 스냅샷
    emr_status_before = models.CharField(max_length=50, null=True, blank=True)
    emr_status_after = models.CharField(max_length=50, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'state_transitions'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['trigger_type', 'created_at']),
            models.Index(fields=['from_state', 'to_state']),
        ]
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.user.name}: {self.from_state} → {self.to_state}"


class DailySchedule(models.Model):
    """환자 일일 스케줄"""
    schedule_id = models.CharField(max_length=36, primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_schedules')  # 'users.User' → User
    schedule_date = models.DateField()
    exam_id = models.CharField(max_length=50)
    sequence_order = models.IntegerField()
    
    # EMR 연동 정보
    emr_appointment_id = models.CharField(max_length=100, null=True, blank=True)
    emr_status_code = models.CharField(max_length=50, null=True, blank=True)
    emr_department = models.CharField(max_length=50, null=True, blank=True)
    emr_doctor_name = models.CharField(max_length=100, null=True, blank=True)
    emr_room_number = models.CharField(max_length=20, null=True, blank=True)
    emr_last_sync = models.DateTimeField(null=True, blank=True)
    
    # 우리 시스템 상태
    QUEUE_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('waiting', 'Waiting'),
        ('called', 'Called'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
    ]
    our_queue_status = models.CharField(max_length=20, choices=QUEUE_STATUS_CHOICES, default='not_started')
    estimated_start_time = models.TimeField(null=True, blank=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    result_ready_time = models.DateTimeField(null=True, blank=True)
    result_location = models.CharField(max_length=200, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'daily_schedules'
        indexes = [
            models.Index(fields=['user', 'schedule_date']),
            models.Index(fields=['schedule_date', 'sequence_order']),
            models.Index(fields=['emr_appointment_id']),
        ]
        ordering = ['schedule_date', 'sequence_order']
        
    def __str__(self):
        return f"{self.user.name} - {self.schedule_date} ({self.sequence_order})"