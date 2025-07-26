from rest_framework import serializers
from .models import Exam, ExamPreparation
from p_queue.models import Queue 

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
            'exam_id', 'title', 'description', 'department', 'duration',
            'is_active', 'created_at', 'updated_at', 'preparations',
            'category',
            'location'
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