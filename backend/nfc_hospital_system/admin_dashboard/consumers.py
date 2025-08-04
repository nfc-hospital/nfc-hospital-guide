import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

class DashboardConsumer(AsyncWebsocketConsumer):
    """
    관리자 대시보드 실시간 업데이트 WebSocket Consumer
    """
    
    async def connect(self):
        """WebSocket 연결 시 처리"""
        # room_group_name을 먼저 설정 (disconnect에서 안전하게 사용하기 위해)
        self.room_group_name = 'admin_dashboard'
        
        print(f"=== WebSocket Connect Start ===")
        print(f"User: {self.scope.get('user', 'No user')}")
        print(f"Path: {self.scope.get('path', 'No path')}")
        
        try:
            # 개발용: 모든 연결 허용
            print("Accepting WebSocket connection (development mode)")
            
            # 그룹 참여
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            print("✅ WebSocket connection accepted")
            
            # 연결 시 현재 상태 즉시 전송
            await self.send_dashboard_update()
            
            # 주기적 업데이트 시작
            self.update_task = asyncio.create_task(self.periodic_update())
            
        except Exception as e:
            print(f"❌ Error in WebSocket connect: {e}")
            import traceback
            traceback.print_exc()
            await self.close()
    
    async def disconnect(self, close_code):
        """WebSocket 연결 해제 시 처리"""
        # 주기적 업데이트 작업 취소
        if hasattr(self, 'update_task'):
            self.update_task.cancel()
        
        # 그룹에서 제거 (방어적 코드)
        if hasattr(self, 'room_group_name') and self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        
        logger.info(f"Admin dashboard WebSocket disconnected: {close_code}")
    
    async def receive(self, text_data):
        """클라이언트로부터 메시지 수신"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'request_update':
                # 즉시 업데이트 요청
                await self.send_dashboard_update()
            elif message_type == 'subscribe_metrics':
                # 특정 메트릭 구독
                metrics = text_data_json.get('metrics', [])
                await self.send_specific_metrics(metrics)
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received in dashboard WebSocket")
    
    async def send_dashboard_update(self):
        """대시보드 전체 업데이트 전송"""
        try:
            # 데이터 수집
            dashboard_data = await self.get_dashboard_data()
            
            await self.send(text_data=json.dumps({
                'type': 'dashboard_update',
                'data': dashboard_data,
                'timestamp': timezone.now().isoformat()
            }))
            
        except Exception as e:
            logger.error(f"Error sending dashboard update: {str(e)}")
    
    async def send_specific_metrics(self, metrics):
        """특정 메트릭만 전송"""
        try:
            data = {}
            
            if 'queue_stats' in metrics:
                data['queue_stats'] = await self.get_queue_stats()
            if 'nfc_stats' in metrics:
                data['nfc_stats'] = await self.get_nfc_stats()
            if 'alerts' in metrics:
                data['alerts'] = await self.get_alerts()
            
            await self.send(text_data=json.dumps({
                'type': 'metrics_update',
                'data': data,
                'timestamp': timezone.now().isoformat()
            }))
            
        except Exception as e:
            logger.error(f"Error sending specific metrics: {str(e)}")
    
    async def periodic_update(self):
        """주기적으로 대시보드 업데이트"""
        while True:
            try:
                await asyncio.sleep(30)  # 30초마다 업데이트
                await self.send_dashboard_update()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic update: {str(e)}")
                await asyncio.sleep(60)  # 오류 시 1분 대기
    
    @database_sync_to_async
    def get_dashboard_data(self):
        """대시보드에 필요한 모든 데이터 수집"""
        from p_queue.models import Queue
        from nfc.models import NFCTag, TagLog
        from appointments.models import Exam
        
        # 현재 시간 기준
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 대기열 통계
        queue_stats = Queue.objects.aggregate(
            total_waiting=Count('queue_id', filter=Q(state='waiting')),
            total_called=Count('queue_id', filter=Q(state='called')),
            total_in_progress=Count('queue_id', filter=Q(state='in_progress')),
            avg_wait_time=Avg('estimated_wait_time', filter=Q(state='waiting'))
        )
        
        # 오늘의 통계
        today_stats = Queue.objects.filter(
            created_at__gte=today_start
        ).aggregate(
            total_patients=Count('queue_id'),
            completed_today=Count('queue_id', filter=Q(state='completed')),
            cancelled_today=Count('queue_id', filter=Q(state='cancelled'))
        )
        
        # NFC 태그 통계
        nfc_stats = {
            'total_tags': NFCTag.objects.count(),
            'active_tags': NFCTag.objects.filter(is_active=True).count(),
            'total_scans_today': TagLog.objects.filter(
                timestamp__gte=today_start
            ).count()
        }
        
        # 부서별 현재 대기 상황
        dept_queues = []
        for exam in Exam.objects.filter(is_active=True):
            waiting_count = Queue.objects.filter(
                exam=exam,
                state__in=['waiting', 'called']
            ).count()
            
            if waiting_count > 0:  # 대기자가 있는 부서만
                dept_queues.append({
                    'examId': exam.exam_id,
                    'examName': exam.title,
                    'department': exam.department,
                    'waitingCount': waiting_count,
                    'avgWaitTime': Queue.objects.filter(
                        exam=exam,
                        state='waiting'
                    ).aggregate(avg=Avg('estimated_wait_time'))['avg'] or 0
                })
        
        # 최근 알림/이벤트
        recent_events = []
        
        # 최근 호출된 환자
        recent_called = Queue.objects.filter(
            state='called',
            called_at__isnull=False,
            called_at__gte=now - timedelta(minutes=30)
        ).order_by('-called_at')[:5]
        
        for q in recent_called:
            recent_events.append({
                'type': 'patient_called',
                'message': f"{q.queue_number}번 환자 호출",
                'timestamp': q.called_at.isoformat(),
                'priority': 'normal'
            })
        
        # 장시간 대기 중인 환자 알림
        long_wait_patients = Queue.objects.filter(
            state='waiting',
            estimated_wait_time__gt=60  # 1시간 이상 대기
        )
        
        for q in long_wait_patients:
            recent_events.append({
                'type': 'long_wait_alert',
                'message': f"{q.queue_number}번 환자 장시간 대기 ({q.estimated_wait_time}분)",
                'timestamp': now.isoformat(),
                'priority': 'high'
            })
        
        # 이벤트 시간순 정렬
        recent_events.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return {
            'queue_stats': queue_stats,
            'today_stats': today_stats,
            'nfc_stats': nfc_stats,
            'department_queues': dept_queues,
            'recent_events': recent_events[:10],  # 최근 10개만
            'system_status': {
                'healthy': True,
                'last_update': now.isoformat()
            }
        }
    
    @database_sync_to_async
    def get_queue_stats(self):
        """대기열 통계만 조회"""
        from p_queue.models import Queue
        
        return Queue.objects.aggregate(
            total_waiting=Count('queue_id', filter=Q(state='waiting')),
            total_called=Count('queue_id', filter=Q(state='called')),
            total_in_progress=Count('queue_id', filter=Q(state='in_progress')),
            avg_wait_time=Avg('estimated_wait_time', filter=Q(state='waiting'))
        )
    
    @database_sync_to_async
    def get_nfc_stats(self):
        """NFC 통계만 조회"""
        from nfc.models import NFCTag, TagLog
        
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        return {
            'total_tags': NFCTag.objects.count(),
            'active_tags': NFCTag.objects.filter(is_active=True).count(),
            'total_scans_today': TagLog.objects.filter(
                timestamp__gte=today_start
            ).count()
        }
    
    @database_sync_to_async
    def get_alerts(self):
        """알림 정보만 조회"""
        from p_queue.models import Queue
        
        alerts = []
        
        # 장시간 대기 알림
        long_wait = Queue.objects.filter(
            state='waiting',
            estimated_wait_time__gt=60
        ).count()
        
        if long_wait > 0:
            alerts.append({
                'type': 'long_wait',
                'count': long_wait,
                'message': f"{long_wait}명의 환자가 1시간 이상 대기 중",
                'severity': 'warning'
            })
        
        # 호출 후 미응답 알림
        no_response = Queue.objects.filter(
            state='called',
            called_at__lt=timezone.now() - timedelta(minutes=15)
        ).count()
        
        if no_response > 0:
            alerts.append({
                'type': 'no_response',
                'count': no_response,
                'message': f"{no_response}명의 환자가 호출 후 15분간 미응답",
                'severity': 'error'
            })
        
        return alerts
    
    # 그룹 메시지 핸들러
    async def dashboard_notification(self, event):
        """그룹으로부터 알림 메시지 수신"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['data'],
            'timestamp': timezone.now().isoformat()
        }))


