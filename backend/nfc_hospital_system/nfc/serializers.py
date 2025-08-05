from rest_framework import serializers
from .models import NFCTag, TagLog, NFCTagExam
from django.contrib.auth import get_user_model
from django.utils import timezone
from appointments.serializers import ExamSerializer

User = get_user_model()

class NFCTagSerializer(serializers.ModelSerializer):
    """
    NFC 태그 기본 직렬화
    """
    location = serializers.SerializerMethodField()
    coordinates = serializers.SerializerMethodField()
    object = serializers.SerializerMethodField()
    
    class Meta:
        model = NFCTag
        fields = [
            'object', 'tag_id', 'tag_uid', 'code', 'location', 
            'coordinates', 'is_active', 'created_at', 'updated_at', 'last_scanned_at'
        ]
        read_only_fields = ['tag_id', 'created_at', 'updated_at', 'last_scanned_at']
    
    def get_object(self, obj):
        return "nfc_tag"
    
    def get_location(self, obj):
        return {
            "building": obj.building,
            "floor": obj.floor,
            "room": obj.room,
            "description": obj.description
        }
    
    def get_coordinates(self, obj):
        return {
            "x": obj.x_coord,
            "y": obj.y_coord
        }

class NFCTagDetailSerializer(NFCTagSerializer):
    """
    NFC 태그 상세 정보 (검사 정보 포함)
    """
    exam_associations = serializers.SerializerMethodField()
    scan_count_today = serializers.SerializerMethodField()
    
    class Meta(NFCTagSerializer.Meta):
        fields = NFCTagSerializer.Meta.fields + ['exam_associations', 'scan_count_today']
    
    def get_exam_associations(self, obj):
        active_exams = obj.exam_associations.filter(is_active=True)
        return [{
            'exam_id': exam.exam.exam_id,
            'exam_name': exam.exam_name,
            'exam_room': exam.exam_room
        } for exam in active_exams]
    
    def get_scan_count_today(self, obj):
        from datetime import datetime, timedelta
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        return obj.scan_logs.filter(timestamp__gte=today_start).count()

class NFCScanRequestSerializer(serializers.Serializer):
    """
    NFC 스캔 요청 직렬화
    """
    tag_id = serializers.CharField(max_length=255, help_text="NFC 태그 ID 또는 UID")
    timestamp = serializers.DateTimeField(
        default=timezone.now, 
        help_text="스캔 시간 (ISO 8601 형식)"
    )
    action_type = serializers.ChoiceField(
        choices=TagLog.ACTION_TYPE_CHOICES,
        default='scan',
        help_text="스캔 액션 유형"
    )

class NFCScanResponseSerializer(serializers.Serializer):
    """
    NFC 스캔 응답 직렬화
    """
    tag_info = NFCTagDetailSerializer()
    location_guide = serializers.SerializerMethodField()
    next_steps = serializers.SerializerMethodField()
    waiting_info = serializers.SerializerMethodField()
    
    def get_location_guide(self, obj):
        tag = obj['tag_info']
        return {
            "current_location": f"{tag.building} {tag.floor}층 {tag.room}",
            "description": tag.description,
            "nearby_facilities": self._get_nearby_facilities(tag)
        }
    
    def get_next_steps(self, obj):
        # 연관된 검사가 있는 경우 안내 정보 제공
        tag = obj['tag_info']
        exams = tag.exam_associations.filter(is_active=True)
        if exams.exists():
            exam_mapping = exams.first()
            return {
                "exam_id": exam_mapping.exam.exam_id,
                "exam_name": exam_mapping.exam_name,
                "exam_room": exam_mapping.exam_room,
                "instructions": f"{exam_mapping.exam_name} 검사를 위해 {exam_mapping.exam_room}로 이동해주세요",
                "estimated_time": "10-15분"
            }
        return {}
    
    def get_waiting_info(self, obj):
        # 실제 대기열 정보는 p_queue 앱에서 가져와야 함
        return {
            "has_queue": False,
            "position": 0,
            "estimated_wait": "정보 없음"
        }
    
    def _get_nearby_facilities(self, tag):
        # 간단한 더미 데이터, 실제로는 DB에서 조회
        return ["화장실", "엘리베이터", "안내데스크"]

