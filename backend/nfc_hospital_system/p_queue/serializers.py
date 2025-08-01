from rest_framework import serializers
from .models import Queue

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
    