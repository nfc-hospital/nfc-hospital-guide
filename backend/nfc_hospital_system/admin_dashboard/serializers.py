"""
Admin Dashboard API Serializers
알림 관련 API를 위한 시리얼라이저
"""

from rest_framework import serializers
from authentication.models import DeviceToken
from .models import Notification, NotificationSettings, AdminLog, Feedback


class NotificationSettingsSerializer(serializers.ModelSerializer):
    """알림 설정 시리얼라이저"""
    
    class Meta:
        model = NotificationSettings
        exclude = ['user', 'created_at', 'updated_at']
    
    def validate(self, data):
        """방해금지 시간 유효성 검사"""
        if data.get('do_not_disturb_enabled'):
            if not data.get('do_not_disturb_start') or not data.get('do_not_disturb_end'):
                raise serializers.ValidationError(
                    "방해금지 모드 활성화 시 시작 시간과 종료 시간을 모두 설정해야 합니다."
                )
        return data


class NotificationSerializer(serializers.ModelSerializer):
    """알림 시리얼라이저 (조회용)"""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    is_read = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'notification_id',
            'type',
            'type_display',
            'title',
            'message',
            'data',
            'status',
            'status_display',
            'is_read',
            'created_at',
            'sent_at',
            'read_at',
            'user_name',
        ]
    
    def get_is_read(self, obj):
        """읽음 상태 확인"""
        return obj.status == 'read'


class NotificationListSerializer(serializers.ModelSerializer):
    """알림 목록 시리얼라이저 (간소화)"""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_read = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'notification_id',
            'type',
            'type_display',
            'title',
            'message',
            'status',
            'status_display',
            'is_read',
            'created_at',
            'time_ago',
        ]
    
    def get_is_read(self, obj):
        """읽음 상태 확인"""
        return obj.status == 'read'
    
    def get_time_ago(self, obj):
        """상대 시간 표시 (예: '2시간 전')"""
        from django.utils import timezone
        from datetime import datetime, timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"{diff.days}일 전"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours}시간 전"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes}분 전"
        else:
            return "방금"


