"""
Admin Dashboard API Views
알림 관련 API 뷰들
"""

from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from datetime import datetime, timedelta
import json

from authentication.models import DeviceToken
from .models import Notification, NotificationSettings
from .serializers import (
    NotificationSerializer, 
    NotificationListSerializer,
    NotificationSettingsSerializer,
    FCMTokenRegistrationSerializer,
    NotificationMarkAsReadSerializer,
    NotificationStatsSerializer,
    DeviceTokenSerializer
)


class NotificationPagination(PageNumberPagination):
    """알림 페이지네이션"""
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100


class NotificationViewSet(ModelViewSet):
    """
    알림 관리 ViewSet
    사용자별 알림 이력 조회 및 읽음 처리
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationPagination
    
    def get_queryset(self):
        """사용자별 알림 조회"""
        user = self.request.user
        queryset = Notification.objects.filter(user=user)
        
        # 필터링 옵션
        notification_type = self.request.query_params.get('type', None)
        read_status = self.request.query_params.get('read_status', None)
        
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        
        if read_status == 'read':
            queryset = queryset.filter(status='read')
        elif read_status == 'unread':
            queryset = queryset.filter(status__in=['sent', 'pending'])
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """액션별 시리얼라이저 선택"""
        if self.action == 'list':
            return NotificationListSerializer
        return NotificationSerializer
    
    def list(self, request, *args, **kwargs):
        """알림 목록 조회 (GET /api/v1/notifications/history)"""
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, pk=None):
        """개별 알림 조회"""
        notification = get_object_or_404(
            Notification, 
            notification_id=pk, 
            user=request.user
        )
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        """알림 읽음 처리 (POST /api/v1/notifications/mark_as_read)"""
        serializer = NotificationMarkAsReadSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data['notification_ids']
        
        # 알림들을 읽음으로 처리
        updated_count = Notification.objects.filter(
            notification_id__in=notification_ids,
            user=request.user
        ).exclude(status='read').update(
            status='read',
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated_count}개의 알림을 읽음으로 처리했습니다.',
            'updated_count': updated_count
        })
    
    @action(detail=True, methods=['post'])
    def mark_single_as_read(self, request, pk=None):
        """단일 알림 읽음 처리 (POST /api/v1/notifications/{id}/mark_single_as_read)"""
        notification = get_object_or_404(
            Notification, 
            notification_id=pk, 
            user=request.user
        )
        
        if notification.status != 'read':
            notification.mark_as_read()
            return Response({'message': '알림을 읽음으로 처리했습니다.'})
        else:
            return Response({'message': '이미 읽은 알림입니다.'})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """알림 통계 조회 (GET /api/v1/notifications/stats)"""
        user = request.user
        
        # 기본 통계
        notifications = Notification.objects.filter(user=user)
        total_count = notifications.count()
        unread_count = notifications.filter(status__in=['sent', 'pending']).count()
        read_count = notifications.filter(status='read').count()
        failed_count = notifications.filter(status='failed').count()
        
        # 타입별 통계
        type_stats = notifications.values('type').annotate(
            count=Count('notification_id')
        ).order_by('-count')
        
        notifications_by_type = {
            item['type']: item['count'] for item in type_stats
        }
        
        # 상태별 통계
        status_stats = notifications.values('status').annotate(
            count=Count('notification_id')
        )
        
        notifications_by_status = {
            item['status']: item['count'] for item in status_stats
        }
        
        # 최근 알림 (최대 5개)
        recent_notifications = notifications.order_by('-created_at')[:5]
        
        stats_data = {
            'total_notifications': total_count,
            'unread_count': unread_count,
            'read_count': read_count,
            'failed_count': failed_count,
            'notifications_by_type': notifications_by_type,
            'notifications_by_status': notifications_by_status,
            'recent_notifications': recent_notifications
        }
        
        serializer = NotificationStatsSerializer(stats_data)
        return Response(serializer.data)


class NotificationSettingsAPIView(APIView):
    """
    알림 설정 관리 API
    사용자별 알림 설정 조회/수정
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """알림 설정 조회 (GET /api/v1/notifications/settings)"""
        user = request.user
        
        # 설정이 없으면 기본값으로 생성
        settings, created = NotificationSettings.objects.get_or_create(user=user)
        
        serializer = NotificationSettingsSerializer(settings)
        return Response(serializer.data)
    
    def put(self, request):
        """알림 설정 수정 (PUT /api/v1/notifications/settings)"""
        user = request.user
        
        # 설정이 없으면 기본값으로 생성
        settings, created = NotificationSettings.objects.get_or_create(user=user)
        
        serializer = NotificationSettingsSerializer(
            settings, 
            data=request.data, 
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'message': '알림 설정이 저장되었습니다.',
            'settings': serializer.data
        })


