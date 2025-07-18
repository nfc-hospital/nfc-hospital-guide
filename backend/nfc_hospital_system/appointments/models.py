from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()

class Exam(models.Model):
    """
    검사 종류를 관리하는 모델
    병원에서 제공하는 각종 검사/진료 정보
    """

    # Primary Key
    exam_id = models.CharField(
        max_length=50,
        primary_key=True,
        verbose_name='검사 ID'
    )

    # 검사 정보
    title = models.CharField(
        max_length=200,
        verbose_name='검사명',
        help_text='예: 흉부 X-ray, 복부 CT, 뇌 MRI'
    )

    description = models.TextField(
        verbose_name='검사 설명',
        help_text='검사 상세 설명'
    )

    department = models.CharField(
        max_length=100,
        verbose_name='담당 부서',
        help_text='예: 영상의학과, 진단검사의학과'
    )

    duration = models.IntegerField(
        verbose_name='예상 소요 시간',
        help_text='분 단위'
    )

    # 활성 상태
    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태',
        help_text='검사 시행 가능한 검사 여부'
    )

    # 시간 정보
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일시'
    )

    class Meta:
        db_table = 'exams'
        verbose_name = '검사'
        verbose_name_plural = '검사 목록'
        ordering = ['department', 'title']
        indexes = [
            models.Index(fields=['department']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.title} ({self.department})"


class Appointment(models.Model):
    """
    검사 예약을 관리하는 모델
    환자의 검사 예약 정보 및 상태 추적
    """

    STATUS_CHOICES = [
        ('waiting', '대기중'),
        ('ongoing', '진행중'),
        ('done', '완료'),
        ('delayed', '지연'),
    ]

    appointment_id = models.CharField(
        max_length=50,
        primary_key=True,
        verbose_name='예약 ID'
    )

    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='appointments',
        verbose_name='검사',
        to_field='exam_id',
        db_column="exam_id"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='appointments',
        verbose_name='환자',
        to_field='user_id',
        db_column="user_id"
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='waiting',
        verbose_name='상태'
    )

    arrival_confirmed = models.BooleanField(
        default=False,
        verbose_name='도착 확인'
    )

    scheduled_at = models.DateTimeField(
        verbose_name='예약 시간'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    class Meta:
        db_table = 'appointments'
        verbose_name = '검사 예약'
        verbose_name_plural = '검사 예약 목록'
        ordering = ['scheduled_at']
        indexes = [
            models.Index(fields=['user', 'scheduled_at']),
            models.Index(fields=['exam', 'scheduled_at']),
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['scheduled_at']),
        ]

    def __str__(self):
        return f"{self.user.name} - {self.exam.title} ({self.scheduled_at.strftime('%Y-%m-%d %H:%M')})"

    def confirm_arrival(self):
        """도착 확인 처리"""
        self.arrival_confirmed = True
        self.save(update_fields=['arrival_confirmed'])

    def update_status(self, new_status):
        """상태 업데이트"""
        if new_status in dict(self.STATUS_CHOICES):
            self.status = new_status
            self.save(update_fields=['status'])

    def get_expected_end_time(self):
        """예상 종료 시간 계산"""
        from datetime import timedelta
        return self.scheduled_at + timedelta(minutes=self.exam.duration)

    @classmethod
    def get_todays_appointments(cls, user=None):
        """오늘의 예약 조회"""
        from datetime import date
        today = date.today()
        queryset = cls.objects.filter(
            scheduled_at__date=today
        ).select_related('exam', 'user')

        if user:
            queryset = queryset.filter(user=user)

        return queryset.order_by('scheduled_at')


class ExamPreparation(models.Model):
    """
    검사 준비사항을 관리하는 모델
    각 검사별로 필요한 준비사항 안내
    """

    prep_id = models.AutoField(
        primary_key=True,
        verbose_name='준비사항 ID'
    )

    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='preparations',
        verbose_name='검사',
        to_field='exam_id',
        db_column="exam_id"
    )

    title = models.CharField(
        max_length=200,
        verbose_name='준비 사항',
        help_text='예: 8시간 금식, 방광 충만 상태 유지'
    )

    description = models.TextField(
        verbose_name='상세 설명'
    )

    is_required = models.BooleanField(
        default=True,
        verbose_name='필수 여부'
    )

    class Meta:
        db_table = 'exam_preparations'
        verbose_name = '검사 준비사항'
        verbose_name_plural = '검사 준비사항 목록'
        ordering = ['exam', '-is_required', 'title']
        indexes = [
            models.Index(fields=['exam', 'is_required']),
        ]

    def __str__(self):
        required = "필수" if self.is_required else "선택"
        return f"{self.exam.title} - {self.title} ({required})"


class AppointmentHistory(models.Model):
    """
    예약 변경 이력을 관리하는 모델
    예약의 상태 변경, 시간 변경 등을 추적
    """

    ACTION_CHOICES = [
        ('created', '예약 생성'),
        ('confirmed', '도착 확인'),
        ('status_changed', '상태 변경'),
        ('time_changed', '시간 변경'),
        ('cancelled', '예약 취소'),
    ]

    history_id = models.AutoField(
        primary_key=True,
        verbose_name='이력 ID'
    )

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='histories',
        verbose_name='예약',
        db_column='appointment_id'
    )

    # 이력 정보
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name='액션'
    )

    note = models.TextField(
        blank=True,
        null=True,
        verbose_name='비고'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='appointment_changes',
        verbose_name='변경자'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    class Meta:
        db_table = 'appointment_histories'
        verbose_name = '예약 변경 이력'
        verbose_name_plural = '예약 변경 이력 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['appointment', 'created_at']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f"{self.appointment.appointment_id} - {self.get_action_display()} ({self.created_at})"
