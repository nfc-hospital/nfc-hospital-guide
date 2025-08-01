# p_queue/views.py - 기존 코드에 추가
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Queue
import uuid

@api_view(['POST'])
def test_queue_update(request):
    """대기열 상태 업데이트 테스트 API"""
    try:
        queue_id = request.data.get('queue_id')
        new_state = request.data.get('state', 'waiting')
        
        if queue_id:
            # 특정 Queue 업데이트
            queue = Queue.objects.get(queue_id=queue_id)
        else:
            # 첫 번째 Queue 업데이트
            queue = Queue.objects.first()
            
        if not queue:
            return Response({'error': '대기열을 찾을 수 없습니다.'}, status=404)
            
        queue.state = new_state
        if new_state == 'called':
            from django.utils import timezone
            queue.called_at = timezone.now()
            
        queue.save()  # 이때 signal이 발동되어 WebSocket 알림 전송
        
        return Response({
            'success': True,
            'message': f'대기열 {queue.queue_number}번 상태를 {new_state}로 변경했습니다.',
            'queue_id': str(queue.queue_id),
            'state': queue.state
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)