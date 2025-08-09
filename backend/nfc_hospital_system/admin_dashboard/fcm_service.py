"""
Firebase Cloud Messaging (FCM) 서비스 모듈
푸시 알림 발송을 위한 핵심 기능 제공
"""

import logging
from typing import Dict, Any, Optional, List
from firebase_admin import messaging
from django.conf import settings

logger = logging.getLogger(__name__)


class FCMService:
    """FCM 푸시 알림 발송 서비스"""
    
    @staticmethod
    def send_notification(
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        badge: Optional[int] = None,
        sound: Optional[str] = 'default',
        priority: str = 'high'
    ) -> Dict[str, Any]:
        """
        단일 디바이스에 FCM 푸시 알림 발송
        
        Args:
            token: FCM 디바이스 토큰
            title: 알림 제목
            body: 알림 내용
            data: 추가 데이터 (딕셔너리)
            badge: iOS 뱃지 카운트
            sound: 알림 소리 (default, 없음 등)
            priority: 알림 우선순위 (high, normal)
            
        Returns:
            성공/실패 정보와 응답 데이터를 포함한 딕셔너리
        """
        try:
            # 안드로이드 설정
            android_config = messaging.AndroidConfig(
                priority=priority,
                notification=messaging.AndroidNotification(
                    icon='notification_icon',
                    color='#007AFF',
                    sound=sound,
                )
            )
            
            # iOS 설정
            apns_payload = messaging.APNSPayload(
                aps=messaging.Aps(
                    alert=messaging.ApsAlert(
                        title=title,
                        body=body,
                    ),
                    badge=badge,
                    sound=sound if sound else None,
                )
            )
            apns_config = messaging.APNSConfig(payload=apns_payload)
            
            # 웹 푸시 설정
            webpush_config = messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                    icon='/images/icons/icon-192x192.png',
                    badge='/images/icons/badge-72x72.png',
                )
            )
            
            # 메시지 생성
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data if data else {},
                token=token,
                android=android_config,
                apns=apns_config,
                webpush=webpush_config,
            )
            
            # 메시지 발송
            response = messaging.send(message)
            
            logger.info(f"FCM 알림 발송 성공: {response}")
            return {
                'success': True,
                'message_id': response,
                'error': None
            }
            
        except messaging.UnregisteredError:
            logger.warning(f"등록되지 않은 토큰: {token}")
            return {
                'success': False,
                'message_id': None,
                'error': 'unregistered_token',
                'error_message': '등록되지 않은 디바이스 토큰입니다.'
            }
            
        except messaging.SenderIdMismatchError:
            logger.error(f"Sender ID 불일치: {token}")
            return {
                'success': False,
                'message_id': None,
                'error': 'sender_id_mismatch',
                'error_message': 'FCM Sender ID가 일치하지 않습니다.'
            }
            
        except messaging.QuotaExceededError:
            logger.error("FCM 할당량 초과")
            return {
                'success': False,
                'message_id': None,
                'error': 'quota_exceeded',
                'error_message': 'FCM 할당량이 초과되었습니다.'
            }
            
        except Exception as e:
            logger.error(f"FCM 발송 오류: {str(e)}")
            return {
                'success': False,
                'message_id': None,
                'error': 'unknown_error',
                'error_message': str(e)
            }
    
    @staticmethod
    def send_multicast_notification(
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        여러 디바이스에 동시 발송 (최대 500개)
        
        Args:
            tokens: FCM 디바이스 토큰 리스트
            title: 알림 제목
            body: 알림 내용
            data: 추가 데이터
            
        Returns:
            발송 결과 정보
        """
        if not tokens:
            return {
                'success': False,
                'error': 'no_tokens',
                'error_message': '발송할 토큰이 없습니다.'
            }
        
        # 500개씩 나누어 발송 (FCM 제한)
        batch_size = 500
        total_success = 0
        total_failure = 0
        failed_tokens = []
        
        try:
            for i in range(0, len(tokens), batch_size):
                batch_tokens = tokens[i:i+batch_size]
                
                message = messaging.MulticastMessage(
                    notification=messaging.Notification(
                        title=title,
                        body=body,
                    ),
                    data=data if data else {},
                    tokens=batch_tokens,
                )
                
                response = messaging.send_multicast(message)
                
                total_success += response.success_count
                total_failure += response.failure_count
                
                # 실패한 토큰 수집
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        failed_tokens.append({
                            'token': batch_tokens[idx],
                            'error': resp.exception.code if resp.exception else 'unknown'
                        })
            
            logger.info(f"멀티캐스트 발송 완료 - 성공: {total_success}, 실패: {total_failure}")
            
            return {
                'success': True,
                'success_count': total_success,
                'failure_count': total_failure,
                'failed_tokens': failed_tokens
            }
            
        except Exception as e:
            logger.error(f"멀티캐스트 발송 오류: {str(e)}")
            return {
                'success': False,
                'error': 'multicast_error',
                'error_message': str(e)
            }
    
    @staticmethod
    def send_topic_notification(
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        토픽 구독자들에게 알림 발송
        
        Args:
            topic: 토픽 이름
            title: 알림 제목
            body: 알림 내용
            data: 추가 데이터
            
        Returns:
            발송 결과 정보
        """
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data if data else {},
                topic=topic,
            )
            
            response = messaging.send(message)
            
            logger.info(f"토픽 알림 발송 성공: {topic} - {response}")
            return {
                'success': True,
                'message_id': response,
                'topic': topic
            }
            
        except Exception as e:
            logger.error(f"토픽 알림 발송 오류: {str(e)}")
            return {
                'success': False,
                'error': 'topic_error',
                'error_message': str(e)
            }
    
    @staticmethod
    def subscribe_to_topic(tokens: List[str], topic: str) -> Dict[str, Any]:
        """
        디바이스를 토픽에 구독
        
        Args:
            tokens: FCM 토큰 리스트
            topic: 구독할 토픽 이름
            
        Returns:
            구독 결과 정보
        """
        try:
            response = messaging.subscribe_to_topic(tokens, topic)
            
            logger.info(f"토픽 구독 성공: {topic} - 성공: {response.success_count}, 실패: {response.failure_count}")
            return {
                'success': True,
                'success_count': response.success_count,
                'failure_count': response.failure_count
            }
            
        except Exception as e:
            logger.error(f"토픽 구독 오류: {str(e)}")
            return {
                'success': False,
                'error': 'subscription_error',
                'error_message': str(e)
            }
    
    @staticmethod
    def unsubscribe_from_topic(tokens: List[str], topic: str) -> Dict[str, Any]:
        """
        토픽 구독 해제
        
        Args:
            tokens: FCM 토큰 리스트
            topic: 구독 해제할 토픽 이름
            
        Returns:
            구독 해제 결과 정보
        """
        try:
            response = messaging.unsubscribe_from_topic(tokens, topic)
            
            logger.info(f"토픽 구독 해제 성공: {topic} - 성공: {response.success_count}, 실패: {response.failure_count}")
            return {
                'success': True,
                'success_count': response.success_count,
                'failure_count': response.failure_count
            }
            
        except Exception as e:
            logger.error(f"토픽 구독 해제 오류: {str(e)}")
            return {
                'success': False,
                'error': 'unsubscription_error',
                'error_message': str(e)
            }


# 싱글톤 인스턴스
fcm_service = FCMService()