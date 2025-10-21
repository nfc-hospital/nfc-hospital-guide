from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from appointments.models import Exam
import uuid
import json

User = get_user_model()

class NFCTag(models.Model):
    """
    NFC 태그 정보를 관리하는 모델
    병원 내 각 위치에 설치된 NFC 태그와 검사실 정보를 연결
    """

    ACTION_TYPE_CHOICES = [
        ('scan', '위치 스캔'),
        ('enter', '검사실 입장'),
        ('exit', '검사실 퇴장'),
        ('fail', '스캔 실패'),
    ]

    tag_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='태그 ID'
    )

    tag_uid = models.CharField(
        max_length=255,
        unique=True,
        verbose_name='NFC 태그 UID',
        help_text='NFC 하드웨어 고유 식별자(NFC 태그 하드웨어 코드)'
    )

    code = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='태그 코드',
        help_text='병원에서 정의한 태그 식별 코드 (고유 식별)'
    )

    building = models.CharField(
        max_length=100,
        verbose_name='건물명',
        help_text='예: 본관, 별관, 외래동 등'
    )

    floor = models.IntegerField(
        verbose_name='층수'
    )

    room = models.CharField(
        max_length=100,
        verbose_name='호실',
        help_text='예: 304호'
    )

    description = models.TextField(
        verbose_name='설명',
        help_text='태그 위치 상세 설명'
    )

    # 좌표 정보
    x_coord = models.FloatField(
        verbose_name='X 좌표',
        help_text='지도상의 X 좌표값',
        default=0.0
    )

    y_coord = models.FloatField(
        verbose_name='Y 좌표',
        help_text='지도상의 Y 좌표값',
        default=0.0
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태',
        help_text='태그 활성 상태'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일시'
    )

    last_scanned_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='마지막 스캔 시간'
    )

    # examId에 해당하는 필드 추가
    # 대신 연결된 검사들을 가져오는 헬퍼 메서드 구현
    def get_associated_exams(self):
        return [association.exam for association in self.exam_associations.all()]

    class Meta:
        db_table = 'nfc_tags'
        verbose_name = 'NFC 태그'
        verbose_name_plural = 'NFC 태그 목록'
        ordering = ['building', 'floor', 'room']
        indexes = [
            models.Index(fields=['tag_uid']),
            models.Index(fields=['code']),
            models.Index(fields=['building', 'floor']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.building} {self.floor}층 {self.room} - {self.code}"

    def get_location_display(self):
        """위치 정보를 읽기 쉬운 형태로 반환"""
        return f"{self.building} {self.floor}층 {self.room}"

    def get_coordinate(self):
        """좌표를 튜플로 반환"""
        return (self.x_coord, self.y_coord)

    def update_scan_time(self):
        """스캔 시간 업데이트"""
        self.last_scanned_at = timezone.now()
        self.save(update_fields=['last_scanned_at'])


class TagLog(models.Model):
    """
    NFC 태그 스캔 로그를 기록하는 모델
    환자의 이동 경로 추적 및 분석에 사용
    """

    ACTION_TYPE_CHOICES = [
        ('scan', '위치 스캔'),
        ('enter', '검사실 입장'),
        ('exit', '검사실 퇴장'),
        ('fail', '스캔 실패'),
    ]

    log_id = models.BigAutoField(
        primary_key=True,
        verbose_name='로그 ID'
    )

    tag = models.ForeignKey(
        NFCTag,
        on_delete=models.CASCADE,
        related_name='scan_logs',
        verbose_name='NFC 태그',
        to_field='tag_id',
        db_column="tag_id"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='nfc_logs',
        verbose_name='사용자',
        to_field='user_id',
        db_column='user_id'
    )

    # 스캔 정보
    action_type = models.CharField(
        max_length=10,
        choices=ACTION_TYPE_CHOICES,
        default='scan',
        verbose_name='액션 유형'
    )

    timestamp = models.DateTimeField(
        default=timezone.now,
        verbose_name='스캔 시간',
        help_text='ISO 8601 형식'
    )

    class Meta:
        db_table = 'tag_logs'
        verbose_name = 'NFC 스캔 로그'
        verbose_name_plural = 'NFC 스캔 로그 목록'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['tag', 'timestamp']),
            models.Index(fields=['action_type']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.user.name} - {self.tag.get_location_display()} ({self.get_action_type_display()})"

    @classmethod
    def get_user_movement_path(cls, user, start_time=None, end_time=None):
        """특정 사용자의 이동 경로 조회"""
        queryset = cls.objects.filter(user=user).select_related('tag')

        if start_time:
            queryset = queryset.filter(timestamp__gte=start_time)
        if end_time:
            queryset = queryset.filter(timestamp__lte=end_time)

        return queryset.order_by('timestamp')

    @classmethod
    def get_tag_usage_stats(cls, tag, period_days=7):
        """특정 태그의 사용 통계 조회"""
        from datetime import timedelta
        from django.db.models import Count

        start_date = timezone.now() - timedelta(days=period_days)

        return cls.objects.filter(
            tag=tag,
            timestamp__gte=start_date
        ).values('action_type').annotate(
            count=Count('log_id')
        ).order_by('-count')

    @classmethod
    def create_scan_log(cls, user, tag_uid, action_type='scan'):
        """스캔 로그 생성 헬퍼 메소드"""
        try:
            tag = NFCTag.objects.get(tag_uid=tag_uid, is_active=True)
            log = cls.objects.create(
                user=user,
                tag=tag,
                action_type=action_type
            )
            # 태그의 마지막 스캔 시간 업데이트
            tag.update_scan_time()
            return log
        except NFCTag.DoesNotExist:
            # 존재하지 않는 태그 스캔 시도
            return None