class FCMTokenRegistrationAPIView(APIView):
    """
    FCM 토큰 등록 API
    모바일 앱에서 FCM 토큰 등록
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """FCM 토큰 등록 (POST /api/v1/notifications/register)"""
        serializer = FCMTokenRegistrationSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        device_token = serializer.save()
        
        return Response({
            'message': 'FCM 토큰이 성공적으로 등록되었습니다.',
            'device_id': str(device_token.device_id),
            'device_type': device_token.device_type,
            'is_active': device_token.is_active
        }, status=status.HTTP_201_CREATED)


class DeviceTokenViewSet(ModelViewSet):
    """
    디바이스 토큰 관리 ViewSet
    사용자의 등록된 디바이스 목록 조회 및 관리
    """
    serializer_class = DeviceTokenSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """사용자의 디바이스 토큰만 조회"""
        return DeviceToken.objects.filter(
            user_id=self.request.user
        ).order_by('-last_login_at')
    
    def list(self, request):
        """등록된 디바이스 목록 조회 (GET /api/v1/notifications/devices)"""
        return super().list(request)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """디바이스 토큰 비활성화 (POST /api/v1/notifications/devices/{id}/deactivate)"""
        device_token = get_object_or_404(
            DeviceToken,
            device_id=pk,
            user_id=request.user
        )
        
        device_token.deactivate()
        
        return Response({
            'message': '디바이스가 비활성화되었습니다.',
            'device_id': str(device_token.device_id)
        })
    
    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """디바이스 토큰 재활성화 (POST /api/v1/notifications/devices/{id}/reactivate)"""
        device_token = get_object_or_404(
            DeviceToken,
            device_id=pk,
            user_id=request.user
        )
        
        device_token.is_active = True
        device_token.save(update_fields=['is_active'])
        
        return Response({
            'message': '디바이스가 재활성화되었습니다.',
            'device_id': str(device_token.device_id)
        })


class NotificationTestAPIView(APIView):
    """
    알림 테스트 API (개발/테스트용)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """테스트 알림 발송 (POST /api/v1/notifications/test)"""
        from .utils import send_queue_update_notification
        
        user = request.user
        notification_type = request.data.get('type', 'queue_update')
        
        # 테스트 알림 발송
        if notification_type == 'queue_update':
            success = send_queue_update_notification(
                user=user,
                queue_number=5,
                estimated_wait=15
            )
        else:
            # 기본 테스트 알림 생성
            notification = Notification.objects.create(
                user=user,
                type='system',
                title='테스트 알림',
                message='이것은 테스트 알림입니다.',
                data={'test': True}
            )
            success = notification.send()
        
        if success:
            return Response({
                'message': '테스트 알림이 발송되었습니다.',
                'success': True
            })
        else:
            return Response({
                'message': '테스트 알림 발송에 실패했습니다.',
                'success': False
            }, status=status.HTTP_400_BAD_REQUEST)

# 병원 현황 모니터링 관련 뷰 (클래스 기반)

