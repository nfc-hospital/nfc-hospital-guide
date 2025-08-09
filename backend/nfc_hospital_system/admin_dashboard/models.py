from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()

class AdminLog(models.Model):
    """
    관리자 활동 로그를 기록하는 모델
    관리자의 모든 중요 작업을 추적하고 감사
    """

    ACTION_CHOICES = [
        ('create', '생성'),
        ('update', '수정'),
        ('delete', '삭제'),
    ]

    log_id = models.BigAutoField(
        primary_key=True,
        verbose_name='로그 ID'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='admin_logs',
        verbose_name='관리자',
        limit_choices_to={'role__in': ['super', 'dept', 'staff']},
        db_column='user_id'
    )

    action = models.CharField(
        max_length=10,
        choices=ACTION_CHOICES,
        verbose_name='수행한 작업의 유형'
    )

    target_table = models.CharField(
        max_length=100,
        verbose_name='대상 테이블명'
    )

    target_id = models.CharField(
        max_length=100,
        verbose_name='대상 레코드 ID'
    )

    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name='로그 발생 시각'
    )

    class Meta:
        db_table = 'admin_logs'
        verbose_name = '관리자 로그'
        verbose_name_plural = '관리자 로그 목록'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['target_table', 'target_id']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.user.name} - {self.get_action_display()} {self.target_table}({self.target_id})"

    @classmethod
    def log_action(cls, user, action, target_table, target_id):
        """작업 로그 생성 헬퍼 메서드"""
        return cls.objects.create(
            user=user,
            action=action,
            target_table=target_table,
            target_id=str(target_id)
        )


class Feedback(models.Model):
    """
    사용자 피드백을 관리하는 모델
    환자 및 직원의 의견 수집 및 관리
    """

    CATEGORY_CHOICES = [
        ('app', '앱 사용성'),
        ('nfc', 'NFC 태그'),
        ('queue', '대기 시스템'),
        ('service', '서비스 전반'),
        ('other', '기타'),
    ]

    RATING_CHOICES = [
        (1, '매우 불만족'),
        (2, '불만족'),
        (3, '보통'),
        (4, '만족'),
        (5, '매우 만족'),
    ]

    STATUS_CHOICES = [
        ('pending', '대기중'),
        ('reviewing', '검토중'),
        ('resolved', '해결됨'),
        ('closed', '종료됨'),
    ]

    feedback_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='피드백 ID'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='feedbacks',
        verbose_name='작성자',
        db_column='user_id'
    )

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        verbose_name='카테고리'
    )

    rating = models.IntegerField(
        choices=RATING_CHOICES,
        verbose_name='평점'
    )

    title = models.CharField(
        max_length=200,
        verbose_name='제목'
    )

    content = models.TextField(
        verbose_name='내용'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='처리 상태'
    )

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_feedbacks',
        verbose_name='담당 관리자',
        limit_choices_to={'role__in': ['super', 'dept', 'staff']},
        db_column='assigned_to_user_id'
    )

    response = models.TextField(
        blank=True,
        null=True,
        verbose_name='관리자 답변'
    )

    responded_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='답변 시간'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일시'
    )

    class Meta:
        db_table = 'feedbacks'
        verbose_name = '피드백'
        verbose_name_plural = '피드백 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['assigned_to', 'status']),
        ]

    def __str__(self):
        return f"[{self.get_category_display()}] {self.title} - {self.user.name}"

    def assign_to(self, admin_user):
        """담당자 지정"""
        self.assigned_to = admin_user
        self.status = 'reviewing'
        self.save(update_fields=['assigned_to', 'status', 'updated_at'])

        # 로그 기록
        AdminLog.log_action(
            user=admin_user,
            action='update',
            target_table='feedbacks',
            target_id=self.feedback_id
        )

    def add_response(self, admin_user, response_text):
        """관리자 답변 추가"""
        self.response = response_text
        self.responded_at = timezone.now()
        self.status = 'resolved'
        self.save(update_fields=['response', 'responded_at', 'status', 'updated_at'])

        # 로그 기록
        AdminLog.log_action(
            user=admin_user,
            action='update',
            target_table='feedbacks',
            target_id=self.feedback_id
        )

    def close(self, admin_user):
        """피드백 종료"""
        self.status = 'closed'
        self.save(update_fields=['status', 'updated_at'])

        # 로그 기록
        AdminLog.log_action(
            user=admin_user,
            action='update',
            target_table='feedbacks',
            target_id=self.feedback_id
        )

    @classmethod
    def get_pending_feedbacks(cls):
        """대기중인 피드백 조회"""
        return cls.objects.filter(status='pending').select_related('user')

    @classmethod
    def get_feedback_stats(cls, days=30):
        from datetime import timedelta
        from django.db.models import Count, Avg

        since = timezone.now() - timedelta(days=days)
        queryset = cls.objects.filter(created_at__gte=since)

        # 전체 통계 (총 개수, 평균 평점)
        overall_stats = queryset.aggregate(
            total_count=Count('feedback_id'),
            avg_rating=Avg('rating')
        )

        # 카테고리별 통계
        category_stats = queryset.values('category').annotate(
            count=Count('feedback_id')
        ).order_by('category')

        # 상태별 통계
        status_stats = queryset.values('status').annotate(
            count=Count('feedback_id')
        ).order_by('status')

        return {
            'overall': overall_stats,
            'by_category': list(category_stats),
            'by_status': list(status_stats)
        }