class NFCTagExam(models.Model):
    """
    NFC 태그와 검사실을 연결하는 중간 테이블
    특정 NFC 태그가 어떤 검사실과 연관되어 있는지 매핑
    """

    tag = models.ForeignKey(
        NFCTag,
        on_delete=models.CASCADE,
        related_name='exam_associations',
        verbose_name='NFC 태그',
        db_column="tag_id"
    )

    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='nfc_tag_associations',
        verbose_name='검사',
        to_field='exam_id', 
        db_column='exam_id',
        null=True,
        blank=True,
    )

    # 추가 정보
    exam_name = models.CharField(
        max_length=100,
        verbose_name='검사명',
        help_text='예: X-ray, CT, MRI'
    )

    exam_room = models.CharField(
        max_length=100,
        verbose_name='검사실',
        help_text='예: X-ray실 1번'
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    class Meta:
        db_table = 'nfc_tag_exams'
        verbose_name = 'NFC 태그-검사 연결'
        verbose_name_plural = 'NFC 태그-검사 연결 목록'
        unique_together = [['tag', 'exam']]
        indexes = [
            models.Index(fields=['exam']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.tag.code} - {self.exam.title}"


class FacilityRoute(models.Model):
    """
    시설 경로 및 시연용 경로 저장
    Map Editor에서 생성한 경로 데이터를 JSON으로 저장

    기존 필드와 새 필드를 모두 포함하여 하위 호환성 유지
    """

    # 새 구조 필드
    route_id = models.UUIDField(
        unique=True,  # Changed from primary_key=True to unique for safer migration
        default=uuid.uuid4,
        editable=False,
        verbose_name='경로 ID',
        db_index=True  # Add index for performance
    )

    route_name = models.CharField(
        max_length=200,
        unique=True,
        verbose_name='경로 이름',
        help_text='예: route_검사_채혈실_to_검사_MRI실, 시연_P1_도착_원무과'
    )

    # 기존 필드 유지 (하위 호환성)
    facility_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='시설명 (구 버전)',
        help_text='하위 호환성을 위해 유지. route_name 사용 권장'
    )

    nodes = models.JSONField(
        default=list,
        blank=True,
        verbose_name='노드 배열 (구 버전)',
        help_text='하위 호환성을 위해 유지. route_data 사용 권장'
    )

    edges = models.JSONField(
        default=list,
        blank=True,
        verbose_name='엣지 배열 (구 버전)',
        help_text='하위 호환성을 위해 유지. route_data 사용 권장'
    )

    map_id = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='지도 ID'
    )

    svg_element_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='SVG 요소 ID'
    )

    # 새 구조 필드
    route_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='경로 데이터',
        help_text='Map Editor에서 생성된 경로 데이터 (nodes, edges, transitions 등)'
    )

    route_type = models.CharField(
        max_length=20,
        choices=[
            ('facility', '시설 경로'),
            ('demo', '시연용 경로'),
        ],
        default='facility',
        verbose_name='경로 타입'
    )

    start_facility = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='출발 시설',
        help_text='출발 시설 이름'
    )

    end_facility = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='도착 시설',
        help_text='도착 시설 이름'
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일시'
    )

    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_routes',
        verbose_name='생성자'
    )

    class Meta:
        db_table = 'facility_routes'
        verbose_name = '시설 경로'
        verbose_name_plural = '시설 경로 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['route_name']),
            models.Index(fields=['route_type', 'is_active']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.route_name} ({self.get_route_type_display()})"

    def save(self, *args, **kwargs):
        """
        저장 시 기존 필드와 새 필드 간 동기화
        - route_name이 없으면 facility_name 사용
        - route_data가 비어있으면 nodes/edges로 채우기
        """
        # route_name이 없으면 facility_name 사용
        if not self.route_name and self.facility_name:
            self.route_name = f"route_{self.facility_name}"

        # route_data가 비어있고 nodes/edges가 있으면 변환
        if not self.route_data and (self.nodes or self.edges):
            self.route_data = {
                'nodes': self.nodes,
                'edges': self.edges,
                'map_id': self.map_id,
                'svg_element_id': self.svg_element_id
            }

        # 반대로 route_data가 있고 nodes/edges가 없으면 역변환
        if self.route_data and not self.nodes:
            self.nodes = self.route_data.get('nodes', [])
            self.edges = self.route_data.get('edges', [])

        super().save(*args, **kwargs)
