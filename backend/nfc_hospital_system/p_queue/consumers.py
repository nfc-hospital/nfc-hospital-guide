# p_queue/consumers.py - 고급 기능 복구
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
            
            # 그룹에 참가
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            print("그룹 참가 완료")
            
            # 연결 성공 메시지 전송 (더 상세한 정보)
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': f'대기열 {self.queue_id}에 연결되었습니다.',
                'queue_id': self.queue_id,
                'channel_layer': str(self.channel_layer.__class__.__name__),
                'timestamp': datetime.now().isoformat(),
                'features': [
                    'real_time_updates',
                    'queue_notifications', 
                    'multi_client_support',
                    'ping_pong_test'
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
            # 그룹에서 나가기
            await self.channel_layer.group_discard(
                self.room_group_name,
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
                # 대기열 상태 요청 처리
                await self.send(text_data=json.dumps({
                    'type': 'queue_status_response',
                    'queue_id': self.queue_id,
                    'status': 'active',
                    'connected_clients': 1,  # 실제로는 그룹 멤버 수 계산 필요
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
                
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'알 수 없는 메시지 타입: {message_type}',
                    'supported_types': ['ping', 'chat', 'queue_status_request', 'join_notification']
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
        """대기열 상태 업데이트 메시지 전송"""
        await self.send(text_data=json.dumps({
            'type': 'queue_status_update',
            'data': event,
            'timestamp': datetime.now().isoformat()
        }))

    # 미래 확장을 위한 메서드들
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