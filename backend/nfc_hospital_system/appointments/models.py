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

    average_duration = models.IntegerField(
        verbose_name='평균 소요 시간',
        help_text='실제 검사 데이터 기반의 평균 소요 시간 (분 단위)',
        default=30 
    )

    buffer_time = models.IntegerField(
        verbose_name='버퍼 시간',
        help_text='검사 준비, 환자 이동 등을 위한 추가 시간 (분 단위)',
        default=5 
    )

    # 위치 정보 - NFCTag 참조로 변경
    location_tag = models.ForeignKey(
        'nfc.NFCTag',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exam_locations',
        verbose_name='위치 태그',
        help_text='검사실 위치의 NFC 태그'
    )

    # category 필드 추가
    category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='검사 분류',
        help_text='예: "imaging", "blood", "urine", "cardiac"'
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
            models.Index(fields=['location_tag']), 
            models.Index(fields=['category']), 
        ]

    def __str__(self):
        return f"{self.title} ({self.department})"
    
    @property
    def building(self):
        """NFCTag에서 건물명 가져오기"""
        return self.location_tag.building if self.location_tag else None
    
    @property
    def floor(self):
        """NFCTag에서 층수 가져오기"""
        return self.location_tag.floor if self.location_tag else None
    
    @property
    def room(self):
        """NFCTag에서 호실명 가져오기"""
        return self.location_tag.room if self.location_tag else None
    
    @property
    def x_coord(self):
        """NFCTag에서 X 좌표 가져오기"""
        return self.location_tag.x_coord if self.location_tag else 0.0
    
    @property
    def y_coord(self):
        """NFCTag에서 Y 좌표 가져오기"""
        return self.location_tag.y_coord if self.location_tag else 0.0


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
        return self.scheduled_at + timedelta(minutes=self.exam.average_duration)

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

    # 준비사항 타입 선택지를 정의합니다.
    PREP_TYPE_CHOICES = [
        ('general', '일반 준비'),
        ('fasting', '금식'),
        ('medication', '약물 관련'),
        ('bladder', '방광 관련'),
        ('clothing', '복장'), 
        ('documents', '서류'),
        ('arrival', '도착'),
        ('other', '기타'),
    ]

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

    # type 필드 추가
    type = models.CharField(
        max_length=50,
        choices=PREP_TYPE_CHOICES,
        default='general', # 기본값 설정
        verbose_name='준비사항 타입',
        help_text='예: 금식, 약물, 복장 등 준비사항의 종류'
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

    icon = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='아이콘 이미지',
        help_text='준비사항을 나타내는 아이콘 이미지 (예: URL 또는 파일 경로)'
    )

    class Meta:
        db_table = 'exam_preparations'
        verbose_name = '검사 준비사항'
        verbose_name_plural = '검사 준비사항 목록'
        ordering = ['exam', '-is_required', 'title']
        indexes = [
            models.Index(fields=['exam', 'is_required']),
            models.Index(fields=['exam', 'type']),
        ]

    def __str__(self):
        required = "필수" if self.is_required else "선택"
        return f"{self.exam.title} - {self.get_type_display()} - {self.title} ({required})"


