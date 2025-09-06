# p_queue/signals.py
import json
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Queue, QueueStatusLog, PatientState
from .services import PatientJourneyService
from django.db.models import Count, Q, Avg
import logging

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()

@receiver(post_save, sender=Queue)
def sync_queue_to_patient_state(sender, instance, created, **kwargs):
    """Queue 변경 시 PatientState 동기화"""
    if created:
        return  # 새로 생성된 경우는 처리하지 않음
        
    # 서비스 계층 사용
    service = PatientJourneyService(user=instance.user)
    service.sync_from_queue_update(instance)
    
    # WebSocket 알림은 서비스 내부에서 처리됨
    # 관리자 대시보드 업데이트
    send_dashboard_update()

@receiver(post_save, sender=PatientState)
def sync_patient_state_to_queue(sender, instance, created, **kwargs):
    """PatientState 변경 시 Queue 동기화"""
    if created:
        return
        
    # 서비스 계층 사용
    service = PatientJourneyService(user=instance.user)
    service.sync_from_patient_state(instance)
    
    # 대시보드 업데이트
    send_dashboard_update()

def send_dashboard_update():
    """관리자 대시보드에 실시간 업데이트 전송"""
    try:
        from appointments.models import Exam
        from django.utils import timezone
        
        # PatientState 통계 계산
        patient_stats = PatientState.objects.aggregate(
            total_waiting=Count('state_id', filter=Q(current_state='WAITING')),
            total_called=Count('state_id', filter=Q(current_state='CALLED')),
            total_ongoing=Count('state_id', filter=Q(current_state='IN_PROGRESS')),
            total_completed=Count('state_id', filter=Q(current_state='COMPLETED'))
        )
        
        # Queue 평균 대기시간
        queue_stats = Queue.objects.filter(
            state='waiting'
        ).aggregate(
            avg_wait_time=Avg('estimated_wait_time')
        )
        
        # 부서별 대기열 현황 (Queue 기반)
        dept_queues = []
        for exam in Exam.objects.filter(is_active=True):
            dept_stat = Queue.objects.filter(
                exam=exam,
                state__in=['waiting', 'called']
            ).aggregate(
                waiting_count=Count('queue_id', filter=Q(state='waiting')),
                called_count=Count('queue_id', filter=Q(state='called')),
                avg_wait=Avg('estimated_wait_time')
            )
            
            dept_queues.append({
                'examId': str(exam.exam_id),
                'examName': exam.title,
                'department': exam.department,
                'waitingCount': dept_stat['waiting_count'] or 0,
                'calledCount': dept_stat['called_count'] or 0,
                'avgWaitTime': round(dept_stat['avg_wait'] or 0, 2)
            })
        
        # 대시보드 업데이트 메시지
        dashboard_data = {
            'type': 'dashboard_update',
            'data': {
                'timestamp': timezone.now().isoformat(),
                'summary': {
                    'totalWaiting': patient_stats['total_waiting'] or 0,
                    'totalCalled': patient_stats['total_called'] or 0,
                    'totalInProgress': patient_stats['total_ongoing'] or 0,
                    'totalCompleted': patient_stats['total_completed'] or 0,
                    'avgWaitTime': round(queue_stats['avg_wait_time'] or 0, 2)
                },
                'departments': dept_queues
            }
        }
        
        # 관리자 대시보드 그룹에 브로드캐스트
        async_to_sync(channel_layer.group_send)(
            'admin_dashboard',
            {
                'type': 'dashboard_update',
                'data': dashboard_data
            }
        )
        
        print(f"📊 대시보드 업데이트 전송 완료")
        
    except Exception as e:
        print(f"❌ 대시보드 업데이트 실패: {str(e)}")
        logger.error(f"대시보드 업데이트 실패: {str(e)}")

print("=== signals.py 로드됨 (Queue & PatientState 신호 활성화) ===")