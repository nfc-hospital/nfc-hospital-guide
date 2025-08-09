"""
admin_dashboard 유틸리티 함수들
FCM 알림 발송 헬퍼 함수 포함
"""

from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)


def send_queue_update_notification(user, queue_number: int, estimated_wait: int) -> bool:
    """
    대기열 업데이트 알림 발송
    
    Args:
        user: 알림 받을 사용자
        queue_number: 현재 대기 번호
        estimated_wait: 예상 대기 시간(분)
    
    Returns:
        발송 성공 여부
    """
    from .models import Notification
    
    notification = Notification.objects.create(
        user=user,
        type='queue_update',
        title='대기 순서 안내',
        message=f'현재 대기 순번: {queue_number}번\n예상 대기시간: 약 {estimated_wait}분',
        data={
            'queue_number': queue_number,
            'estimated_wait': estimated_wait
        }
    )
    
    return notification.send()


def send_patient_call_notification(user, exam_name: str, location: str, room: Optional[str] = None) -> bool:
    """
    환자 호출 알림 발송
    
    Args:
        user: 알림 받을 사용자
        exam_name: 검사명
        location: 위치 (예: 3층 영상의학과)
        room: 검사실 번호 (선택)
    
    Returns:
        발송 성공 여부
    """
    from .models import Notification
    
    message = f'{exam_name} 검사를 위해 {location}'
    if room:
        message += f' {room}'
    message += '(으)로 와주세요.'
    
    notification = Notification.objects.create(
        user=user,
        type='patient_call',
        title='검사 호출 안내',
        message=message,
        data={
            'exam_name': exam_name,
            'location': location,
            'room': room or ''
        }
    )
    
    return notification.send()


def send_exam_ready_notification(user, exam_name: str, preparation_info: Optional[str] = None) -> bool:
    """
    검사 준비 알림 발송
    
    Args:
        user: 알림 받을 사용자
        exam_name: 검사명
        preparation_info: 준비사항 정보
    
    Returns:
        발송 성공 여부
    """
    from .models import Notification
    
    message = f'{exam_name} 검사가 곧 시작됩니다.'
    if preparation_info:
        message += f'\n\n준비사항: {preparation_info}'
    
    notification = Notification.objects.create(
        user=user,
        type='exam_ready',
        title='검사 준비 안내',
        message=message,
        data={
            'exam_name': exam_name,
            'preparation_info': preparation_info or ''
        }
    )
    
    return notification.send()


def send_exam_complete_notification(user, exam_name: str, next_steps: Optional[str] = None) -> bool:
    """
    검사 완료 알림 발송
    
    Args:
        user: 알림 받을 사용자
        exam_name: 검사명
        next_steps: 다음 단계 안내
    
    Returns:
        발송 성공 여부
    """
    from .models import Notification
    
    message = f'{exam_name} 검사가 완료되었습니다.'
    if next_steps:
        message += f'\n\n다음 안내: {next_steps}'
    
    notification = Notification.objects.create(
        user=user,
        type='exam_complete',
        title='검사 완료 안내',
        message=message,
        data={
            'exam_name': exam_name,
            'next_steps': next_steps or ''
        }
    )
    
    return notification.send()


def send_appointment_reminder(user, appointment_date: str, appointment_time: str, department: str) -> bool:
    """
    예약 리마인더 알림 발송
    
    Args:
        user: 알림 받을 사용자
        appointment_date: 예약 날짜
        appointment_time: 예약 시간
        department: 진료과
    
    Returns:
        발송 성공 여부
    """
    from .models import Notification
    
    notification = Notification.objects.create(
        user=user,
        type='appointment_reminder',
        title='진료 예약 알림',
        message=f'{appointment_date} {appointment_time}\n{department} 진료 예약이 있습니다.',
        data={
            'appointment_date': appointment_date,
            'appointment_time': appointment_time,
            'department': department
        }
    )
    
    return notification.send()


def send_emergency_notification(users: List, title: str, message: str) -> Dict[str, Any]:
    """
    긴급 알림 일괄 발송
    
    Args:
        users: 알림 받을 사용자 리스트
        title: 알림 제목
        message: 알림 내용
    
    Returns:
        발송 결과 (성공/실패 카운트)
    """
    from .models import Notification
    
    success_count = 0
    failure_count = 0
    failed_users = []
    
    for user in users:
        notification = Notification.objects.create(
            user=user,
            type='emergency',
            title=title,
            message=message,
            data={'is_emergency': True}
        )
        
        if notification.send():
            success_count += 1
        else:
            failure_count += 1
            failed_users.append(user.name)
    
    logger.info(f"긴급 알림 발송 완료 - 성공: {success_count}, 실패: {failure_count}")
    
    return {
        'total': len(users),
        'success': success_count,
        'failure': failure_count,
        'failed_users': failed_users
    }


def bulk_send_notifications(notification_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    여러 알림 일괄 발송
    
    Args:
        notification_list: 알림 정보 리스트
            [{'user': user_obj, 'type': 'queue_update', 'title': '...', 'message': '...', 'data': {...}}, ...]
    
    Returns:
        발송 결과
    """
    from .models import Notification
    
    success_count = 0
    failure_count = 0
    results = []
    
    for notif_data in notification_list:
        try:
            notification = Notification.objects.create(
                user=notif_data['user'],
                type=notif_data.get('type', 'system'),
                title=notif_data['title'],
                message=notif_data['message'],
                data=notif_data.get('data', {})
            )
            
            success = notification.send()
            
            if success:
                success_count += 1
            else:
                failure_count += 1
            
            results.append({
                'user': notif_data['user'].name,
                'success': success,
                'notification_id': str(notification.notification_id)
            })
            
        except Exception as e:
            logger.error(f"알림 생성 실패: {str(e)}")
            failure_count += 1
            results.append({
                'user': notif_data.get('user', {}).get('name', 'Unknown'),
                'success': False,
                'error': str(e)
            })
    
    return {
        'total': len(notification_list),
        'success': success_count,
        'failure': failure_count,
        'results': results
    }


def cleanup_old_notifications(days: int = 30) -> int:
    """
    오래된 읽은 알림 정리
    
    Args:
        days: 보관 기간 (일)
    
    Returns:
        삭제된 알림 개수
    """
    from django.utils import timezone
    from datetime import timedelta
    from .models import Notification
    
    cutoff_date = timezone.now() - timedelta(days=days)
    
    # 읽은 알림 중 오래된 것 삭제
    deleted_count = Notification.objects.filter(
        status='read',
        read_at__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"{days}일 이상 된 읽은 알림 {deleted_count}개 삭제")
    
    return deleted_count