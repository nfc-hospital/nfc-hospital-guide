from rest_framework import serializers
from .models import Queue, PatientState, StateTransition
from appointments.models import Exam, Appointment
from appointments.serializers import ExamSerializer, AppointmentSerializer
from authentication.serializers import UserSerializer
from django.utils import timezone
from common.state_definitions import PatientJourneyState

class QueueSerializer(serializers.ModelSerializer):
    """
    대기열 모델을 위한 시리얼라이저
    """
    # exam 정보를 중첩된 객체로 포함 (읽기 전용)
    exam = ExamSerializer(read_only=True)
    # exam_id는 생성/수정 시에만 사용
    exam_id = serializers.CharField(write_only=True, required=False, source='exam.exam_id')
    
    class Meta:
        model = Queue
        fields = '__all__'
    
    def to_representation(self, instance):
        """
        읽기 시 exam 정보를 완전히 포함
        """
        data = super().to_representation(instance)
        # exam이 Foreign Key 관계이므로 select_related로 가져왔을 때 전체 정보 포함
        if instance.exam:
            data['exam'] = ExamSerializer(instance.exam).data
        return data
    
    def create(self, validated_data):
        # exam 관련 데이터 처리
        exam_data = validated_data.pop('exam', {})
        exam_id = exam_data.get('exam_id') if exam_data else None
        
        if exam_id:
            try:
                validated_data['exam'] = Exam.objects.get(exam_id=exam_id)
            except Exam.DoesNotExist:
                raise serializers.ValidationError(f"Exam with id {exam_id} does not exist")
                
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # exam 관련 데이터 처리
        exam_data = validated_data.pop('exam', {})
        exam_id = exam_data.get('exam_id') if exam_data else None
        
        if exam_id:
            try:
                validated_data['exam'] = Exam.objects.get(exam_id=exam_id)
            except Exam.DoesNotExist:
                raise serializers.ValidationError(f"Exam with id {exam_id} does not exist")
                
        return super().update(instance, validated_data) 

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


class PatientJourneySerializer(serializers.Serializer):
    """
    챗봇 서버에 전달할 환자의 전체 여정 정보를 종합하는 Serializer
    """
    # 사용자 정보
    user = UserSerializer(read_only=True)
    userName = serializers.CharField(source='user.name', read_only=True)
    userId = serializers.CharField(source='user.user_id', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    patientId = serializers.CharField(source='user.patient_id', read_only=True)
    
    # 현재 상태 정보
    patientState = serializers.CharField(source='current_state', read_only=True)
    currentState = serializers.CharField(read_only=True)
    stateDescription = serializers.SerializerMethodField()
    currentLocation = serializers.CharField(read_only=True)
    currentLocationDisplay = serializers.SerializerMethodField()
    
    # 예약 및 대기열 정보
    appointments = serializers.SerializerMethodField()
    currentQueues = serializers.SerializerMethodField()
    waitInfo = serializers.SerializerMethodField()
    
    def get_stateDescription(self, obj):
        """현재 상태 코드에 대한 한글 설명을 반환합니다."""
        state_map = {
            'UNREGISTERED': '병원 도착 전',
            'ARRIVED': '병원 도착',
            'REGISTERED': '접수 완료', 
            'WAITING': '대기중',
            'CALLED': '호출됨',
            'IN_PROGRESS': '진료중',
            'COMPLETED': '완료',
            'PAYMENT': '수납 대기',
            'FINISHED': '모든 절차 완료',
            PatientJourneyState.UNREGISTERED.value: '병원 도착 전',
            PatientJourneyState.ARRIVED.value: '병원 도착',
            PatientJourneyState.REGISTERED.value: '접수 완료',
            PatientJourneyState.WAITING.value: '대기중',
            PatientJourneyState.CALLED.value: '호출됨',
            PatientJourneyState.IN_PROGRESS.value: '진료중',
            PatientJourneyState.COMPLETED.value: '완료',
            PatientJourneyState.PAYMENT.value: '수납 대기',
            PatientJourneyState.FINISHED.value: '모든 절차 완료'
        }
        current_state = getattr(obj, 'current_state', 'UNREGISTERED')
        return state_map.get(current_state, current_state)
    
    def get_currentLocationDisplay(self, obj):
        """현재 위치를 읽기 쉬운 형태로 반환합니다."""
        location = getattr(obj, 'current_location', None)
        if not location:
            return '위치 정보 없음'
        # 실제 구현에서는 Location 모델과 연계
        location_map = {
            'main_1f_lobby': '본관 1층 로비',
            'main_2f_lab': '본관 2층 검사실',
            'main_3f_radiology': '본관 3층 영상의학과',
        }
        return location_map.get(location, location)
    
    def get_appointments(self, obj):
        """오늘 날짜의 모든 예약 정보를 안전하게 반환합니다."""
        try:
            user = getattr(obj, 'user', None)
            if not user:
                return []
            
            today = timezone.now().date()
            today_appointments = Appointment.objects.filter(
                user=user,
                scheduled_at__date=today
            ).select_related('exam').order_by('scheduled_at')
            
            return AppointmentSerializer(today_appointments, many=True).data
        except Exception as e:
            # 오류 발생 시 빈 리스트 반환 (API 안정성 보장)
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"get_appointments 오류: {e}")
            return []
    
    def get_currentQueues(self, obj):
        """현재 사용자가 등록된 모든 대기열 정보를 안전하게 반환합니다."""
        try:
            user = getattr(obj, 'user', None)
            if not user:
                return []
            
            active_queues = Queue.objects.filter(
                user=user, 
                state__in=['waiting', 'called', 'in_progress']
            ).select_related('exam').order_by('created_at')
            
            return QueueSerializer(active_queues, many=True).data
        except Exception as e:
            # 오류 발생 시 빈 리스트 반환 (API 안정성 보장)
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"get_currentQueues 오류: {e}")
            return []
    
    def get_waitInfo(self, obj):
        """현재 대기 정보를 안전하게 요약해서 반환합니다."""
        try:
            user = getattr(obj, 'user', None)
            if not user:
                return None
            
            active_queue = Queue.objects.filter(
                user=user,
                state__in=['waiting', 'called']
            ).select_related('exam').first()
            
            if not active_queue:
                return None
            
            people_ahead = Queue.objects.filter(
                exam=active_queue.exam,
                state='waiting',
                queue_number__lt=active_queue.queue_number
            ).count()
            
            return {
                'queueNumber': active_queue.queue_number,
                'estimatedWaitTime': active_queue.estimated_wait_time,
                'peopleAhead': people_ahead,
                'examName': active_queue.exam.title if active_queue.exam else '검사',
                'examLocation': self.get_exam_location(active_queue.exam)
            }
        except Exception as e:
            # 오류 발생 시 None 반환 (대기 정보 없음으로 처리)
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"get_waitInfo 오류: {e}")
            return None
    
    def get_exam_location(self, exam):
        """검사 위치 정보를 포맷팅합니다."""
        if not exam:
            return None
        location = f"{exam.building or '본관'} {exam.floor or ''}층"
        if exam.room:
            location += f" {exam.room}"
        return location.strip()
