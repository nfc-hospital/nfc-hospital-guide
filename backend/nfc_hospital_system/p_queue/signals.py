# p_queue/signals.py - 다시 활성화
import json
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Queue, QueueStatusLog
import logging

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()

@receiver(post_save, sender=Queue)
def queue_post_save(sender, instance, created, **kwargs):
    """Queue 저장 후 WebSocket 알림 전송 - 간단 버전"""
    try:
        print(f"🔥 SIGNAL 발동! Queue {instance.queue_id} 상태: {instance.state}")
        
        message_data = {
            'type': 'queue_updated',
            'queue_id': str(instance.queue_id),
            'state': instance.state,
            'queue_number': instance.queue_number,
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
        
        print(f"✅ WebSocket 알림 전송 완료: {group_name}")
        logger.info(f"WebSocket 알림 전송: {instance.queue_id} → {instance.state}")
        
    except Exception as e:
        print(f"❌ WebSocket 알림 전송 실패: {str(e)}")
        logger.error(f"WebSocket 알림 전송 실패: {str(e)}")

print("=== signals.py 로드됨 (활성화 상태) ===")