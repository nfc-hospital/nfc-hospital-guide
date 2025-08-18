# p_queue/consumers.py - 완전한 버전 (기존 + 신규 기능)
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from datetime import datetime

logger = logging.getLogger(__name__)
User = get_user_model()

class QueueConsumer(AsyncWebsocketConsumer):
    """
    대기열 실시간 업데이트를 위한 WebSocket Consumer
    """
    
    # p_queue/consumers.py의 connect 메서드만 수정
    async def connect(self):
        """WebSocket 연결 시 호출"""
        try:
            print("=== WebSocket 연결 시도 ===")
            
            # URL에서 queue_id 추출
            self.queue_id = self.scope['url_route']['kwargs']['queue_id']
            self.room_group_name = f'queue_{self.queue_id}'
            
            print(f"Queue ID: {self.queue_id}")
            print(f"Room Group: {self.room_group_name}")
            
            # 연결 먼저 수락
            await self.accept()
            print("WebSocket 연결 수락됨")
            
            # 그룹에 참가 (간단하게)
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            print("그룹 참가 완료")
            
            # 연결 성공 메시지 전송
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': f'대기열 {self.queue_id}에 연결되었습니다.',
                'queue_id': self.queue_id,
                'room_group_name': self.room_group_name,
                'channel_layer': str(self.channel_layer.__class__.__name__),
                'timestamp': datetime.now().isoformat(),
                'features': [
                    'real_time_updates',
                    'queue_notifications', 
                    'multi_client_support',
                    'ping_pong_test',
                    'database_integration',
                    'signal_based_updates'
                ]
            }))
            
            logger.info(f"WebSocket 연결됨: queue_id={self.queue_id}")
            print("=== WebSocket 연결 완료 ===")
            
        except Exception as e:
            print(f"=== WebSocket 연결 오류: {str(e)} ===")
            logger.error(f"WebSocket 연결 오류: {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        """WebSocket 연결 해제 시 호출"""
        try:
            print(f"=== WebSocket 연결 해제: code={close_code} ===")
            # 모든 그룹에서 나가기
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            # 관리자 그룹에서도 나가기
            if self.queue_id == 'admin':
                await self.channel_layer.group_discard(
                    'admin_dashboard',
                    self.channel_name
                )
                await self.channel_layer.group_discard(
                    'admin_logs',
                    self.channel_name
                )
                
            logger.info(f"WebSocket 연결 해제됨: queue_id={self.queue_id}, code={close_code}")
        except Exception as e:
            print(f"=== WebSocket 연결 해제 오류: {str(e)} ===")
            logger.error(f"WebSocket 연결 해제 오류: {str(e)}")

    async def receive(self, text_data):
        """클라이언트로부터 메시지 받기 - 고급 기능"""
        try:
            print(f"=== 메시지 수신: {text_data} ===")
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'unknown')
            message = text_data_json.get('message', '')
            
            logger.info(f"메시지 수신: type={message_type}, message={message}")
            
            # 메시지 타입별 처리 (확장된 기능)
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'message': 'pong',
                    'timestamp': datetime.now().isoformat(),
                    'queue_id': self.queue_id
                }))
                
            elif message_type == 'chat':
                # 그룹에 메시지 브로드캐스트
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'queue_message',
                        'message': message,
                        'sender': 'anonymous',
                        'timestamp': datetime.now().isoformat()
                    }
                )
                
            elif message_type == 'queue_status_request':
                # 대기열 상태 요청 처리 (실제 DB 데이터 조회)
                queue_data = await self.get_queue_status()
                await self.send(text_data=json.dumps({
                    'type': 'queue_status_response',
                    'queue_id': self.queue_id,
                    'data': queue_data,
                    'timestamp': datetime.now().isoformat()
                }))
                
            elif message_type == 'join_notification':
                # 새 클라이언트 참가 알림
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'client_joined',
                        'message': f'새로운 클라이언트가 대기열 {self.queue_id}에 참가했습니다.',
                        'timestamp': datetime.now().isoformat()
                    }
                )
                
            elif message_type == 'subscribe_patient':
                # 특정 환자 알림 구독
                user_id = text_data_json.get('user_id')
                if user_id:
                    await self.channel_layer.group_add(
                        f'patient_{user_id}',
                        self.channel_name
                    )
                    await self.send(text_data=json.dumps({
                        'type': 'subscription_success',
                        'message': f'환자 {user_id} 알림을 구독했습니다.',
                        'subscription_type': 'patient',
                        'target_id': user_id
                    }))
                    
            elif message_type == 'subscribe_exam':
                # 특정 검사 알림 구독
                exam_id = text_data_json.get('exam_id')
                if exam_id:
                    await self.channel_layer.group_add(
                        f'exam_{exam_id}',
                        self.channel_name
                    )
                    await self.send(text_data=json.dumps({
                        'type': 'subscription_success',
                        'message': f'검사 {exam_id} 알림을 구독했습니다.',
                        'subscription_type': 'exam',
                        'target_id': exam_id
                    }))
                
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'알 수 없는 메시지 타입: {message_type}',
                    'supported_types': [
                        'ping', 'chat', 'queue_status_request', 'join_notification',
                        'subscribe_patient', 'subscribe_exam'
                    ]
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': '잘못된 JSON 형식입니다.'
            }))
        except Exception as e:
            logger.error(f"메시지 처리 오류: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error', 
                'message': '메시지 처리 중 오류가 발생했습니다.'
            }))

    # === 기존 메서드들 ===
    async def queue_message(self, event):
        """그룹으로부터 받은 메시지를 클라이언트에 전송"""
        message = event['message']
        sender = event.get('sender', 'system')
        timestamp = event.get('timestamp', datetime.now().isoformat())
        
        await self.send(text_data=json.dumps({
            'type': 'queue_update',
            'message': message,
            'sender': sender,
            'queue_id': self.queue_id,
            'timestamp': timestamp
        }))

    async def client_joined(self, event):
        """새 클라이언트 참가 알림"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'message': event['message'],
            'timestamp': event['timestamp']
        }))

    async def queue_update(self, event):
        """대기열 상태 업데이트 메시지 전송 (기존 + 개선)"""
        await self.send(text_data=json.dumps({
            'type': 'queue_status_update',
            'data': event.get('data', event),  # data 키가 있으면 사용, 없으면 전체 event 사용
            'timestamp': datetime.now().isoformat()
        }))

    async def patient_called(self, event):
        """환자 호출 알림"""
        await self.send(text_data=json.dumps({
            'type': 'patient_call',
            'data': event,
            'timestamp': datetime.now().isoformat()
        }))

    async def queue_position_updated(self, event):
        """대기 순서 업데이트"""
        await self.send(text_data=json.dumps({
            'type': 'position_update',
            'data': event,
            'timestamp': datetime.now().isoformat()
        }))

    # === 5단계에서 추가된 새로운 메서드들 ===
    async def queue_status_update(self, event):
        """Signal에서 전송된 대기열 상태 업데이트를 클라이언트에 전송"""
        print(f"Consumer notification sent: {event['data']}")
        
        await self.send(text_data=json.dumps({
            'type': 'queue_status_update',
            'data': event['data'],
            'timestamp': datetime.now().isoformat()
        }))
        
        print("Client notification sent successfully")

    async def personal_notification(self, event):
        """개인 알림 전송 (signals.py에서 호출)"""
        await self.send(text_data=json.dumps({
            'type': 'personal_notification',
            'data': event['data'],
            'timestamp': datetime.now().isoformat()
        }))

    async def log_update(self, event):
        """로그 업데이트 알림 (signals.py에서 호출)"""
        await self.send(text_data=json.dumps({
            'type': 'log_update',
            'data': event['data'],
            'timestamp': datetime.now().isoformat()
        }))
    
    # === NFC 스캔 관련 메서드 추가 ===
    async def nfc_scan_update(self, event):
        """NFC 태그 스캔 알림 (signals.py에서 호출)"""
        await self.send(text_data=json.dumps({
            'type': 'nfc_scan',
            'data': event['message'],
            'timestamp': datetime.now().isoformat()
        }))
        logger.info(f"NFC scan notification sent to user: {event['message']['user_id']}")
    
    async def location_update(self, event):
        """환자 위치 업데이트 알림"""
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'data': event['message'],
            'timestamp': datetime.now().isoformat()
        }))
    
    async def admin_nfc_notification(self, event):
        """관리자용 NFC 알림"""
        await self.send(text_data=json.dumps({
            'type': 'admin_nfc',
            'data': event['message'],
            'timestamp': datetime.now().isoformat()
        }))
    
    async def admin_tag_notification(self, event):
        """관리자용 태그 업데이트 알림"""
        await self.send(text_data=json.dumps({
            'type': 'admin_tag_update',
            'data': event['message'],
            'timestamp': datetime.now().isoformat()
        }))

    # === 데이터베이스 연동 헬퍼 메서드들 ===
    @database_sync_to_async
    def get_queue_status(self):
        """실제 DB에서 대기열 상태 조회"""
        try:
            from .models import Queue
            
            if self.queue_id == 'admin':
                # 관리자용 전체 대기열 현황
                queues = Queue.objects.all().order_by('queue_number')
                return {
                    'total_queues': queues.count(),
                    'waiting': queues.filter(state='waiting').count(),
                    'called': queues.filter(state='called').count(),
                    'in_progress': queues.filter(state='in_progress').count(),
                    'completed': queues.filter(state='completed').count(),
                    'cancelled': queues.filter(state='cancelled').count(),
                    'recent_queues': [
                        {
                            'queue_id': str(q.queue_id),
                            'queue_number': q.queue_number,
                            'state': q.state,
                            'estimated_wait_time': q.estimated_wait_time,
                            'priority': q.priority
                        } for q in queues[:10]
                    ]
                }
            else:
                # 특정 대기열 정보
                try:
                    queue = Queue.objects.get(queue_id=self.queue_id)
                    return {
                        'queue_id': str(queue.queue_id),
                        'queue_number': queue.queue_number,
                        'state': queue.state,
                        'estimated_wait_time': queue.estimated_wait_time,
                        'priority': queue.priority,
                        'called_at': queue.called_at.isoformat() if queue.called_at else None,
                        'created_at': queue.created_at.isoformat(),
                        'updated_at': queue.updated_at.isoformat()
                    }
                except Queue.DoesNotExist:
                    return {
                        'error': f'대기열 {self.queue_id}를 찾을 수 없습니다.',
                        'queue_id': self.queue_id
                    }
                    
        except Exception as e:
            return {
                'error': f'데이터베이스 오류: {str(e)}',
                'queue_id': self.queue_id
            }

    @database_sync_to_async
    def get_user_queues(self, user_id):
        """특정 사용자의 모든 대기열 조회"""
        try:
            from .models import Queue
            queues = Queue.objects.filter(user_id=user_id).order_by('-created_at')
            return [
                {
                    'queue_id': str(q.queue_id),
                    'queue_number': q.queue_number,
                    'state': q.state,
                    'estimated_wait_time': q.estimated_wait_time,
                    'created_at': q.created_at.isoformat()
                } for q in queues
            ]
        except Exception as e:
            logger.error(f"사용자 대기열 조회 오류: {str(e)}")
            return []