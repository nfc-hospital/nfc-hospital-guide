from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
import logging

from nfc.models import TagLog
from p_queue.models import Queue

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()

@receiver(post_save, sender=TagLog)
def nfc_scan_notification(sender, instance, created, **kwargs):
    """NFC 태그 스캔 시 실시간 알림"""
    if created and channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                "nfc_monitoring",
                {
                    "type": "nfc_scan_notification",
                    "data": {
                        "tagCode": instance.tag.code,
                        "location": instance.tag.get_location_display(),
                        "user": instance.user.name if hasattr(instance.user, 'name') and instance.user.name else (instance.user.email if instance.user else "Unknown"),
                        "timestamp": instance.timestamp.isoformat(),
                        "actionType": instance.action_type
                    }
                }
            )
        except Exception as e:
            logger.error(f"Failed to send NFC scan notification: {str(e)}")

@receiver(post_save, sender=Queue)
def queue_status_notification(sender, instance, created, **kwargs):
    """대기열 상태 변경 시 실시간 알림"""
    if channel_layer:
        try:
            # 관리자 대시보드에 알림
            async_to_sync(channel_layer.group_send)(
                "admin_dashboard",
                {
                    "type": "dashboard_notification",
                    "data": {
                        "event_type": "queue_update",
                        "queue_id": str(instance.queue_id),
                        "queue_number": instance.queue_number,
                        "state": instance.state,
                        "exam_name": instance.exam.title if instance.exam else "Unknown",
                        "priority": instance.priority,
                        "created": created
                    }
                }
            )
            
            # 특정 대기열 그룹에도 알림 (기존 기능)
            async_to_sync(channel_layer.group_send)(
                f"queue_{instance.queue_id}",
                {
                    "type": "queue_message",
                    "message": {
                        "queue_id": str(instance.queue_id),
                        "state": instance.state,
                        "queue_number": instance.queue_number,
                        "estimated_wait_time": instance.estimated_wait_time,
                        "exam_name": instance.exam.title if instance.exam else "Unknown"
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to send queue notification: {str(e)}")

def send_alert_notification(alert_type, message, severity="info", data=None):
    """수동으로 알림을 전송하는 헬퍼 함수"""
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                "admin_dashboard",
                {
                    "type": "dashboard_notification",
                    "data": {
                        "event_type": "alert",
                        "alert_type": alert_type,
                        "message": message,
                        "severity": severity,
                        "timestamp": timezone.now().isoformat(),
                        "additional_data": data or {}
                    }
                }
            )
        except Exception as e:
            logger.error(f"Failed to send alert notification: {str(e)}")