class FCMTokenRegistrationSerializer(serializers.Serializer):
    """FCM 토큰 등록 시리얼라이저"""
    
    fcm_token = serializers.CharField(
        max_length=500,
        help_text="Firebase Cloud Messaging 토큰"
    )
    
    device_uuid = serializers.CharField(
        max_length=255,
        help_text="디바이스 고유 식별자 (필수)"
    )
    
    device_type = serializers.ChoiceField(
        choices=[
            ('android', 'Android'),
            ('ios', 'iOS'),
            ('web', 'Web PWA'),
        ],
        default='web'
    )
    
    device_name = serializers.CharField(
        max_length=100,
        required=False,
        help_text="디바이스 이름 (예: Samsung Galaxy S22)"
    )
    
    device_model = serializers.CharField(
        max_length=100,
        required=False,
        help_text="디바이스 모델"
    )
    
    app_version = serializers.CharField(
        max_length=20,
        required=False,
        help_text="앱 버전"
    )
    
    def validate_fcm_token(self, value):
        """FCM 토큰 형식 검증"""
        if not value or len(value) < 10:
            raise serializers.ValidationError("유효하지 않은 FCM 토큰입니다.")
        return value
    
    def validate_device_uuid(self, value):
        """디바이스 UUID 유효성 검사"""
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("디바이스 UUID는 최소 3자 이상이어야 합니다.")
        return value.strip()
    
    def create(self, validated_data):
        """FCM 토큰 등록 처리"""
        import uuid
        request = self.context.get('request')
        user = request.user
        
        device_uuid = validated_data['device_uuid']
        fcm_token = validated_data['fcm_token']
        
        # 1. 같은 device_uuid를 가진 기존 토큰 확인 (같은 디바이스)
        existing_device = DeviceToken.objects.filter(
            device_uuid=device_uuid
        ).first()
        
        if existing_device:
            # 같은 사용자의 디바이스면 업데이트
            if existing_device.user_id == user:
                existing_device.fcm_token = fcm_token
                existing_device.device_type = validated_data.get('device_type', existing_device.device_type)
                existing_device.device_name = validated_data.get('device_name', existing_device.device_name or '')
                existing_device.device_model = validated_data.get('device_model', existing_device.device_model or '')
                existing_device.app_version = validated_data.get('app_version', existing_device.app_version or '')
                existing_device.user_agent = request.META.get('HTTP_USER_AGENT', '')
                existing_device.last_ip_address = self._get_client_ip(request)
                existing_device.is_active = True
                existing_device.save()
                return existing_device
            else:
                # 다른 사용자의 디바이스면 기존 토큰 비활성화
                existing_device.is_active = False
                existing_device.save()
        
        # 2. 같은 FCM 토큰을 가진 다른 디바이스가 있는지 확인
        existing_fcm_token = DeviceToken.objects.filter(
            fcm_token=fcm_token
        ).exclude(device_uuid=device_uuid).first()
        
        if existing_fcm_token:
            # FCM 토큰은 하나의 디바이스에만 할당되어야 하므로 기존 토큰 비활성화
            existing_fcm_token.is_active = False
            existing_fcm_token.save()
        
        # 3. 새 디바이스 토큰 생성
        try:
            device_token = DeviceToken.objects.create(
                user_id=user,
                device_uuid=device_uuid,
                fcm_token=fcm_token,
                device_type=validated_data.get('device_type', 'web'),
                device_name=validated_data.get('device_name', ''),
                device_model=validated_data.get('device_model', ''),
                app_version=validated_data.get('app_version', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                last_ip_address=self._get_client_ip(request),
                is_active=True
            )
            return device_token
            
        except Exception as e:
            # 만약 여전히 중복 오류가 발생하면 UUID를 추가하여 재시도
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"DeviceToken 생성 실패: {str(e)}")
            
            # 고유한 device_uuid 생성
            unique_device_uuid = f"{device_uuid}-{str(uuid.uuid4())[:8]}"
            
            device_token = DeviceToken.objects.create(
                user_id=user,
                device_uuid=unique_device_uuid,
                fcm_token=fcm_token,
                device_type=validated_data.get('device_type', 'web'),
                device_name=validated_data.get('device_name', ''),
                device_model=validated_data.get('device_model', ''),
                app_version=validated_data.get('app_version', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                last_ip_address=self._get_client_ip(request),
                is_active=True
            )
            return device_token
    
    def _get_client_ip(self, request):
        """클라이언트 IP 주소 추출"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class NotificationMarkAsReadSerializer(serializers.Serializer):
    """알림 읽음 처리 시리얼라이저"""
    
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="읽음 처리할 알림 ID 목록"
    )
    
    def validate_notification_ids(self, value):
        """알림 ID 유효성 검사"""
        if not value:
            raise serializers.ValidationError("최소 하나의 알림 ID가 필요합니다.")
        
        # 사용자의 알림인지 확인
        user = self.context['request'].user
        valid_notifications = Notification.objects.filter(
            notification_id__in=value,
            user=user
        ).count()
        
        if valid_notifications != len(value):
            raise serializers.ValidationError("유효하지 않은 알림 ID가 포함되어 있습니다.")
        
        return value


class NotificationStatsSerializer(serializers.Serializer):
    """알림 통계 시리얼라이저"""
    
    total_notifications = serializers.IntegerField(read_only=True)
    unread_count = serializers.IntegerField(read_only=True)
    read_count = serializers.IntegerField(read_only=True)
    failed_count = serializers.IntegerField(read_only=True)
    
    notifications_by_type = serializers.DictField(read_only=True)
    notifications_by_status = serializers.DictField(read_only=True)
    
    recent_notifications = NotificationListSerializer(many=True, read_only=True)


class DeviceTokenSerializer(serializers.ModelSerializer):
    """디바이스 토큰 시리얼라이저"""
    
    device_type_display = serializers.CharField(source='get_device_type_display', read_only=True)
    last_login_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = DeviceToken
        fields = [
            'device_id',
            'device_type',
            'device_type_display',
            'device_name',
            'device_model',
            'app_version',
            'is_active',
            'is_trusted',
            'last_login_at',
            'last_login_formatted',
            'created_at',
        ]
        read_only_fields = ['device_id', 'created_at']
    
    def get_last_login_formatted(self, obj):
        """마지막 로그인 시간 포맷팅"""
        if obj.last_login_at:
            from django.utils import timezone
            diff = timezone.now() - obj.last_login_at
            
            if diff.days > 0:
                return f"{diff.days}일 전"
            elif diff.seconds > 3600:
                hours = diff.seconds // 3600
                return f"{hours}시간 전"
            else:
                return "최근"
        return "없음"