class ExamResult(models.Model):
    """
    검사 결과를 관리하는 모델
    각 예약별 검사 결과 및 의사 소견
    """

    result_id = models.CharField(
        max_length=50,
        primary_key=True,
        default=uuid.uuid4,
        verbose_name='결과 ID'
    )

    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name='result',
        verbose_name='예약',
        db_column='appointment_id'
    )

    # 결과 정보
    summary = models.TextField(
        verbose_name='결과 요약',
        help_text='환자가 이해하기 쉬운 검사 결과 요약'
    )

    result_pdf_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='상세 결과지 PDF 링크',
        help_text='상세 검사 결과 PDF 파일 URL'
    )

    doctor_notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='의사 소견',
        help_text='담당 의사의 추가 소견'
    )

    # 결과 상태
    is_normal = models.BooleanField(
        default=True,
        verbose_name='정상 여부',
        help_text='검사 결과 정상 여부'
    )

    requires_followup = models.BooleanField(
        default=False,
        verbose_name='추가 검사 필요',
        help_text='추가 검사나 진료가 필요한지 여부'
    )

    # 시간 정보
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='결과 생성일시'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='결과 수정일시'
    )

    # 작성자 정보
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_exam_results',
        verbose_name='결과 작성자',
        help_text='검사 결과를 입력한 의료진'
    )

    class Meta:
        db_table = 'exam_results'
        verbose_name = '검사 결과'
        verbose_name_plural = '검사 결과 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['appointment']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_normal', 'requires_followup']),
        ]

    def __str__(self):
        return f"{self.appointment.user.name} - {self.appointment.exam.title} 결과 ({self.created_at.strftime('%Y-%m-%d')})"

    def save(self, *args, **kwargs):
        """저장 시 관련 예약 상태 확인"""
        if self.appointment.status != 'done':
            raise ValueError("검사가 완료되지 않은 예약에는 결과를 저장할 수 없습니다.")
        super().save(*args, **kwargs)


class ExamPostCareInstruction(models.Model):
    """
    검사 후 주의사항을 관리하는 모델
    각 검사별로 필요한 검사 후 주의사항 안내
    """

    # 주의사항 타입 선택지
    INSTRUCTION_TYPE_CHOICES = [
        ('general', '일반 주의사항'),
        ('medication', '약물 복용'),
        ('diet', '식이 주의사항'),
        ('activity', '활동 제한'),
        ('symptoms', '증상 관찰'),
        ('followup', '추후 관리'),
        ('side_effects', '부작용 관찰'),
        ('wound_care', '상처 관리'),
        ('hydration', '수분 섭취'),
        ('rest', '휴식'),
        ('other', '기타'),
    ]

    # 우선순위 선택지
    PRIORITY_CHOICES = [
        ('high', '중요'),
        ('medium', '보통'),
        ('low', '일반'),
    ]

    instruction_id = models.AutoField(
        primary_key=True,
        verbose_name='주의사항 ID'
    )

    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='post_care_instructions',
        verbose_name='검사',
        to_field='exam_id',
        db_column="exam_id"
    )

    type = models.CharField(
        max_length=50,
        choices=INSTRUCTION_TYPE_CHOICES,
        default='general',
        verbose_name='주의사항 타입',
        help_text='예: 약물 복용, 식이 주의사항, 활동 제한 등'
    )

    title = models.CharField(
        max_length=200,
        verbose_name='주의사항 제목',
        help_text='예: 처방 약물 복용법, 검사 후 수분 섭취'
    )

    description = models.TextField(
        verbose_name='상세 설명'
    )

    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name='우선순위',
        help_text='환자에게 강조해야 할 중요도'
    )

    duration_hours = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='주의 기간 (시간)',
        help_text='주의사항을 지켜야 하는 시간 (예: 24시간, 48시간). null이면 기간 제한 없음'
    )

    icon = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='아이콘',
        help_text='주의사항을 나타내는 아이콘 (예: 💊, 🚫, ⚠️)'
    )

    is_critical = models.BooleanField(
        default=False,
        verbose_name='응급 주의사항',
        help_text='응급실 방문이 필요할 수 있는 중요한 주의사항인지 여부'
    )

    class Meta:
        db_table = 'exam_post_care_instructions'
        verbose_name = '검사 후 주의사항'
        verbose_name_plural = '검사 후 주의사항 목록'
        ordering = ['exam', '-priority', 'title']
        indexes = [
            models.Index(fields=['exam', 'priority']),
            models.Index(fields=['exam', 'type']),
            models.Index(fields=['is_critical']),
        ]

    def __str__(self):
        priority_display = self.get_priority_display()
        return f"{self.exam.title} - {self.get_type_display()} - {self.title} ({priority_display})"


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
