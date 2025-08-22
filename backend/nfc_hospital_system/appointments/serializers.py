from rest_framework import serializers
from django.utils import timezone
from .models import Exam, ExamPreparation, Appointment, ExamResult
from p_queue.models import Queue 
from authentication.serializers import UserSerializer # 사용자 정보를 위해 추가

# ExamPreparation 정보를 위한 Serializer
class ExamPreparationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamPreparation
        fields = ['prep_id', 'title', 'description', 'is_required', 'icon']

class ExamSerializer(serializers.ModelSerializer):
    preparations = ExamPreparationSerializer(many=True, read_only=True)
    
    # location 필드를 객체 형태로 반환하기 위해 SerializerMethodField 사용
    # 모델에는 building, floor, room이 개별 필드이지만, API 응답에서는 location 객체로 묶음
    location = serializers.SerializerMethodField()
    
    class Meta:
        model = Exam
        # 모든 필드를 포함하되, PK는 `exam_id`로 명시
        fields = [
            'exam_id', 'title', 'description', 'department', 'average_duration', 'buffer_time',
            'is_active', 'created_at', 'updated_at', 'preparations',
            'category',
            'building', 'floor', 'room',  # 개별 필드 추가
            'location'  # 통합 객체도 제공
        ]
        read_only_fields = ['created_at', 'updated_at']

    # get_location 메서드 정의: Exam 인스턴스에서 building, floor, room 정보를 가져와 딕셔너리 형태로 반환
    def get_location(self, obj):
        # building, floor, room 중 하나라도 값이 있다면 location 객체 반환
        if obj.building or obj.floor or obj.room:
            return {
                "building": obj.building if obj.building else "",
                "floor": obj.floor if obj.floor else "",
                "room": obj.room if obj.room else ""
            }
        return {}

    # 검사 생성 시 location 필드 처리: 클라이언트가 객체로 보낸 location 데이터를 파싱하여 모델의 개별 필드에 매핑
    def create(self, validated_data):
        preparations_data = validated_data.pop('preparations', [])
        
        # request.data에서 'location' 객체 데이터 추출 및 모델 필드에 매핑
        # self.context['request'].data를 사용하여 validated_data에 포함되지 않은 원본 요청 데이터 접근
        location_data = self.context['request'].data.get('location', {})
        if location_data:
            validated_data['building'] = location_data.get('building')
            validated_data['floor'] = location_data.get('floor')
            validated_data['room'] = location_data.get('room')
        
        # 중복 검사명 체크 (Exam 모델에 unique=True가 없다면 필요)
        if Exam.objects.filter(title=validated_data.get('title')).exists():
            raise serializers.ValidationError({"title": "This exam title already exists."})

        exam = Exam.objects.create(**validated_data)
        
        # ExamPreparation 인스턴스 생성
        for prep_data in preparations_data:
            ExamPreparation.objects.create(exam=exam, **prep_data)
        
        return exam

    # 검사 수정 시 location 필드 처리: 클라이언트가 객체로 보낸 location 데이터를 파싱하여 모델의 개별 필드에 업데이트
    def update(self, instance, validated_data):
        preparations_data = validated_data.pop('preparations', None)

        # request.data에서 'location' 객체 데이터 추출
        location_data = self.context['request'].data.get('location', {})
        if location_data: # location 객체가 요청에 포함되어 있다면
            # partial=True일 때 기존 값을 유지하도록 .get(key, default_value) 사용
            instance.building = location_data.get('building', instance.building)
            instance.floor = location_data.get('floor', instance.floor)
            instance.room = location_data.get('room', instance.room)
        
        # is_active 필드 변경 시 soft delete 처리 및 연관된 대기열 확인
        if 'is_active' in validated_data and not validated_data['is_active']:
            # Appointment 모델의 related_name='appointments'를 사용하여 예약 확인
            active_appointment_statuses = ['waiting', 'ongoing', 'delayed'] # 검사 진행 중으로 간주할 상태
            # related_name 'appointments'를 통해 해당 Exam에 연결된 Appointment 조회
            if instance.appointments.filter(status__in=active_appointment_statuses).exists():
                raise serializers.ValidationError({"is_active": "해당 검사와 연관된 활성 예약(Appointment)이 있어 비활성화할 수 없습니다."})

        # Exam 인스턴스 필드 업데이트
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save() # updated_at 자동 갱신

        # preparations 업데이트 로직
        # PATCH 요청에서 preparations 배열을 받을 경우, 기존 것을 삭제하고 새로 생성
        if preparations_data is not None:
            instance.preparations.all().delete() # 기존 준비사항 모두 삭제
            for prep_data in preparations_data:
                ExamPreparation.objects.create(exam=instance, **prep_data)

        return instance

    # 검사 생성 (POST) 시 중복 검사명 체크
    # Exam 모델에 unique=True가 없으므로 Serializer에서 직접 검증
    def validate_title(self, value):
        if self.instance: # 수정 시에는 자신을 제외하고 체크
            if Exam.objects.exclude(exam_id=self.instance.exam_id).filter(title=value).exists():
                raise serializers.ValidationError("This exam title already exists.")
        else: # 생성 시에는 모든 기존 검사 체크
            if Exam.objects.filter(title=value).exists():
                raise serializers.ValidationError("This exam title already exists.")
        return value
    
