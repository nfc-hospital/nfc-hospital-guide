from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import TagLog, NFCTag
from p_queue.models import PatientState
import json
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=TagLog)
def notify_nfc_scan(sender, instance, created, **kwargs):
    """
    NFC 태그 스캔 시 WebSocket으로 실시간 알림 발송
    """
    if created:
        try:
            channel_layer = get_channel_layer()
            
            # 스캔한 사용자에게 알림
            user_group = f'queue_{instance.user.user_id}'
            
            # 알림 메시지 구성
            scan_message = {
                'type': 'nfc_scan_update',
                'message': {
                    'tag_id': str(instance.tag.tag_id),
                    'tag_code': instance.tag.code,
                    'location': instance.tag.get_location_display(),
                    'building': instance.tag.building,
                    'floor': instance.tag.floor,
                    'room': instance.tag.room,
                    'x_coord': instance.tag.x_coord,
                    'y_coord': instance.tag.y_coord,
                    'action_type': instance.action_type,
                    'timestamp': instance.timestamp.isoformat(),
                    'user_id': str(instance.user.user_id),
                    'user_name': instance.user.name
                }
            }
            
            # 사용자에게 알림 전송
            async_to_sync(channel_layer.group_send)(
                user_group,
                scan_message
            )
            
            # 관리자 대시보드에도 알림 전송
            admin_message = {
                'type': 'admin_nfc_notification',
                'message': {
                    **scan_message['message'],
                    'notification_type': 'nfc_scan',
                    'priority': 'low'
                }
            }
            
            async_to_sync(channel_layer.group_send)(
                'admin_dashboard',
                admin_message
            )
            
            logger.info(f"NFC scan notification sent - User: {instance.user.user_id}, Tag: {instance.tag.code}")
            
        except Exception as e:
            logger.error(f"Failed to send NFC scan notification: {str(e)}")


@receiver(post_save, sender=NFCTag)
def notify_tag_update(sender, instance, created, **kwargs):
    """
    NFC 태그가 생성되거나 업데이트될 때 관리자에게 알림
    """
    try:
        channel_layer = get_channel_layer()
        
        action = 'created' if created else 'updated'
        
        admin_message = {
            'type': 'admin_tag_notification',
            'message': {
                'action': action,
                'tag_id': str(instance.tag_id),
                'tag_code': instance.code,
                'location': instance.get_location_display(),
                'is_active': instance.is_active,
                'timestamp': instance.updated_at.isoformat()
            }
        }
        
        # 관리자 대시보드 그룹에 전송
        async_to_sync(channel_layer.group_send)(
            'admin_dashboard',
            admin_message
        )
        
        logger.info(f"NFC tag {action} notification sent - Tag: {instance.code}")
        
    except Exception as e:
        logger.error(f"Failed to send tag update notification: {str(e)}")


@receiver(post_save, sender=PatientState)
def notify_patient_location_update(sender, instance, created, **kwargs):
    """
    환자 위치가 NFC 스캔으로 업데이트될 때 알림
    """
    # current_location이 변경된 경우만 처리
    if not created and instance.current_location:
        try:
            channel_layer = get_channel_layer()
            
            # 환자에게 위치 업데이트 알림
            patient_message = {
                'type': 'location_update',
                'message': {
                    'current_state': instance.current_state,
                    'current_location': instance.current_location,
                    'current_exam': instance.current_exam,
                    'timestamp': instance.updated_at.isoformat()
                }
            }
            
            async_to_sync(channel_layer.group_send)(
                f'queue_{instance.user.user_id}',
                patient_message
            )
            
            logger.info(f"Patient location update sent - User: {instance.user.user_id}")
            
        except Exception as e:
            logger.error(f"Failed to send location update: {str(e)}")