class TagLogSerializer(serializers.ModelSerializer):
    """
    NFC 스캔 로그 직렬화
    """
    user_name = serializers.CharField(source='user.name', read_only=True)
    tag_location = serializers.CharField(source='tag.get_location_display', read_only=True)
    
    class Meta:
        model = TagLog
        fields = [
            'log_id', 'user_name', 'tag_location', 'action_type', 'timestamp'
        ]
        read_only_fields = ['log_id', 'timestamp']

# NFCTagExam 관련 Serializers

class NFCTagExamDetailSerializer(serializers.ModelSerializer):
    """
    NFC 태그-검사 연결 직렬화
    """
    tag = NFCTagSerializer(read_only=True) 
    exam = ExamSerializer(read_only=True)   
    
    class Meta:
        model = NFCTagExam
        fields = [
            'id', 'tag', 'exam', 'exam_name', 
            'exam_room', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class NFCTagExamMappingRequestSerializer(serializers.Serializer):
    """
    태그-검사 매핑 요청 직렬화
    """
    tag_id = serializers.UUIDField(help_text="매핑할 NFC 태그의 ID")
    exam_id = serializers.CharField(max_length=50, help_text="매핑할 검사의 ID (Exam 모델의 exam_id)")
    exam_name = serializers.CharField(max_length=100, help_text="매핑 시점의 검사명")
    exam_room = serializers.CharField(max_length=100, help_text="매핑 시점의 검사실")
    is_active = serializers.BooleanField(default=True)

    def validate(self, data):
        # 실제 NFCTag 객체 존재 여부 검증
        try:
            tag = NFCTag.objects.get(tag_id=data['tag_id'], is_active=True)
        except NFCTag.DoesNotExist:
            raise serializers.ValidationError({"tag_id": "존재하지 않거나 비활성화된 태그입니다."})

        from appointments.models import Exam 
        try:
            exam = Exam.objects.get(exam_id=data['exam_id'])
        except Exam.DoesNotExist:
            raise serializers.ValidationError({"exam_id": "해당 검사 ID를 가진 검사를 찾을 수 없습니다."})

        # 이미 동일한 태그-검사 매핑이 있는지 확인 (unique_together를 따름)
        if NFCTagExam.objects.filter(tag=tag, exam=exam).exists():
            raise serializers.ValidationError("해당 태그와 검사는 이미 매핑되어 있습니다.")

        data['tag'] = tag
        data['exam'] = exam
        return data

    def create(self, validated_data):
        # NFCTagExam 인스턴스 생성
        return NFCTagExam.objects.create(
            tag=validated_data['tag'],
            exam=validated_data['exam'], # ForeignKey 필드에 Exam 객체 할당
            exam_name=validated_data.get('exam_name'),
            exam_room=validated_data.get('exam_room'),
            is_active=validated_data.get('is_active', True)
        )


# 관리자용 시리얼라이저들
class AdminNFCTagCreateSerializer(serializers.ModelSerializer):
    """
    관리자용 NFC 태그 생성 직렬화
    """
    x_coord = serializers.FloatField(required=False, default=0.0)
    y_coord = serializers.FloatField(required=False, default=0.0)
    
    class Meta:
        model = NFCTag
        fields = [
            'tag_uid', 'code', 'building', 'floor', 'room', 
            'description', 'x_coord', 'y_coord', 'is_active'
        ]
    
    def validate_tag_uid(self, value):
        if NFCTag.objects.filter(tag_uid=value).exists():
            raise serializers.ValidationError("이미 등록된 NFC 태그 UID입니다.")
        return value
    
    def validate_code(self, value):
        if NFCTag.objects.filter(code=value).exists():
            raise serializers.ValidationError("이미 사용 중인 태그 코드입니다.")
        return value

class AdminNFCTagUpdateSerializer(serializers.ModelSerializer):
    """
    관리자용 NFC 태그 수정 직렬화
    """
    class Meta:
        model = NFCTag
        fields = [
            'code', 'building', 'floor', 'room', 
            'description', 'x_coord', 'y_coord', 'is_active'
        ]
    
    def validate_code(self, value):
        # 현재 인스턴스가 아닌 다른 태그에서 같은 코드를 사용 중인지 확인
        if self.instance and NFCTag.objects.filter(code=value).exclude(tag_id=self.instance.tag_id).exists():
            raise serializers.ValidationError("이미 사용 중인 태그 코드입니다.")
        return value