class NFCMonitoringConsumer(AsyncWebsocketConsumer):
    """
    NFC 태그 실시간 모니터링 WebSocket Consumer
    """
    
    async def connect(self):
        """WebSocket 연결 시 처리"""
        # room_group_name을 먼저 설정 (disconnect에서 안전하게 사용하기 위해)
        self.room_group_name = 'nfc_monitoring'
        
        # 권한 확인 - 개발용으로 임시 완화
        user = self.scope["user"]
        
        # 개발용 임시: 인증 없이도 연결 허용
        if not user.is_authenticated:
            logger.warning("NFC WebSocket connection without authentication (development mode)")
            # 개발용으로 계속 진행
        else:
            try:
                # self.scope["user"]는 이미 User 인스턴스이므로 직접 사용
                if user.role not in ['super', 'dept', 'staff']:
                    logger.warning(f"Non-admin user attempting NFC monitoring access: {user.role}")
                    # 개발용으로 계속 진행
            except Exception as e:
                logger.error(f"NFC monitoring auth check failed: {str(e)}")
                # 개발용으로 계속 진행
        
        # 그룹 참여
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"NFC monitoring WebSocket connected: {user.username}")
    
    async def disconnect(self, close_code):
        """WebSocket 연결 해제 시 처리"""
        # 그룹에서 제거 (방어적 코드)
        if hasattr(self, 'room_group_name') and self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        logger.info(f"NFC monitoring WebSocket disconnected: {close_code}")
    
    async def receive(self, text_data):
        """클라이언트로부터 메시지 수신"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'request_status':
                await self.send_nfc_status()
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received in NFC monitoring WebSocket")
    
    async def send_nfc_status(self):
        """NFC 태그 상태 전송"""
        try:
            nfc_data = await self.get_nfc_data()
            
            await self.send(text_data=json.dumps({
                'type': 'nfc_status',
                'data': nfc_data,
                'timestamp': timezone.now().isoformat()
            }))
            
        except Exception as e:
            logger.error(f"Error sending NFC status: {str(e)}")
    
    @database_sync_to_async
    def get_nfc_data(self):
        """NFC 관련 데이터 수집"""
        from nfc.models import NFCTag, TagLog
        
        # 최근 스캔 로그
        recent_scans = TagLog.objects.select_related('tag', 'user').order_by('-timestamp')[:20]
        
        scan_data = []
        for log in recent_scans:
            scan_data.append({
                'tagCode': log.tag.code,
                'location': log.tag.get_location_display(),
                'user': log.user.username if log.user else 'Unknown',
                'timestamp': log.timestamp.isoformat(),
                'actionType': log.action_type
            })
        
        return {
            'recent_scans': scan_data,
            'total_scans_today': TagLog.objects.filter(
                timestamp__gte=timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            ).count()
        }
    
    # 그룹 메시지 핸들러
    async def nfc_scan_notification(self, event):
        """새로운 NFC 스캔 알림"""
        await self.send(text_data=json.dumps({
            'type': 'new_scan',
            'data': event['data'],
            'timestamp': timezone.now().isoformat()
        }))