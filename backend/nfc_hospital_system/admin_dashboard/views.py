"""
Admin Dashboard API Views
알림 관련 API 뷰들
"""

from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

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