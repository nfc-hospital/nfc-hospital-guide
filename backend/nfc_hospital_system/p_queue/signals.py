# p_queue/signals.py
import json
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Queue, QueueStatusLog, PatientState
from django.db.models import Count, Q, Avg
import logging

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()

@receiver(post_save, sender=Queue)
def queue_post_save(sender, instance, created, **kwargs):
    """Queue 저장 후 WebSocket 알림 전송"""
    try:
        print(f"🔥 SIGNAL 발동! Queue {instance.queue_id} 상태: {instance.state}")
        
        # 개별 큐 알림
        message_data = {
            'type': 'queue_updated',
            'queue_id': str(instance.queue_id),
            'state': instance.state,
            'queue_number': instance.queue_number,
            'exam_id': str(instance.exam.exam_id) if instance.exam else None,
            'message': f'🔔 실시간 알림: 대기열 {instance.queue_number}번이 {instance.state} 상태로 변경되었습니다!'
        }
        
        # 해당 queue_id 그룹에 브로드캐스트
        group_name = f'queue_{instance.queue_id}'
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'queue_status_update',
                'data': message_data
            }
        )
        
        # 관리자 대시보드 업데이트 알림도 전송
        send_dashboard_update()
        
        print(f"✅ WebSocket 알림 전송 완료: {group_name}")
        logger.info(f"WebSocket 알림 전송: {instance.queue_id} → {instance.state}")
        
    except Exception as e:
        print(f"❌ WebSocket 알림 전송 실패: {str(e)}")
        logger.error(f"WebSocket 알림 전송 실패: {str(e)}")

@receiver(post_save, sender=PatientState)
def patient_state_post_save(sender, instance, created, **kwargs):
    """PatientState 저장 후 WebSocket 알림 전송"""
    try:
        print(f"🏥 SIGNAL 발동! PatientState {instance.state_id} 상태: {instance.current_state}")
        
        # 대시보드 업데이트 알림 전송
        send_dashboard_update()
        
        # 개별 환자 상태 알림
        message_data = {
            'type': 'patient_state_updated',
            'state_id': str(instance.state_id),
            'user_id': str(instance.user.user_id) if hasattr(instance.user, 'user_id') else str(instance.user.id),
            'current_state': instance.current_state,
            'current_location': instance.current_location,
            'current_exam': instance.current_exam,
            'message': f'🏥 환자 상태가 {instance.current_state}로 변경되었습니다!'
        }
        
        # 환자별 그룹에 브로드캐스트
        patient_group = f'patient_{instance.user.id}'
        async_to_sync(channel_layer.group_send)(
            patient_group,
            {
                'type': 'patient_state_update',
                'data': message_data
            }
        )
        
        print(f"✅ PatientState WebSocket 알림 전송 완료")
        logger.info(f"PatientState WebSocket 알림 전송: {instance.state_id} → {instance.current_state}")
        
    except Exception as e:
        print(f"❌ PatientState WebSocket 알림 전송 실패: {str(e)}")
        logger.error(f"PatientState WebSocket 알림 전송 실패: {str(e)}")

def send_dashboard_update():
    """관리자 대시보드에 실시간 업데이트 전송"""
    try:
        from appointments.models import Exam
        from django.utils import timezone
        
        # PatientState 통계 계산
        patient_stats = PatientState.objects.aggregate(
            total_waiting=Count('state_id', filter=Q(current_state='WAITING')),
            total_called=Count('state_id', filter=Q(current_state='CALLED')),
            total_ongoing=Count('state_id', filter=Q(current_state='ONGOING')),
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