from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid
import json

User = get_user_model()


class HospitalMap(models.Model):
    """
    병원 지도 정보를 관리하는 모델
    각 건물/층별 지도 데이터 저장
    """
    
    map_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='지도 ID'
    )
    
    building = models.CharField(
        max_length=100,
        verbose_name='건물명',
        help_text='예: 본관, 별관, 외래동'
    )
    
    floor = models.IntegerField(
        verbose_name='층수',
        help_text='지하는 음수로 표현 (예: -1)'
    )
    
    svg_data = models.TextField(
        verbose_name='SVG 지도 데이터',
        help_text='SVG 형식의 지도 데이터',
        blank=True
    )
    
    image_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='지도 이미지 URL',
        help_text='지도 이미지 파일 경로'
    )
    
    scale = models.FloatField(
        default=1.0,
        verbose_name='축척',
        help_text='실제 거리 대비 지도상 거리 비율'
    )
    
    width = models.IntegerField(
        default=800,
        verbose_name='지도 너비',
        help_text='픽셀 단위'
    )
    
    height = models.IntegerField(
        default=600,
        verbose_name='지도 높이',
        help_text='픽셀 단위'
    )
    
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='메타데이터',
        help_text='추가 지도 정보 (JSON)'
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
    
    class Meta:
        db_table = 'hospital_maps'
        verbose_name = '병원 지도'
        verbose_name_plural = '병원 지도 목록'
        unique_together = [['building', 'floor']]
        ordering = ['building', 'floor']
        indexes = [
            models.Index(fields=['building', 'floor']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.building} {self.floor}층"


class NavigationNode(models.Model):
    """
    경로 탐색용 노드 (지점)
    NFC 태그 위치, 검사실, 엘리베이터 등 주요 지점 표현
    """
    
    NODE_TYPE_CHOICES = [
        ('nfc_tag', 'NFC 태그 위치'),
        ('exam_room', '검사실'),
        ('elevator', '엘리베이터'),
        ('stairs', '계단'),
        ('restroom', '화장실'),
        ('junction', '교차점'),
        ('entrance', '출입구'),
        ('waiting_area', '대기 구역'),
        ('facility', '편의시설'),
    ]
    
    node_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='노드 ID'
    )
    
    map = models.ForeignKey(
        HospitalMap,
        on_delete=models.CASCADE,
        related_name='nodes',
        verbose_name='지도'
    )
    
    node_type = models.CharField(
        max_length=20,
        choices=NODE_TYPE_CHOICES,
        verbose_name='노드 타입'
    )
    
    # 위치 정보
    x_coord = models.FloatField(
        verbose_name='X 좌표',
        help_text='지도상의 X 좌표 (픽셀)'
    )
    
    y_coord = models.FloatField(
        verbose_name='Y 좌표',
        help_text='지도상의 Y 좌표 (픽셀)'
    )
    
    z_coord = models.FloatField(
        default=0,
        verbose_name='Z 좌표',
        help_text='층간 연결용 높이값'
    )
    
    # 노드 정보
    name = models.CharField(
        max_length=100,
        verbose_name='노드 이름',
        help_text='예: 3층 엘리베이터, X-ray실 입구'
    )
    
    description = models.TextField(
        blank=True,
        verbose_name='설명'
    )
    
    # 기존 모델과 연결 (OneToOne, null 허용)
    nfc_tag = models.OneToOneField(
        'nfc.NFCTag',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='navigation_node',
        verbose_name='NFC 태그'
    )
    
    exam = models.OneToOneField(
        'appointments.Exam',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='navigation_node',
        verbose_name='검사실'
    )
    
    # 접근성 정보
    is_accessible = models.BooleanField(
        default=True,
        verbose_name='휠체어 접근 가능',
        help_text='휠체어/거동불편자 접근 가능 여부'
    )
    
    has_elevator = models.BooleanField(
        default=False,
        verbose_name='엘리베이터 보유'
    )
    
    has_escalator = models.BooleanField(
        default=False,
        verbose_name='에스컬레이터 보유'
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
        db_table = 'navigation_nodes'
        verbose_name = '네비게이션 노드'
        verbose_name_plural = '네비게이션 노드 목록'
        ordering = ['map', 'name']
        indexes = [
            models.Index(fields=['map', 'node_type']),
            models.Index(fields=['x_coord', 'y_coord']),
            models.Index(fields=['node_type']),
            models.Index(fields=['is_accessible']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_node_type_display()})"
    
    def get_coordinate(self):
        """좌표를 튜플로 반환"""
        return (self.x_coord, self.y_coord, self.z_coord)


class NavigationEdge(models.Model):
    """
    노드 간 연결 (경로)
    두 노드 사이의 이동 가능한 경로 표현
    """
    
    EDGE_TYPE_CHOICES = [
        ('corridor', '복도'),
        ('elevator', '엘리베이터'),
        ('stairs', '계단'),
        ('escalator', '에스컬레이터'),
        ('outdoor', '실외 통로'),
    ]
    
    edge_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='엣지 ID'
    )
    
    from_node = models.ForeignKey(
        NavigationNode,
        on_delete=models.CASCADE,
        related_name='outgoing_edges',
        verbose_name='시작 노드'
    )
    
    to_node = models.ForeignKey(
        NavigationNode,
        on_delete=models.CASCADE,
        related_name='incoming_edges',
        verbose_name='도착 노드'
    )
    
    # 경로 정보
    distance = models.FloatField(
        verbose_name='거리',
        help_text='미터 단위'
    )
    
    walk_time = models.IntegerField(
        verbose_name='도보 시간',
        help_text='초 단위'
    )
    
    edge_type = models.CharField(
        max_length=20,
        choices=EDGE_TYPE_CHOICES,
        default='corridor',
        verbose_name='경로 타입'
    )
    
    # 접근성 정보
    is_accessible = models.BooleanField(
        default=True,
        verbose_name='휠체어 접근 가능'
    )
    
    difficulty_level = models.IntegerField(
        default=1,
        verbose_name='난이도',
        help_text='1(쉬움) ~ 5(어려움)'
    )
    
    # 혼잡도 정보
    avg_congestion = models.FloatField(
        default=0.5,
        verbose_name='평균 혼잡도',
        help_text='0(한산) ~ 1(매우 혼잡)'
    )
    
    # 양방향 여부
    is_bidirectional = models.BooleanField(
        default=True,
        verbose_name='양방향 통행 가능'
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
        db_table = 'navigation_edges'
        verbose_name = '네비게이션 엣지'
        verbose_name_plural = '네비게이션 엣지 목록'
        unique_together = [['from_node', 'to_node']]
        ordering = ['from_node', 'to_node']
        indexes = [
            models.Index(fields=['from_node']),
            models.Index(fields=['to_node']),
            models.Index(fields=['edge_type']),
            models.Index(fields=['is_accessible']),
        ]
    
    def __str__(self):
        return f"{self.from_node.name} → {self.to_node.name}"
    
    def get_reverse_edge(self):
        """역방향 엣지 조회 (양방향인 경우)"""
        if self.is_bidirectional:
            return NavigationEdge.objects.filter(
                from_node=self.to_node,
                to_node=self.from_node
            ).first()
        return None


class PatientRoute(models.Model):
    """
    환자별 경로 안내 정보
    계산된 경로와 진행 상황 추적
    """
    
    ROUTE_STATUS_CHOICES = [
        ('active', '진행중'),
        ('completed', '완료'),
        ('cancelled', '취소'),
        ('expired', '만료'),
    ]
    
    route_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='경로 ID'
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='navigation_routes',
        verbose_name='사용자'
    )
    
    # 출발지/목적지
    start_node = models.ForeignKey(
        NavigationNode,
        on_delete=models.CASCADE,
        related_name='route_starts',
        verbose_name='출발 노드'
    )
    
    end_node = models.ForeignKey(
        NavigationNode,
        on_delete=models.CASCADE,
        related_name='route_ends',
        verbose_name='도착 노드'
    )
    
    # 경로 정보
    path_nodes = models.JSONField(
        verbose_name='경로 노드 리스트',
        help_text='노드 ID 리스트 (순서대로)'
    )
    
    path_edges = models.JSONField(
        default=list,
        verbose_name='경로 엣지 리스트',
        help_text='엣지 ID 리스트 (순서대로)'
    )
    
    total_distance = models.FloatField(
        verbose_name='총 거리',
        help_text='미터 단위'
    )
    
    estimated_time = models.IntegerField(
        verbose_name='예상 소요 시간',
        help_text='초 단위'
    )
    
    # 상태 관리
    status = models.CharField(
        max_length=20,
        choices=ROUTE_STATUS_CHOICES,
        default='active',
        verbose_name='상태'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )
    
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='시작일시'
    )
    
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='완료일시'
    )
    
    # 목적지 정보 (검사실인 경우)
    target_exam = models.ForeignKey(
        'appointments.Exam',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='patient_routes',
        verbose_name='목표 검사실'
    )
    
    # 접근성 옵션
    is_accessible_route = models.BooleanField(
        default=False,
        verbose_name='접근성 경로',
        help_text='휠체어/거동불편자용 경로 여부'
    )
    
    # 추가 옵션
    avoid_stairs = models.BooleanField(
        default=False,
        verbose_name='계단 회피'
    )
    
    avoid_crowded = models.BooleanField(
        default=False,
        verbose_name='혼잡 구역 회피'
    )
    
    class Meta:
        db_table = 'patient_routes'
        verbose_name = '환자 경로'
        verbose_name_plural = '환자 경로 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.user.name} - {self.start_node.name} → {self.end_node.name}"
    
    def mark_completed(self):
        """경로 완료 처리"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])
    
    def cancel(self):
        """경로 취소"""
        self.status = 'cancelled'
        self.save(update_fields=['status'])
    
    def get_progress_percentage(self):
        """진행률 계산"""
        if not self.path_nodes:
            return 0
        
        progress = RouteProgress.objects.filter(route=self).order_by('-timestamp').first()
        if not progress:
            return 0
        
        total_nodes = len(self.path_nodes)
        current_index = progress.node_index
        return min(100, int((current_index / total_nodes) * 100))


class RouteProgress(models.Model):
    """
    경로 진행 상황 추적
    NFC 태그 스캔을 통한 실시간 위치 업데이트
    """
    
    progress_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='진행 ID'
    )
    
    route = models.ForeignKey(
        PatientRoute,
        on_delete=models.CASCADE,
        related_name='progress_logs',
        verbose_name='경로'
    )
    
    # 현재 위치
    current_node = models.ForeignKey(
        NavigationNode,
        on_delete=models.CASCADE,
        related_name='route_progresses',
        verbose_name='현재 노드'
    )
    
    node_index = models.IntegerField(
        verbose_name='노드 인덱스',
        help_text='경로 내 현재 노드 순번'
    )
    
    # NFC 태그 스캔 연결 (옵션)
    tag_log = models.ForeignKey(
        'nfc.TagLog',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='route_progresses',
        verbose_name='태그 스캔 로그'
    )
    
    # 위치 정확도
    accuracy = models.FloatField(
        default=1.0,
        verbose_name='위치 정확도',
        help_text='0~1 사이 값'
    )
    
    # 이탈 여부
    is_on_route = models.BooleanField(
        default=True,
        verbose_name='경로 이탈 여부',
        help_text='계획된 경로에서 벗어났는지 여부'
    )
    
    deviation_distance = models.FloatField(
        null=True,
        blank=True,
        verbose_name='이탈 거리',
        help_text='계획 경로에서 벗어난 거리 (미터)'
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name='기록 시간'
    )
    
    # 추가 정보
    notes = models.TextField(
        blank=True,
        verbose_name='비고'
    )
    
    class Meta:
        db_table = 'route_progress'
        verbose_name = '경로 진행 상황'
        verbose_name_plural = '경로 진행 상황 목록'
        ordering = ['route', 'timestamp']
        indexes = [
            models.Index(fields=['route', 'timestamp']),
            models.Index(fields=['current_node']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.route.user.name} - {self.current_node.name} ({self.timestamp})"
    
    def check_deviation(self):
        """경로 이탈 확인"""
        if self.node_index >= len(self.route.path_nodes):
            return False
        
        expected_node_id = self.route.path_nodes[self.node_index]
        if str(self.current_node.node_id) != expected_node_id:
            self.is_on_route = False
            # 이탈 거리 계산 로직 추가 가능
            return True
        
        self.is_on_route = True
        return False


class DepartmentZone(models.Model):
    """
    병원 내 주요 진료과 및 시설의 위치와 정보를 정의.
    비로그인 사용자를 위한 전체 구조도(Overview Map)에 사용될 데이터.
    """
    # 1. 이름 (화면에 표시될 이름)
    # 예: "내과", "원무과"
    name = models.CharField(
        max_length=100, 
        unique=True, 
        verbose_name="진료과/시설 이름",
        help_text="지도에 표시될 진료과/시설의 이름"
    )

    # 2. SVG ID (SVG 요소와 매칭될 고유 ID)
    # 예: "zone-internal-medicine", "zone-administration"
    svg_id = models.CharField(
        max_length=100, 
        unique=True, 
        verbose_name="SVG 요소 ID",
        help_text="SVG 지도 내 해당 존(Zone)의 <g> 태그 ID"
    )

    # 3. 위치 정보
    building = models.CharField(
        max_length=50, 
        default="본관", 
        verbose_name="건물명",
        help_text="건물명 (예: 본관, 암센터)"
    )
    
    floor = models.CharField(
        max_length=50, 
        default="1F", 
        verbose_name="층수",
        help_text="층수 (예: 1F, 2F)"
    )
    
    # 4. 지도 파일 경로 (어떤 지도에 그려져 있는지)
    # 예: "/images/maps/overview_main_1f.svg"
    map_url = models.CharField(
        max_length=255, 
        verbose_name="지도 파일 경로",
        help_text="해당 존이 그려진 SVG 지도의 URL"
    )

    # 5. 부가 정보 (UI 표시에 사용)
    description = models.TextField(
        blank=True, 
        verbose_name="위치 설명",
        help_text="간단한 위치 설명 (예: 본관 1층 엘리베이터 옆)"
    )
    
    icon = models.CharField(
        max_length=50, 
        blank=True, 
        verbose_name="아이콘",
        help_text="UI에 표시될 아이콘 (예: 🏥, 💊)"
    )
    
    # 6. 타입 구분 (UI에서 그룹핑할 때 사용)
    ZONE_TYPE_CHOICES = [
        ('DEPARTMENT', '진료과'),
        ('FACILITY', '편의/행정시설'),
    ]
    zone_type = models.CharField(
        max_length=20, 
        choices=ZONE_TYPE_CHOICES, 
        default='DEPARTMENT',
        verbose_name="구역 타입"
    )

    # 7. 정렬 순서
    display_order = models.IntegerField(
        default=0,
        verbose_name="표시 순서",
        help_text="낮은 숫자일수록 먼저 표시"
    )

    # 8. 활성 상태
    is_active = models.BooleanField(
        default=True,
        verbose_name="활성 상태"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="생성일시"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="수정일시"
    )

    def __str__(self):
        return f"{self.name} ({self.building} {self.floor})"

    class Meta:
        db_table = 'department_zones'
        verbose_name = "진료과/시설 존"
        verbose_name_plural = "진료과/시설 존 목록"
        ordering = ['display_order', 'name']
        indexes = [
            models.Index(fields=['zone_type', 'is_active']),
            models.Index(fields=['building', 'floor']),
            models.Index(fields=['display_order']),
        ]


# FacilityRoute 모델은 nfc/models.py로 통합되었습니다.
# hospital_navigation/admin.py에서 'from nfc.models import FacilityRoute' 사용

# Proxy 모델: hospital_navigation 앱에서 FacilityRoute를 편리하게 사용하기 위한 프록시
from nfc.models import FacilityRoute as NFCFacilityRoute


class FacilityRouteProxy(NFCFacilityRoute):
    """
    nfc.models.FacilityRoute의 Proxy 모델
    hospital_navigation 앱의 admin에서 사용하기 위한 Proxy
    실제 데이터는 nfc.models.FacilityRoute 테이블에 저장됨
    """

    class Meta:
        proxy = True
        verbose_name = '시설 경로 (MapEditor)'
        verbose_name_plural = '시설 경로 목록 (MapEditor)'
