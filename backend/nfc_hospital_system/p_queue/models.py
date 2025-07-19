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
        help_text='분 단위'
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
        verbose_name='이전 상태'
    )

    new_state = models.CharField(
        max_length=20,
        verbose_name='새 상태'
    )

    previous_number = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='이전 대기번호'
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

    class Meta:
        db_table = 'queue_status_logs'
        verbose_name = '대기열 상태 로그'
        verbose_name_plural = '대기열 상태 로그 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['queue', 'created_at']),
            models.Index(fields=['new_state']),
        ]

    def __str__(self):
        return f"{self.queue.queue_id} - {self.previous_state} → {self.new_state}"
