from rest_framework import serializers
from .models import Queue, PatientState, StateTransition
from appointments.models import Exam
from appointments.serializers import ExamSerializer

class QueueSerializer(serializers.ModelSerializer):
    """
    대기열 모델을 위한 시리얼라이저
    """
    class Meta:
        model = Queue
        fields = '__all__' 

class MyPositionSerializer(serializers.Serializer):
    """
    내 대기 상태 조회를 위한 커스텀 시리얼라이저
    """
    currentPosition = serializers.IntegerField(source='queue_number', help_text='현재 순번')
    estimatedTime = serializers.IntegerField(source='estimated_wait_time', help_text='예상 대기 시간 (분 단위)')
    status = serializers.CharField(source='state', help_text='현재 상태')
    aheadCount = serializers.IntegerField(help_text='앞선 대기자 수')

class QueueStatusUpdateSerializer(serializers.Serializer):
    """
    대기열 상태 변경을 위한 시리얼라이저
    """
    state = serializers.ChoiceField(
        choices=Queue.STATE_CHOICES,
        help_text='변경할 대기열 상태'
    )
    reason = serializers.CharField(
        max_length=200,
        required=False,
        help_text='상태 변경 사유 (선택)'
    )

    def validate(self, data):
        # 상태 전환 규칙을 검증하는 로직
        current_state = self.instance.state
        new_state = data.get('state')

        # 유효한 상태 전환인지 확인하는 로직 추가
        if not self.is_valid_transition(current_state, new_state):
            raise serializers.ValidationError(f"'{current_state}'에서 '{new_state}'로의 상태 전환은 허용되지 않습니다.")

        return data

    def is_valid_transition(self, current_state, new_state):
        # 상태 전환 규칙 구현
        rules = {
            'waiting': ['called', 'cancelled'],
            'called': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled'],
            # 'done'은 'completed'와 동일하게 처리
            'completed': [], # 완료 후에는 상태 변경 불가
            'cancelled': [], # 취소 후에는 상태 변경 불가
        }

        if new_state == 'cancelled':
            # 모든 상태에서 'cancelled'로 전환 가능
            return True

        return new_state in rules.get(current_state, [])

# PatientState 관련 시리얼라이저 추가
class PatientStateSerializer(serializers.ModelSerializer):
    """
    환자 상태 시리얼라이저
    """
    # current_exam을 중첩된 객체로 표현
    current_exam_detail = ExamSerializer(source='current_exam', read_only=True)
    
    # current_exam_id를 직접 받을 수 있도록 추가
    current_exam_id = serializers.CharField(
        write_only=True, 
        required=False, 
        allow_null=True,
        help_text='검사 ID (exam_id)'
    )
    
    # 읽기 전용 필드들
    exam_id = serializers.CharField(source='current_exam.exam_id', read_only=True)
    exam_name = serializers.CharField(source='current_exam.title', read_only=True)
    exam_department = serializers.CharField(source='current_exam.department', read_only=True)
    
    class Meta:
        model = PatientState
        fields = [
            'state_id', 'user', 'current_state', 'current_location',
            'current_exam', 'current_exam_detail', 'current_exam_id',
            'exam_id', 'exam_name', 'exam_department',
            'emr_patient_id', 'emr_raw_status', 'emr_department',
            'emr_appointment_time', 'emr_latest_update',
            'is_logged_in', 'login_method',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['state_id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # current_exam_id로 Exam 객체 찾기
        exam_id = validated_data.pop('current_exam_id', None)
        if exam_id:
            try:
                validated_data['current_exam'] = Exam.objects.get(exam_id=exam_id)
            except Exam.DoesNotExist:
                raise serializers.ValidationError(f"Exam with id {exam_id} does not exist")
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # current_exam_id로 Exam 객체 찾기
        exam_id = validated_data.pop('current_exam_id', None)
        if exam_id:
            try:
                validated_data['current_exam'] = Exam.objects.get(exam_id=exam_id)
            except Exam.DoesNotExist:
                raise serializers.ValidationError(f"Exam with id {exam_id} does not exist")
        
        return super().update(instance, validated_data)


class StateTransitionSerializer(serializers.ModelSerializer):
    """
    상태 전환 히스토리 시리얼라이저
    """
    user_name = serializers.CharField(source='user.name', read_only=True)
    
    class Meta:
        model = StateTransition
        fields = '__all__'
        read_only_fields = ['transition_id', 'created_at']