class NotificationSettings(models.Model):
    """
    사용자별 알림 설정 모델
    알림 유형별 on/off, 방해금지 시간 관리
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_settings',
        primary_key=True,
        verbose_name='사용자',
        db_column='user_id'
    )
    
    # 알림 유형별 설정
    queue_update = models.BooleanField(
        default=True,
        verbose_name='대기열 업데이트 알림'
    )
    
    patient_call = models.BooleanField(
        default=True,
        verbose_name='환자 호출 알림'
    )
    
    exam_ready = models.BooleanField(
        default=True,
        verbose_name='검사 준비 알림'
    )
    
    exam_complete = models.BooleanField(
        default=True,
        verbose_name='검사 완료 알림'
    )
    
    appointment_reminder = models.BooleanField(
        default=True,
        verbose_name='예약 알림'
    )
    
    system = models.BooleanField(
        default=True,
        verbose_name='시스템 알림'
    )
    
    emergency = models.BooleanField(
        default=True,
        verbose_name='긴급 알림 (항상 활성화 권장)'
    )
    
    # 방해금지 시간 설정
    do_not_disturb_enabled = models.BooleanField(
        default=False,
        verbose_name='방해금지 모드 활성화'
    )
    
    do_not_disturb_start = models.TimeField(
        null=True,
        blank=True,
        verbose_name='방해금지 시작 시간'
    )
    
    do_not_disturb_end = models.TimeField(
        null=True,
        blank=True,
        verbose_name='방해금지 종료 시간'
    )
    
    # 알림 소리 설정
    notification_sound = models.CharField(
        max_length=20,
        default='default',
        verbose_name='알림 소리',
        choices=[
            ('default', '기본음'),
            ('vibrate', '진동만'),
            ('silent', '무음'),
        ]
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일시'
    )
    
    class Meta:
        db_table = 'notification_settings'
        verbose_name = '알림 설정'
        verbose_name_plural = '알림 설정 목록'
    
    def __str__(self):
        return f"{self.user.name}의 알림 설정"
    
    def is_notification_allowed(self, notification_type: str) -> bool:
        """특정 알림 타입이 허용되는지 확인"""
        # 긴급 알림은 항상 허용
        if notification_type == 'emergency':
            return True
        
        # 방해금지 시간 확인
        if self.do_not_disturb_enabled and self.do_not_disturb_start and self.do_not_disturb_end:
            from datetime import datetime
            now = datetime.now().time()
            
            # 방해금지 시간이 자정을 넘는 경우 처리
            if self.do_not_disturb_start > self.do_not_disturb_end:
                if now >= self.do_not_disturb_start or now <= self.do_not_disturb_end:
                    return False
            else:
                if self.do_not_disturb_start <= now <= self.do_not_disturb_end:
                    return False
        
        # 알림 타입별 설정 확인
        notification_settings = {
            'queue_update': self.queue_update,
            'patient_call': self.patient_call,
            'exam_ready': self.exam_ready,
            'exam_complete': self.exam_complete,
            'appointment_reminder': self.appointment_reminder,
            'system': self.system,
            'emergency': self.emergency,
        }
        
        return notification_settings.get(notification_type, True)


class Notification(models.Model):
    """
    시스템 알림을 관리하는 모델
    푸시 알림 및 앱 내 알림 관리
    """

    TYPE_CHOICES = [
        ('queue_update', '대기열 업데이트'),
        ('patient_call', '환자 호출'),
        ('exam_ready', '검사 준비'),
        ('exam_complete', '검사 완료'),
        ('appointment_reminder', '예약 알림'),
        ('system', '시스템 알림'),
        ('emergency', '긴급 알림'),
    ]

    STATUS_CHOICES = [
        ('pending', '대기중'),
        ('sent', '발송완료'),
        ('failed', '발송실패'),
        ('read', '읽음'),
    ]

    notification_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='알림 ID'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='수신자',
        db_column='user_id'
    )

    type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        verbose_name='알림 유형'
    )

    title = models.CharField(
        max_length=100,
        verbose_name='알림 제목'
    )

    message = models.TextField(
        verbose_name='알림 내용'
    )

    data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='추가 데이터',
        help_text='알림과 관련된 추가 정보 (예: queue_id, appointment_id)'
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='발송 상태'
    )

    fcm_response = models.JSONField(
        null=True,
        blank=True,
        verbose_name='FCM 응답'
    )

    device_token = models.ForeignKey(
        'authentication.DeviceToken',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name='디바이스 토큰'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='발송일시'
    )

    read_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='읽은 시간'
    )

    class Meta:
        db_table = 'notifications'
        verbose_name = '알림'
        verbose_name_plural = '알림 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['type', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.name} - {self.title} ({self.get_status_display()})"

    def send(self):
        """알림 발송 처리"""
        from .fcm_service import fcm_service
        import logging
        
        logger = logging.getLogger(__name__)

        # 디바이스 토큰 확인
        if not self.device_token or not self.device_token.fcm_token:
            # 사용자의 모든 활성 디바이스 토큰 조회
            active_tokens = self.user.device_tokens.filter(
                is_active=True,
                fcm_token__isnull=False
            ).exclude(fcm_token='')
            
            if not active_tokens.exists():
                logger.warning(f"사용자 {self.user.name}의 FCM 토큰이 없습니다.")
                self.status = 'failed'
                self.fcm_response = {'error': 'no_fcm_token', 'message': 'FCM 토큰이 없습니다.'}
                self.save(update_fields=['status', 'fcm_response'])
                return False
            
            # 첫 번째 활성 토큰 사용
            self.device_token = active_tokens.first()
            self.save(update_fields=['device_token'])

        try:
            # FCM 발송
            fcm_token = self.device_token.fcm_token
            
            # 알림 타입별 아이콘/색상 설정
            notification_config = {
                'queue_update': {'icon': '⏰', 'color': '#4CAF50'},
                'patient_call': {'icon': '📢', 'color': '#FF5722'},
                'exam_ready': {'icon': '🏥', 'color': '#2196F3'},
                'exam_complete': {'icon': '✅', 'color': '#4CAF50'},
                'appointment_reminder': {'icon': '📅', 'color': '#FFC107'},
                'system': {'icon': 'ℹ️', 'color': '#9E9E9E'},
                'emergency': {'icon': '🚨', 'color': '#F44336'},
            }
            
            config = notification_config.get(self.type, {'icon': 'ℹ️', 'color': '#2196F3'})
            
            # 추가 데이터 준비
            data = {
                'notification_id': str(self.notification_id),
                'type': self.type,
                'icon': config['icon'],
                'color': config['color'],
                'timestamp': timezone.now().isoformat(),
            }
            
            # 기존 data 필드와 병합
            if self.data:
                data.update({k: str(v) for k, v in self.data.items()})
            
            # FCM 발송
            response = fcm_service.send_notification(
                token=fcm_token,
                title=self.title,
                body=self.message,
                data=data,
                sound='default',
                priority='high' if self.type == 'emergency' else 'normal'
            )
            
            if response['success']:
                logger.info(f"FCM 알림 발송 성공: {self.title} -> {self.user.name}")
                self.status = 'sent'
                self.sent_at = timezone.now()
                self.fcm_response = response
                self.save(update_fields=['status', 'sent_at', 'fcm_response'])
                return True
            else:
                logger.error(f"FCM 알림 발송 실패: {response.get('error_message')}")
                self.status = 'failed'
                self.fcm_response = response
                self.save(update_fields=['status', 'fcm_response'])
                
                # 토큰이 무효한 경우 비활성화
                if response.get('error') == 'unregistered_token':
                    self.device_token.is_active = False
                    self.device_token.save(update_fields=['is_active'])
                
                return False

        except Exception as e:
            logger.error(f"알림 발송 중 오류 발생: {str(e)}")
            self.status = 'failed'
            self.fcm_response = {'error': 'exception', 'message': str(e)}
            self.save(update_fields=['status', 'fcm_response'])
            return False

    def mark_as_read(self):
        """읽음 처리"""
        self.status = 'read'
        self.read_at = timezone.now()
        self.save(update_fields=['status', 'read_at'])

    @classmethod
    def create_queue_notification(cls, user, queue_data):
        """대기열 알림 생성"""
        return cls.objects.create(
            user=user,
            type='queue_update',
            title='대기 순서 변경',
            message=f"현재 대기 순번: {queue_data.get('queue_number')}번",
            data={'queue_id': str(queue_data.get('queue_id'))}
        )

    @classmethod
    def create_call_notification(cls, user, exam_name, location):
        """호출 알림 생성"""
        return cls.objects.create(
            user=user,
            type='patient_call',
            title='검사 호출',
            message=f"{exam_name} 검사를 위해 {location}로 와주세요.",
            data={'exam_name': exam_name, 'location': location}
        )

    @classmethod
    def get_unread_notifications(cls, user):
        """읽지 않은 알림 조회"""
        return cls.objects.filter(
            user=user,
            status__in=['sent', 'pending']
        ).order_by('-created_at')