class HospitalStatusMonitoringView(APIView):
    """
    병원 전체 현황 모니터링 API
    GET /api/v1/dashboard/monitor/hospital-status/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """병원 전체 현황 데이터 반환"""
        try:
            current_time = timezone.now()
            today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # 더미 데이터 (실제 모델이 없는 경우)
            queue_stats = {
                'total_patients': 45,
                'waiting_count': 12,
                'in_progress_count': 8,
                'completed_count': 25,
                'avg_wait_time': 23.5
            }
            
            appointment_stats = {
                'total_appointments': 35,
                'scheduled': 15,
                'in_progress': 5,
                'completed': 12,
                'cancelled': 3
            }
            
            # 부서별 현황 (더미 데이터)
            department_stats = [
                {'department__name': '내과', 'patient_count': 15, 'avg_wait': 25.0},
                {'department__name': '정형외과', 'patient_count': 12, 'avg_wait': 30.0},
                {'department__name': '소아과', 'patient_count': 8, 'avg_wait': 20.0},
                {'department__name': '이비인후과', 'patient_count': 6, 'avg_wait': 15.0},
                {'department__name': '피부과', 'patient_count': 4, 'avg_wait': 10.0}
            ]
            
            # 시스템 상태 체크
            system_status = 'normal'
            urgent_issues = []
            
            # 대기시간이 긴 환자 체크 (더미)
            long_wait_patients = 2
            
            if long_wait_patients > 0:
                system_status = 'warning'
                urgent_issues.append({
                    'type': 'LONG_WAIT',
                    'message': f'{long_wait_patients}명의 환자가 2시간 이상 대기 중',
                    'severity': 'warning'
                })
            
            # 응답 데이터 구성
            response_data = {
                'success': True,
                'data': {
                    'systemStatus': system_status,
                    'timestamp': current_time.isoformat(),
                    'queueStats': {
                        'totalPatients': queue_stats.get('total_patients', 0) or 0,
                        'waiting': queue_stats.get('waiting_count', 0) or 0,
                        'inProgress': queue_stats.get('in_progress_count', 0) or 0,
                        'completed': queue_stats.get('completed_count', 0) or 0,
                        'avgWaitTime': round(queue_stats.get('avg_wait_time', 0) or 0, 1)
                    },
                    'appointmentStats': {
                        'total': appointment_stats.get('total_appointments', 0) or 0,
                        'scheduled': appointment_stats.get('scheduled', 0) or 0,
                        'inProgress': appointment_stats.get('in_progress', 0) or 0,
                        'completed': appointment_stats.get('completed', 0) or 0,
                        'cancelled': appointment_stats.get('cancelled', 0) or 0
                    },
                    'departmentStats': department_stats,
                    'urgentIssues': urgent_issues,
                    'metrics': {
                        'patientSatisfaction': 4.2,
                        'resourceUtilization': 78,
                        'avgServiceTime': 35
                    }
                }
            }
            
            return Response(response_data)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': '병원 현황 데이터를 가져오는 중 오류가 발생했습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SystemAlertsMonitoringView(APIView):
    """
    시스템 알림 모니터링 API
    GET /api/v1/dashboard/monitor/system-alerts/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """시스템 알림 조회"""
        try:
            current_time = timezone.now()
            
            # 최근 24시간 내 알림들 (더미 데이터)
            alerts = []
            
            alerts.append({
                'id': 'alert_001',
                'type': 'QUEUE_DELAY',
                'severity': 'warning',
                'message': '일부 부서에서 대기 시간이 증가하고 있습니다.',
                'timestamp': current_time.isoformat(),
                'department': 'all'
            })
            
            alerts.append({
                'id': 'alert_002',
                'type': 'SYSTEM_INFO',
                'severity': 'info',
                'message': '시스템이 정상 작동 중입니다.',
                'timestamp': current_time.isoformat(),
                'department': 'system'
            })
            
            # 추가 알림 예시
            if current_time.hour > 14:  # 오후 2시 이후면
                alerts.append({
                    'id': 'alert_003',
                    'type': 'CAPACITY',
                    'severity': 'info',
                    'message': '오후 진료 시간대 정상 운영 중',
                    'timestamp': current_time.isoformat(),
                    'department': 'all'
                })
            
            return Response({
                'success': True,
                'data': {
                    'alerts': alerts,
                    'total': len(alerts),
                    'timestamp': current_time.isoformat()
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': '시스템 알림을 가져오는 중 오류가 발생했습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DemoControlView(APIView):
    """
    데모 시뮬레이션 제어 API
    - POST: 5분간 데모 시작 (타임라인 데이터 생성 및 캐시)
    - GET: 현재 데모 상태 확인
    - DELETE: 데모 강제 종료
    """
    # 테스트를 위해 인증 임시 비활성화
    permission_classes = []  # [permissions.IsAuthenticated]

    DEMO_ACTIVE_KEY = "demo_mode_active"
    DEMO_START_TIME_KEY = "demo_start_time"
    DEMO_TIMELINE_KEY = "demo_timeline"
    DEMO_DURATION = 300  # 5분 (300초)

    def post(self, request):
        """데모 시작 - 5분치 예측 데이터를 미리 생성하여 캐시"""
        try:
            # 이미 데모가 실행 중인지 확인
            if cache.get(self.DEMO_ACTIVE_KEY):
                return Response({
                    "status": "already_running",
                    "message": "데모가 이미 실행 중입니다."
                }, status=status.HTTP_400_BAD_REQUEST)

            # prediction_service import (순환 참조 방지를 위해 메서드 내부에서)
            from integrations.services.prediction_service import PredictionService

            # 5분간의 예측 데이터 미리 생성
            timeline = {}
            start_time = timezone.now()

            # 10초 간격으로 데이터 생성 (총 30개 데이터 포인트)
            for second in range(0, self.DEMO_DURATION + 1, 10):
                # 각 시점별로 예측 데이터 생성
                predictions = PredictionService.get_predictions(timeframe='30min')

                # 시간 경과에 따른 변화 시뮬레이션
                if isinstance(predictions, dict):
                    for dept_name, dept_data in predictions.items():
                        if isinstance(dept_data, dict) and 'predicted_wait' in dept_data:
                            # 시간이 지날수록 대기시간 증가 시뮬레이션
                            time_factor = 1 + (second / 300) * 0.3  # 최대 30% 증가
                            dept_data['predicted_wait'] = int(dept_data.get('predicted_wait', 20) * time_factor)
                            dept_data['current_wait'] = int(dept_data.get('current_wait', 15) * time_factor)

                            # 혼잡도도 시간에 따라 증가
                            congestion = min(1.0, dept_data.get('congestion', 0.5) * time_factor)
                            dept_data['congestion'] = round(congestion, 2)

                            # 추세 업데이트
                            dept_data['trend'] = 'up' if second > 150 else 'stable'

                timeline[str(second)] = predictions

            # 캐시에 저장 (TTL 5분)
            cache.set(self.DEMO_ACTIVE_KEY, True, timeout=self.DEMO_DURATION)
            cache.set(self.DEMO_START_TIME_KEY, start_time.isoformat(), timeout=self.DEMO_DURATION)
            cache.set(self.DEMO_TIMELINE_KEY, json.dumps(timeline, default=str), timeout=self.DEMO_DURATION)

            return Response({
                "status": "started",
                "duration": self.DEMO_DURATION,
                "start_time": start_time.isoformat(),
                "message": "데모가 시작되었습니다. 모든 대시보드가 실시간 데이터를 표시합니다.",
                "data_points": len(timeline)
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                "status": "error",
                "message": f"데모 시작 중 오류 발생: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        """데모 상태 확인"""
        try:
            if not cache.get(self.DEMO_ACTIVE_KEY):
                return Response({
                    "active": False,
                    "message": "데모가 실행 중이지 않습니다."
                }, status=status.HTTP_200_OK)

            # 시작 시간 가져오기
            start_time_str = cache.get(self.DEMO_START_TIME_KEY)
            if not start_time_str:
                return Response({
                    "active": False,
                    "message": "데모 시작 시간을 찾을 수 없습니다."
                }, status=status.HTTP_200_OK)

            start_time = datetime.fromisoformat(start_time_str)
            current_time = timezone.now()

            # 타임존 정보 맞추기
            if start_time.tzinfo is None:
                start_time = timezone.make_aware(start_time)

            elapsed = int((current_time - start_time).total_seconds())
            remaining = max(0, self.DEMO_DURATION - elapsed)

            # 5분 경과 체크
            if elapsed >= self.DEMO_DURATION:
                # 캐시 자동 만료되었을 것이지만 확실히 삭제
                cache.delete(self.DEMO_ACTIVE_KEY)
                cache.delete(self.DEMO_START_TIME_KEY)
                cache.delete(self.DEMO_TIMELINE_KEY)

                return Response({
                    "active": False,
                    "message": "데모가 종료되었습니다."
                }, status=status.HTTP_200_OK)

            return Response({
                "active": True,
                "elapsed": elapsed,
                "remaining": remaining,
                "progress": round((elapsed / self.DEMO_DURATION) * 100, 1),
                "start_time": start_time.isoformat(),
                "message": f"데모 진행 중 ({elapsed}초 경과, {remaining}초 남음)"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": f"상태 확인 중 오류: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        """데모 강제 종료"""
        try:
            was_active = cache.get(self.DEMO_ACTIVE_KEY)

            # 캐시에서 데모 데이터 삭제
            cache.delete(self.DEMO_ACTIVE_KEY)
            cache.delete(self.DEMO_START_TIME_KEY)
            cache.delete(self.DEMO_TIMELINE_KEY)

            if was_active:
                message = "데모가 성공적으로 종료되었습니다."
            else:
                message = "실행 중인 데모가 없습니다."

            return Response({
                "status": "stopped",
                "message": message
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": f"데모 종료 중 오류: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)