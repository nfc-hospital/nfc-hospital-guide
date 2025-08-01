from rest_framework.generics import UpdateAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import F
from .models import Queue, QueueStatusLog
from .serializers import QueueSerializer, MyPositionSerializer, QueueStatusUpdateSerializer
from appointments.models import Appointment, Exam

class QueueJoinView(APIView):
    """
    대기열 추가 (POST /queues/join)
    NFC 태그 스캔 시 호출되는 API
    """
    def post(self, request, *args, **kwargs):
        # request.data에서 NFC 스캔으로 받은 정보를 추출(appointment_id 필요)
        appointment_id = request.data.get('appointment_id')
        if not appointment_id:
            return Response({'error': 'appointment_id가 필요합니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. 환자 검사 예약 확인
        appointment = get_object_or_404(Appointment, appointment_id=appointment_id)

        try:
            # 2. 대기열 생성
            # priority는 기본값 'normal'로 설정, 필요에 따라 변경
            new_queue = Queue.create_from_appointment(appointment)
            
            serializer = QueueSerializer(new_queue)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MyPositionView(APIView):
    """
    대기 상태 조회 (GET /queues/my-position)
    """
    def get(self, request, *args, **kwargs):
        user = request.user # 현재 로그인한 사용자 정보 (인증 필요)
        
        try:
            # 현재 사용자의 대기열 정보 조회
            queue_item = Queue.objects.get(user=user, state__in=['waiting', 'called'])

            # 앞선 대기자 수 계산
            ahead_count = Queue.objects.filter(
                exam=queue_item.exam,
                state='waiting',
                queue_number__lt=queue_item.queue_number
            ).count()

            data = {
                'queue_number': queue_item.queue_number,
                'estimated_wait_time': queue_item.estimated_wait_time,
                'state': queue_item.state,
                'aheadCount': ahead_count,
            }
            serializer = MyPositionSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Queue.DoesNotExist:
            return Response({'message': '현재 대기열에 등록되지 않았습니다.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

from rest_framework.generics import ListAPIView
from django_filters.rest_framework import DjangoFilterBackend

class QueueListView(ListAPIView):
    """
    대기열 목록 (관리자용) (GET /queues/?state=waiting)
    필터링 및 정렬 기능 포함
    """
    queryset = Queue.objects.all()
    serializer_class = QueueSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['state', 'exam', 'priority'] # 쿼리 파라미터로 필터링할 필드
    ordering_fields = ['estimated_wait_time', 'priority'] # 정렬 가능한 필드

class QueueStatusUpdateView(UpdateAPIView):
    """
    대기열 상태 변경 API (PATCH /queues/{queueId})
    """
    queryset = Queue.objects.all()
    serializer_class = QueueStatusUpdateSerializer
    http_method_names = ['patch'] # PATCH 메서드만 허용

    def patch(self, request, *args, **kwargs):
        queue = self.get_object() # URL의 pk(queueId)로 Queue 객체 가져옴
        old_state = queue.state
        old_queue_number = queue.queue_number
        
        serializer = self.get_serializer(instance=queue, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_state = serializer.validated_data['state']
        reason = serializer.validated_data.get('reason', '')
        changed_by = request.user # 현재 로그인된 사용자

        with transaction.atomic(): # 상태 변경 및 로그 기록을 하나의 트랜잭션으로 처리
            # 1. 상태 전환 규칙에 따라 모델 메서드 호출
            if new_state == 'called':
                queue.call_patient()
            elif new_state == 'in_progress':
                queue.start_examination()
            elif new_state == 'completed':
                queue.complete_examination()
            elif new_state == 'cancelled':
                queue.cancel()

            # 2. 상태 변경 로그 기록
            QueueStatusLog.objects.create(
                queue=queue,
                previous_state=old_state,
                new_state=new_state,
                previous_number=old_queue_number,
                new_number=queue.queue_number, # 상태 변경 후의 새로운 순번
                changed_by=changed_by,
                reason=reason
            )
        
        return Response({'status': 'success', 'message': f'상태가 {old_state}에서 {new_state}로 변경되었습니다.'})
    