class AppointmentSerializer(serializers.ModelSerializer):
    # 'exam'과 'user' 필드는 ID값만 보이는 대신, 관련된 정보(객체)를 함께 보여주기 위해
    # 각자의 Serializer를 중첩하여 사용합니다. (read_only=True는 이 Serializer를 통해 User나 Exam을 수정할 수 없게 함)
    exam = ExamSerializer(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Appointment
        # API 응답에 포함될 필드들을 명시합니다.
        fields = ['appointment_id', 'user', 'exam', 'scheduled_at', 'status', 'arrival_confirmed', 'created_at']
        read_only_fields = ['appointment_id', 'created_at']


class ExamListSerializer(serializers.ModelSerializer):
    """
    환자의 검사 목록 조회용 Serializer
    필요한 최소한의 정보만 포함하여 효율성을 높입니다.
    """
    exam_info = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    has_result = serializers.SerializerMethodField()
    # UUID를 문자열로 확실하게 변환
    appointment_id = serializers.CharField(read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'appointment_id', 'exam_info', 'location', 
            'scheduled_at', 'status', 'arrival_confirmed', 
            'has_result', 'created_at'
        ]
    
    def get_exam_info(self, obj):
        """검사 기본 정보만 반환"""
        if not obj.exam:
            # exam이 없는 경우 기본값 반환
            return {
                'exam_id': None,
                'title': '검사 정보 없음',
                'department': '',
                'category': '',
                'average_duration': 30
            }
        
        return {
            'exam_id': str(obj.exam.exam_id),  # UUID를 문자열로 명시적 변환
            'title': obj.exam.title or '제목 없음',
            'department': obj.exam.department or '',
            'category': obj.exam.category or '',
            'average_duration': obj.exam.average_duration or 30
        }
    
    def get_location(self, obj):
        """검사 장소 정보"""
        if not obj.exam:
            return None
            
        if obj.exam.building or obj.exam.floor or obj.exam.room:
            return {
                'building': obj.exam.building or '',
                'floor': obj.exam.floor or '',
                'room': obj.exam.room or ''
            }
        return None
    
    def get_has_result(self, obj):
        """검사 결과 존재 여부"""
        return hasattr(obj, 'result') and obj.result is not None
    
    def to_representation(self, instance):
        """최종 출력 전 status null 처리"""
        data = super().to_representation(instance)
        # status가 None인 경우 'unregistered'로 변환
        if data.get('status') is None:
            data['status'] = 'unregistered'
        return data


class ExamResultSerializer(serializers.ModelSerializer):
    """
    검사 결과 조회용 Serializer
    """
    appointment_info = serializers.SerializerMethodField()
    exam_info = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = ExamResult
        fields = [
            'result_id', 'appointment_info', 'exam_info',
            'summary', 'doctor_notes', 'result_pdf_url',
            'is_normal', 'requires_followup',
            'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['result_id', 'created_at', 'updated_at']
    
    def get_appointment_info(self, obj):
        """예약 정보"""
        return {
            'appointment_id': obj.appointment.appointment_id,
            'scheduled_at': obj.appointment.scheduled_at,
            'status': obj.appointment.status
        }
    
    def get_exam_info(self, obj):
        """검사 정보"""
        exam = obj.appointment.exam
        return {
            'exam_id': exam.exam_id,
            'title': exam.title,
            'department': exam.department,
            'category': exam.category
        }


class TodayScheduleExamSerializer(serializers.Serializer):
    """
    당일 일정 조회용 Exam 정보 Serializer
    API 명세서의 Exam 객체 구조를 따름
    """
    exam_id = serializers.CharField()
    title = serializers.CharField()
    department = serializers.CharField()
    category = serializers.CharField(allow_null=True)
    location = serializers.SerializerMethodField()
    duration = serializers.IntegerField(source='average_duration')
    preparations = ExamPreparationSerializer(many=True, read_only=True)
    
    def get_location(self, obj):
        if obj.building or obj.floor or obj.room:
            return {
                'building': obj.building or '',
                'floor': obj.floor or '',
                'room': obj.room or ''
            }
        return None


class TodayScheduleAppointmentSerializer(serializers.Serializer):
    """
    당일 일정 조회용 Appointment Serializer
    """
    appointment_id = serializers.CharField()
    exam = TodayScheduleExamSerializer(read_only=True)
    scheduled_at = serializers.DateTimeField()
    status = serializers.CharField()
    queue_info = serializers.SerializerMethodField()
    
    def get_queue_info(self, obj):
        """현재 대기열 정보 반환"""
        # 활성 대기열 찾기
        active_queue = obj.queues.filter(
            state__in=['waiting', 'called', 'ongoing']
        ).first()
        
        if active_queue:
            return {
                'queue_id': str(active_queue.queue_id),
                'state': active_queue.state,
                'queue_number': active_queue.queue_number,
                'estimated_wait_time': active_queue.estimated_wait_time,
                'priority': active_queue.priority,
                'called_at': active_queue.called_at.isoformat() if active_queue.called_at else None
            }
        return None


class TodayScheduleSerializer(serializers.Serializer):
    """
    GET /api/v1/schedule/today 응답용 Serializer
    API 명세서 v3 구조 준수
    """
    state = serializers.CharField()
    appointments = TodayScheduleAppointmentSerializer(many=True)
    current_location = serializers.CharField(allow_null=True)
    next_action = serializers.CharField()
    timestamp = serializers.DateTimeField(default=timezone.now)
