from rest_framework.generics import UpdateAPIView, ListAPIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import F, Count, Avg, Max, Min, Q, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from django.http import StreamingHttpResponse
import json
import time
import logging
from .models import Queue, QueueStatusLog
from .serializers import QueueSerializer, MyPositionSerializer, QueueStatusUpdateSerializer
from appointments.models import Appointment, Exam
from appointments.serializers import AppointmentSerializer
from authentication.models import User
from nfc_hospital_system.utils import APIResponse

logger = logging.getLogger(__name__)

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
            
            # 대기열 생성 후 앞선 대기자 수를 다시 계산
            ahead_count = Queue.objects.filter(
                exam=new_queue.exam,
                state='waiting',
                queue_number__lt=new_queue.queue_number
            ).count()

            # Exam 모델에서 평균 소요 시간과 버퍼 시간 로드
            average_time_per_exam = new_queue.exam.average_duration
            buffer_time = new_queue.exam.buffer_time

            # 예상 대기 시간 계산 후 저장
            new_queue.estimated_wait_time = (ahead_count * average_time_per_exam) + buffer_time
            new_queue.save()

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

            my_priority = queue_item.priority
            ahead_count = 0
            
            # emergency => 즉시 처리
            if my_priority == 'emergency':
                ahead_count = 0
            else:
                # 내 앞에 있는 emergency 환자 수 더하기
                ahead_emergency_count = Queue.objects.filter(
                    exam=queue_item.exam,
                    state='waiting',
                    priority='emergency'
                ).count()
                ahead_count += ahead_emergency_count
                
                if my_priority == 'urgent':
                    # 내 앞에 있는 urgent 환자 수 더하기
                    ahead_urgent_count = Queue.objects.filter(
                        exam=queue_item.exam,
                        state='waiting',
                        priority='urgent',
                        queue_number__lt=queue_item.queue_number
                    ).count()
                    ahead_count += ahead_urgent_count
                    
                    # 1 urgent : 2 normal 규칙에 따라 내 앞에 있는 normal 환자 수 계산
                    # 앞선 normal 환자 수의 절반을 더하는 방식으로 구현
                    ahead_normal_count = Queue.objects.filter(
                        exam=queue_item.exam,
                        state='waiting',
                        priority='normal'
                    ).count()
                    
                    # urgent 환자 1명 당 normal 2명 처리 후 다시 urgent 1명 처리
                    ahead_count += (ahead_normal_count // 2)

                elif my_priority == 'normal':
                    # 내 앞에 있는 urgent 환자 수 더하기
                    ahead_urgent_count = Queue.objects.filter(
                        exam=queue_item.exam,
                        state='waiting',
                        priority='urgent'
                    ).count()
                    
                    # 내 앞에 있는 normal 환자 수 더하기
                    ahead_normal_count = Queue.objects.filter(
                        exam=queue_item.exam,
                        state='waiting',
                        priority='normal',
                        queue_number__lt=queue_item.queue_number
                    ).count()
                    ahead_count += ahead_urgent_count + ahead_normal_count
            
            # 예상 대기 시간 계산
            estimated_wait_time = (ahead_count * queue_item.exam.average_duration) + queue_item.exam.buffer_time

            data = {
                'queue_number': queue_item.queue_number,
                'estimated_wait_time': estimated_wait_time,
                'state': queue_item.state,
                'aheadCount': ahead_count,
            }
            serializer = MyPositionSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Queue.DoesNotExist:
            return Response({'message': '현재 대기열에 등록되지 않았습니다.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MyCurrentQueuesView(ListAPIView):
    """
    현재 내 대기열 API
    GET /api/v1/queues/my-current/
    """
    serializer_class = QueueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Queue.objects.filter(
            user=self.request.user
        ).exclude(
            state__in=['completed', 'cancelled', 'no_show']
        ).select_related('exam', 'appointment').order_by('created_at')


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
    
@api_view(['POST'])
def test_queue_update(request):
    """대기열 상태 업데이트 테스트 API"""
    try:
        queue_id = request.data.get('queue_id')
        new_state = request.data.get('state', 'waiting')
        
        if queue_id:
            # 특정 Queue 업데이트
            queue = Queue.objects.get(queue_id=queue_id)
        else:
            # 첫 번째 Queue 업데이트
            queue = Queue.objects.first()
            
        if not queue:
            return Response({'error': '대기열을 찾을 수 없습니다.'}, status=404)
            
        old_state = queue.state
        queue.state = new_state
        
        if new_state == 'called':
            from django.utils import timezone
            queue.called_at = timezone.now()
            
        queue.save()  # 이때 signal이 발동되어 WebSocket 알림 전송
        
        return Response({
            'success': True,
            'message': f'대기열 {queue.queue_number}번 상태를 {old_state} → {new_state}로 변경했습니다.',
            'queue_id': str(queue.queue_id),
            'old_state': old_state,
            'new_state': queue.state,
            'queue_number': queue.queue_number
        })
        
    except Queue.DoesNotExist:
        return Response({'error': '해당 대기열을 찾을 수 없습니다.'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# 대기열 모니터링 추가 API

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def queue_realtime_sse(request):
    """
    실시간 대기열 조회 (SSE) - GET /admin/queue/realtime
    
    Server-Sent Events를 사용한 실시간 대기열 업데이트
    """
    # 권한 확인 (Staff 이상)
    admin_user = request.user
    if admin_user.role not in ['super', 'dept', 'staff']:
        return Response({'error': '권한이 부족합니다.'}, status=status.HTTP_403_FORBIDDEN)

    def event_stream():
        while True:
            try:
                # 현재 대기열 상태 조회
                queue_stats = Queue.objects.filter(
                    state__in=['waiting', 'called', 'in_progress']
                ).aggregate(
                    total_waiting=Count('queue_id', filter=Q(state='waiting')),
                    total_called=Count('queue_id', filter=Q(state='called')),
                    total_in_progress=Count('queue_id', filter=Q(state='in_progress')),
                    avg_wait_time=Avg('estimated_wait_time', filter=Q(state='waiting'))
                )
                
                # 부서별 대기열 현황
                dept_queues = []
                for exam in Exam.objects.filter(is_active=True):
                    dept_stat = Queue.objects.filter(
                        exam=exam,
                        state__in=['waiting', 'called']
                    ).aggregate(
                        waiting_count=Count('queue_id', filter=Q(state='waiting')),
                        called_count=Count('queue_id', filter=Q(state='called')),
                        avg_wait=Avg('estimated_wait_time')
                    )
                    
                    dept_queues.append({
                        'examId': exam.exam_id,
                        'examName': exam.title,
                        'department': exam.department,
                        'waitingCount': dept_stat['waiting_count'],
                        'calledCount': dept_stat['called_count'],
                        'avgWaitTime': dept_stat['avg_wait'] or 0
                    })
                
                # 최근 호출된 환자
                recent_called = Queue.objects.filter(
                    state='called',
                    called_at__isnull=False
                ).order_by('-called_at')[:5]
                
                recent_called_list = [{
                    'queueNumber': q.queue_number,
                    'examName': q.exam.title,
                    'calledAt': q.called_at.isoformat() if q.called_at else None
                } for q in recent_called]
                
                # SSE 데이터 형식
                data = {
                    'timestamp': timezone.now().isoformat(),
                    'summary': {
                        'totalWaiting': queue_stats['total_waiting'],
                        'totalCalled': queue_stats['total_called'],
                        'totalInProgress': queue_stats['total_in_progress'],
                        'avgWaitTime': round(queue_stats['avg_wait_time'] or 0, 2)
                    },
                    'departments': dept_queues,
                    'recentCalled': recent_called_list
                }
                
                yield f"data: {json.dumps(data)}\n\n"
                time.sleep(3)  # 3초 간격
                
            except Exception as e:
                logger.error(f"SSE streaming error: {str(e)}")
                yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
                break
    
    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def queue_realtime_data(request):
    """
    실시간 대기열 조회 (JSON) - GET /admin/queue/realtime-data
    
    SSE가 아닌 일반 JSON 응답으로 실시간 대기열 데이터 반환
    """
    try:
        # 권한 확인 (Staff 이상)
        admin_user = request.user
        if admin_user.role not in ['super', 'dept', 'staff']:
            return APIResponse.error(
                message="권한이 부족합니다.",
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )

        # 현재 대기열 상태 조회
        queue_stats = Queue.objects.filter(
            state__in=['waiting', 'called', 'in_progress']
        ).aggregate(
            total_waiting=Count('queue_id', filter=Q(state='waiting')),
            total_called=Count('queue_id', filter=Q(state='called')),
            total_in_progress=Count('queue_id', filter=Q(state='in_progress')),
            avg_wait_time=Avg('estimated_wait_time', filter=Q(state='waiting'))
        )
        
        # 부서별 대기열 현황
        dept_queues = []
        for exam in Exam.objects.filter(is_active=True):
            dept_stat = Queue.objects.filter(
                exam=exam,
                state__in=['waiting', 'called']
            ).aggregate(
                waiting_count=Count('queue_id', filter=Q(state='waiting')),
                called_count=Count('queue_id', filter=Q(state='called')),
                avg_wait=Avg('estimated_wait_time')
            )
            
            dept_queues.append({
                'examId': exam.exam_id,
                'examName': exam.title,
                'department': exam.department,
                'waitingCount': dept_stat['waiting_count'] or 0,
                'calledCount': dept_stat['called_count'] or 0,
                'avgWaitTime': round(dept_stat['avg_wait'] or 0, 2)
            })
        
        # 최근 호출된 환자
        recent_called = Queue.objects.filter(
            state='called',
            called_at__isnull=False
        ).order_by('-called_at')[:5]
        
        recent_called_list = [{
            'queueNumber': q.queue_number,
            'examName': q.exam.title,
            'calledAt': q.called_at.isoformat() if q.called_at else None
        } for q in recent_called]
        
        # JSON 응답 데이터
        data = {
            'timestamp': timezone.now().isoformat(),
            'summary': {
                'totalWaiting': queue_stats['total_waiting'] or 0,
                'totalCalled': queue_stats['total_called'] or 0,
                'totalInProgress': queue_stats['total_in_progress'] or 0,
                'avgWaitTime': round(queue_stats['avg_wait_time'] or 0, 2)
            },
            'departments': dept_queues,
            'recentCalled': recent_called_list
        }
        
        return APIResponse.success(
            data=data,
            message="실시간 대기열 데이터 조회 성공"
        )
        
    except Exception as e:
        logger.error(f"Queue realtime data error: {str(e)}")
        return APIResponse.error(
            message="실시간 대기열 데이터 조회 중 오류가 발생했습니다.",
            code="INTERNAL_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def queue_by_department(request):
    """
    부서별 대기 현황 - GET /admin/queue/by-department
    """
    # 권한 확인 (Staff 이상)
    admin_user = request.user
    if admin_user.role not in ['super', 'dept', 'staff']:
        return APIResponse.error(
            message="권한이 부족합니다.",
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        department = request.GET.get('department')
        date = request.GET.get('date', timezone.now().date().isoformat())
        
        # 부서별 통계
        query = Queue.objects.filter(
            created_at__date=date
        )
        
        if department:
            query = query.filter(exam__department=department)
        
        dept_stats = []
        departments = Exam.objects.values_list('department', flat=True).distinct()
        
        for dept in departments:
            if department and dept != department:
                continue
                
            dept_queues = query.filter(exam__department=dept)
            
            # 시간대별 분석
            hourly_stats = []
            for hour in range(8, 18):  # 8시부터 18시까지
                hour_queues = dept_queues.filter(
                    created_at__hour=hour
                )
                
                hourly_stats.append({
                    'hour': hour,
                    'count': hour_queues.count(),
                    'avgWaitTime': hour_queues.aggregate(
                        avg=Avg('estimated_wait_time')
                    )['avg'] or 0
                })
            
            # 현재 대기 상태
            current_stats = dept_queues.aggregate(
                total=Count('queue_id'),
                waiting=Count('queue_id', filter=Q(state='waiting')),
                called=Count('queue_id', filter=Q(state='called')),
                in_progress=Count('queue_id', filter=Q(state='in_progress')),
                completed=Count('queue_id', filter=Q(state='completed')),
                cancelled=Count('queue_id', filter=Q(state='cancelled')),
                avg_wait=Avg('estimated_wait_time'),
                max_wait=Max('estimated_wait_time'),
                min_wait=Min('estimated_wait_time')
            )
            
            # 우선순위별 분석
            priority_stats = dept_queues.values('priority').annotate(
                count=Count('queue_id'),
                avg_wait=Avg('estimated_wait_time')
            )
            
            dept_stats.append({
                'department': dept,
                'date': date,
                'currentStats': current_stats,
                'hourlyStats': hourly_stats,
                'priorityBreakdown': list(priority_stats),
                'peakHour': max(hourly_stats, key=lambda x: x['count'])['hour'] if hourly_stats else None
            })
        
        return APIResponse.success(
            data=dept_stats,
            message="부서별 대기 현황을 조회했습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Department queue stats error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="부서별 대기 현황 조회 중 오류가 발생했습니다.",
            code="DEPT_QUEUE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_alert_settings(request):
    """
    지연 알림 설정 - PUT /admin/queue/alert-settings
    """
    # 권한 확인 (Dept-Admin 이상)
    admin_user = request.user
    if admin_user.role not in ['super', 'dept']:
        return APIResponse.error(
            message="부서 관리자 이상의 권한이 필요합니다.",
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        delay_threshold = request.data.get('delayThreshold', 30)  # 기본 30분
        exam_id = request.data.get('examId')
        enable_alerts = request.data.get('enableAlerts', True)
        
        # 검사 별 알림 설정 저장 (실제로는 별도 모델이 필요하지만 간단히 구현)
        if exam_id:
            exam = get_object_or_404(Exam, exam_id=exam_id)
            # 임시로 buffer_time을 알림 임계값으로 사용
            exam.buffer_time = delay_threshold
            exam.save()
            
            message = f"{exam.title} 검사의 지연 알림 설정이 업데이트되었습니다."
        else:
            # 전체 설정 업데이트
            Exam.objects.update(buffer_time=delay_threshold)
            message = "전체 검사의 지연 알림 설정이 업데이트되었습니다."
        
        return APIResponse.success(
            data={
                'delayThreshold': delay_threshold,
                'examId': exam_id,
                'enableAlerts': enable_alerts
            },
            message=message,
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Alert settings update error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="알림 설정 업데이트 중 오류가 발생했습니다.",
            code="ALERT_SETTINGS_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def call_patient(request):
    """
    환자 호출 - POST /medical/queue/call-patient
    """
    # 권한 확인 (Medical 이상)
    admin_user = request.user
    if admin_user.role not in ['super', 'dept', 'staff']:
        return APIResponse.error(
            message="의료진 권한이 필요합니다.",
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        queue_id = request.data.get('queueId')
        exam_room = request.data.get('examRoom')
        
        queue = get_object_or_404(Queue, queue_id=queue_id)
        
        # 호출 처리
        with transaction.atomic():
            old_state = queue.state
            queue.call_patient()
            
            # 호출 로그 기록
            QueueStatusLog.objects.create(
                queue=queue,
                previous_state=old_state,
                new_state='called',
                changed_by=request.user,
                reason=f'검사실: {exam_room}' if exam_room else '호출'
            )
            
            # TODO: 실제 푸시 알림 발송 (FCM/WebSocket)
            # 여기서는 WebSocket 시그널이 자동으로 처리됨
            
        return APIResponse.success(
            data={
                'queueId': str(queue.queue_id),
                'queueNumber': queue.queue_number,
                'state': queue.state,
                'examRoom': exam_room
            },
            message=f"{queue.queue_number}번 환자를 호출했습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Patient call error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="환자 호출 중 오류가 발생했습니다.",
            code="CALL_PATIENT_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def missing_patients(request):
    """
    누락 환자 감지 - GET /medical/queue/missing-patients
    """
    # 권한 확인 (Medical 이상)
    admin_user = request.user
    if admin_user.role not in ['super', 'dept', 'staff']:
        return APIResponse.error(
            message="의료진 권한이 필요합니다.",
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # 호출된 지 10분 이상 지난 환자 찾기
        missing_threshold = timezone.now() - timedelta(minutes=10)
        
        missing_queues = Queue.objects.filter(
            state='called',
            called_at__lt=missing_threshold
        ).select_related('user', 'exam').order_by('called_at')
        
        missing_list = []
        for queue in missing_queues:
            missing_duration = timezone.now() - queue.called_at
            missing_list.append({
                'queueId': str(queue.queue_id),
                'queueNumber': queue.queue_number,
                'patientName': queue.user.get_full_name() if hasattr(queue.user, 'get_full_name') else queue.user.username,
                'examName': queue.exam.title,
                'calledAt': queue.called_at.isoformat(),
                'missingDuration': int(missing_duration.total_seconds() / 60),  # 분 단위
                'priority': queue.priority,
                'contactInfo': queue.user.phone if hasattr(queue.user, 'phone') else None
            })
        
        # 통계
        stats = {
            'totalMissing': len(missing_list),
            'byPriority': {
                'emergency': len([m for m in missing_list if m['priority'] == 'emergency']),
                'urgent': len([m for m in missing_list if m['priority'] == 'urgent']),
                'normal': len([m for m in missing_list if m['priority'] == 'normal'])
            },
            'averageMissingTime': sum(m['missingDuration'] for m in missing_list) / len(missing_list) if missing_list else 0
        }
        
        return APIResponse.success(
            data={
                'missingPatients': missing_list,
                'statistics': stats
            },
            message="누락 환자 목록을 조회했습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Missing patients detection error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="누락 환자 감지 중 오류가 발생했습니다.",
            code="MISSING_PATIENTS_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def queue_performance_metrics(request):
    """
    대기열 성능 메트릭 - GET /admin/queue/metrics
    """
    # 권한 확인 (Dept-Admin 이상)

    admin_user = request.user
    if admin_user.role not in ['super', 'dept']:
        return APIResponse.error(
            message="부서 관리자 이상의 권한이 필요합니다.",
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # 쿼리 파라미터
        start_date = request.GET.get('startDate', (timezone.now() - timedelta(days=7)).date().isoformat())
        end_date = request.GET.get('endDate', timezone.now().date().isoformat())
        department = request.GET.get('department')
        
        # 기간 필터링
        queues = Queue.objects.filter(
            created_at__date__range=[start_date, end_date]
        )
        
        if department:
            queues = queues.filter(exam__department=department)
        
        # 기본 메트릭
        basic_metrics = queues.aggregate(
            total_patients=Count('queue_id'),
            completed_patients=Count('queue_id', filter=Q(state='completed')),
            cancelled_patients=Count('queue_id', filter=Q(state='cancelled')),
            avg_wait_time=Avg('estimated_wait_time'),
            max_wait_time=Max('estimated_wait_time'),
            min_wait_time=Min('estimated_wait_time')
        )
        
        # 실제 대기 시간 vs 예상 대기 시간 분석
        completed_queues = queues.filter(state='completed', called_at__isnull=False)
        wait_time_accuracy = []
        
        for q in completed_queues:
            if q.called_at and q.created_at:
                actual_wait = (q.called_at - q.created_at).total_seconds() / 60
                estimated_wait = q.estimated_wait_time or 0
                if estimated_wait > 0:
                    accuracy = 100 - abs((actual_wait - estimated_wait) / estimated_wait * 100)
                    wait_time_accuracy.append(max(0, accuracy))
        
        avg_accuracy = sum(wait_time_accuracy) / len(wait_time_accuracy) if wait_time_accuracy else 0
        
        # 처리 시간 분석 - updated_at과 called_at을 사용
        processing_times = []
        for q in completed_queues:
            if q.called_at and q.updated_at:
                processing_time = (q.updated_at - q.called_at).total_seconds() / 60
                processing_times.append(processing_time)
        
        # 시간대별 효율성
        hourly_efficiency = []
        for hour in range(8, 18):
            hour_queues = queues.filter(created_at__hour=hour)
            completed = hour_queues.filter(state='completed').count()
            total = hour_queues.count()
            
            hourly_efficiency.append({
                'hour': hour,
                'totalPatients': total,
                'completedPatients': completed,
                'completionRate': (completed / total * 100) if total > 0 else 0,
                'avgWaitTime': hour_queues.aggregate(
                    avg=Avg('estimated_wait_time')
                )['avg'] or 0
            })
        
        # 요일별 패턴
        daily_patterns = []
        for date in range(7):
            target_date = timezone.now().date() - timedelta(days=date)
            day_queues = queues.filter(created_at__date=target_date)
            
            daily_patterns.append({
                'date': target_date.isoformat(),
                'dayOfWeek': target_date.strftime('%A'),
                'totalPatients': day_queues.count(),
                'avgWaitTime': day_queues.aggregate(
                    avg=Avg('estimated_wait_time')
                )['avg'] or 0,
                'peakHour': day_queues.extra(
                    select={'hour': "EXTRACT(hour FROM created_at)"}
                ).values('hour').annotate(
                    count=Count('queue_id')
                ).order_by('-count').first()
            })
        
        return APIResponse.success(
            data={
                'basicMetrics': basic_metrics,
                'waitTimeAccuracy': round(avg_accuracy, 2),
                'processingTime': {
                    'average': round(sum(processing_times) / len(processing_times), 2) if processing_times else 0,
                    'max': round(max(processing_times), 2) if processing_times else 0,
                    'min': round(min(processing_times), 2) if processing_times else 0
                },
                'hourlyEfficiency': hourly_efficiency,
                'dailyPatterns': daily_patterns,
                'period': {
                    'startDate': start_date,
                    'endDate': end_date
                }
            },
            message="대기열 성능 메트릭을 조회했습니다.",
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Queue performance metrics error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="대기열 성능 메트릭 조회 중 오류가 발생했습니다.",
            code="METRICS_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
from .models import PatientState, StateTransition
from integrations.models import EmrSyncStatus
from appointments.models import Appointment

# 환자 상태 관리 API 추가

@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # 비로그인 접근 허용
def nfc_public_info(request):
    """
    비로그인 NFC 태깅 처리 (ARRIVED 상태)
    POST /p-queue/nfc/public-info
    """
    try:
        tag_id = request.data.get('tag_id')
        
        if not tag_id:
            return APIResponse.error(
                message="NFC 태그 ID가 필요합니다.",
                code="MISSING_TAG_ID",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # NFC 태그 정보 조회 (기존 nfc_tags 테이블 활용)
        try:
            from nfc.models import NfcTag  # nfc 앱에 있다고 가정
            tag = NfcTag.objects.get(tag_id=tag_id)
            
            return APIResponse.success(
                data={
                    'tag_info': {
                        'location': f"{tag.building} {tag.floor}층 {tag.room}",
                        'description': tag.description
                    },
                    'public_info': {
                        'welcome_message': '병원에 오신 것을 환영합니다',
                        'reception_guide': '접수창구는 1층 정면 오른쪽입니다',
                        'voice_guide_available': True,
                        'building_map': f"/static/maps/{tag.building}.jpg"
                    }
                },
                message="공용 안내 정보를 조회했습니다."
            )
            
        except:  # NfcTag 모델이 없거나 태그를 찾을 수 없는 경우
            return APIResponse.success(
                data={
                    'public_info': {
                        'welcome_message': '병원에 오신 것을 환영합니다',
                        'reception_guide': '접수창구에서 도착 처리를 받으세요',
                        'voice_guide_available': True
                    }
                },
                message="공용 안내 정보입니다."
            )
        
    except Exception as e:
        logger.error(f"NFC public info error: {str(e)}")
        return APIResponse.error(
            message="공용 안내 정보 조회 중 오류가 발생했습니다.",
            code="PUBLIC_INFO_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class PatientCurrentStateView(APIView):
    """
    환자 현재 상태 조회 API (클래스 기반 뷰)
    GET /api/v1/patient/current-state/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            user = request.user
            
            # PatientState 조회 또는 생성
            try:
                patient_state = PatientState.objects.get(user=user)
            except PatientState.DoesNotExist:
                # 기존 Queue 상태에서 생성
                latest_queue = Queue.objects.filter(user=user).order_by('-updated_at').first()
                if latest_queue:
                    state_mapping = {
                        'waiting': 'WAITING',
                        'called': 'CALLED',
                        'ongoing': 'ONGOING',
                        'completed': 'COMPLETED',
                        'cancelled': 'REGISTERED'
                    }
                    patient_state = PatientState.objects.create(
                        user=user,
                        current_state=state_mapping.get(latest_queue.state, 'REGISTERED'),
                        current_exam=latest_queue.exam.exam_id if latest_queue.exam else None,
                        is_logged_in=True
                    )
                else:
                    patient_state = PatientState.objects.create(
                        user=user,
                        current_state='REGISTERED',
                        is_logged_in=True
                    )
            
            # 오늘 예약 조회
            today = timezone.now().date()
            today_appointments = Appointment.objects.filter(
                user=user,
                scheduled_date=today
            ).select_related('exam').order_by('scheduled_time')
            
            # 현재 대기열 조회
            current_queues = Queue.objects.filter(
                user=user,
                state__in=['waiting', 'called', 'ongoing']
            ).select_related('exam')
            
            return APIResponse.success(
                data={
                    'patient_state': {
                        'current_state': patient_state.current_state,
                        'current_location': patient_state.current_location,
                        'current_exam': patient_state.current_exam,
                        'is_logged_in': patient_state.is_logged_in,
                        'updated_at': patient_state.updated_at.isoformat()
                    },
                    'today_appointments': AppointmentSerializer(today_appointments, many=True).data,
                    'current_queues': QueueSerializer(current_queues, many=True).data,
                    'next_action': get_next_action_guide(patient_state)
                },
                message="환자 상태를 조회했습니다."
            )
            
        except Exception as e:
            logger.error(f"Patient state error: {str(e)}")
            return APIResponse.error(
                message="환자 상태 조회 중 오류가 발생했습니다.",
                code="PATIENT_STATE_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def patient_current_state(request):
    """
    환자 현재 상태 조회 (로그인 후)
    GET /p-queue/patient/current-state
    """
    try:
        user = request.user
        
        # PatientState 조회
        try:
            patient_state = PatientState.objects.get(user=user)
        except PatientState.DoesNotExist:
            # PatientState가 없으면 기존 Queue에서 생성
            latest_queue = Queue.objects.filter(user=user).order_by('-updated_at').first()
            if latest_queue:
                # Queue 상태를 PatientState로 변환
                state_mapping = {
                    'waiting': 'WAITING',
                    'called': 'CALLED',
                    'in_progress': 'ONGOING',
                    'completed': 'COMPLETED',
                    'cancelled': 'REGISTERED'
                }
                
                patient_state = PatientState.objects.create(
                    user=user,
                    current_state=state_mapping.get(latest_queue.state, 'REGISTERED'),
                    current_exam=latest_queue.exam.exam_id,
                    is_logged_in=True
                )
            else:
                # 큐도 없으면 기본 상태로 생성
                patient_state = PatientState.objects.create(
                    user=user,
                    current_state='REGISTERED',
                    is_logged_in=True
                )
        
        # 오늘 일정 조회 - Appointment 모델 사용
        today = timezone.now().date()
        today_appointments = Appointment.objects.filter(
            user=user,
            scheduled_date=today
        ).select_related('exam').order_by('scheduled_time')
        
        # 기존 Queue 정보도 함께 제공 (호환성)
        current_queue = Queue.objects.filter(
            user=user,
            state__in=['waiting', 'called', 'in_progress']
        ).first()
        
        return APIResponse.success(
            data={
                'patient_state': {
                    'current_state': patient_state.current_state,
                    'current_location': patient_state.current_location,
                    'current_exam': patient_state.current_exam,
                    'is_logged_in': patient_state.is_logged_in,
                    'emr_department': patient_state.emr_department,
                    'updated_at': patient_state.updated_at.isoformat()
                },
                'current_queue': QueueSerializer(current_queue).data if current_queue else None,
                'today_schedules': [{
                    'sequence_order': idx + 1,
                    'exam_id': appt.exam.exam_id,
                    'emr_department': appt.exam.department,
                    'status': appt.status,
                    'scheduled_time': appt.scheduled_time.strftime('%H:%M') if appt.scheduled_time else None
                } for idx, appt in enumerate(today_appointments)],
                'next_action': get_next_action_guide(patient_state)
            },
            message="환자 상태를 조회했습니다."
        )
        
    except Exception as e:
        logger.error(f"Patient state error: {str(e)}")
        return APIResponse.error(
            message="환자 상태 조회 중 오류가 발생했습니다.",
            code="PATIENT_STATE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def nfc_checkin(request):
    """
    NFC 태깅으로 위치 체크인 및 상태 업데이트
    POST /p-queue/nfc/checkin
    """
    try:
        user = request.user
        tag_id = request.data.get('tag_id')
        
        if not tag_id:
            return APIResponse.error(
                message="NFC 태그 ID가 필요합니다.",
                code="MISSING_TAG_ID",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # PatientState 조회 또는 생성
        patient_state, created = PatientState.objects.get_or_create(
            user=user,
            defaults={
                'current_state': 'ARRIVED',
                'is_logged_in': True
            }
        )
        
        # 위치 업데이트
        old_location = patient_state.current_location
        old_state = patient_state.current_state
        patient_state.current_location = tag_id
        
        # 태그 위치에 따른 상태 결정
        new_state = determine_state_from_location(tag_id, patient_state)
        
        if new_state != old_state:
            patient_state.current_state = new_state
            
            # 상태 전환 로그 생성
            StateTransition.objects.create(
                user=user,
                from_state=old_state,
                to_state=new_state,
                trigger_type='nfc_tag',
                trigger_source=tag_id,
                location_at_transition=tag_id
            )
        
        patient_state.save()
        
        return APIResponse.success(
            data={
                'checkin_success': True,
                'location_updated': old_location != tag_id,
                'state_changed': old_state != new_state,
                'current_state': patient_state.current_state,
                'current_location': patient_state.current_location,
                'next_action': get_next_action_guide(patient_state)
            },
            message="체크인이 완료되었습니다."
        )
        
    except Exception as e:
        logger.error(f"NFC checkin error: {str(e)}")
        return APIResponse.error(
            message="체크인 처리 중 오류가 발생했습니다.",
            code="CHECKIN_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# 헬퍼 함수들
def get_next_action_guide(patient_state):
    """환자 상태에 따른 다음 액션 가이드"""
    action_guides = {
        'UNREGISTERED': {
            'message': '접수창구에서 도착 처리를 받으세요',
            'action': 'goto_reception',
            'priority': 'high'
        },
        'ARRIVED': {
            'message': '카카오톡 또는 PASS로 로그인하세요',
            'action': 'login_required',
            'priority': 'high'
        },
        'REGISTERED': {
            'message': '첫 번째 검사실로 이동하세요',
            'action': 'goto_exam_room',
            'priority': 'medium'
        },
        'WAITING': {
            'message': '대기 중입니다. 호출을 기다려주세요',
            'action': 'wait_for_call',
            'priority': 'low'
        },
        'CALLED': {
            'message': '검사실로 입실하세요',
            'action': 'enter_exam_room',
            'priority': 'urgent'
        },
        'ONGOING': {
            'message': '검사가 진행 중입니다',
            'action': 'exam_in_progress',
            'priority': 'info'
        },
        'COMPLETED': {
            'message': '다음 일정을 확인하거나 수납창구로 이동하세요',
            'action': 'check_next_or_payment',
            'priority': 'medium'
        },
        'PAYMENT': {
            'message': '수납을 완료하세요',
            'action': 'complete_payment',
            'priority': 'medium'
        },
        'FINISHED': {
            'message': '모든 일정이 완료되었습니다',
            'action': 'all_completed',
            'priority': 'info'
        }
    }
    
    return action_guides.get(patient_state.current_state, {
        'message': '상태를 확인해주세요',
        'action': 'check_status',
        'priority': 'medium'
    })

def determine_state_from_location(tag_id, patient_state):
    """NFC 태그 위치에 따른 상태 결정 로직"""
    # 실제로는 nfc_tags 테이블을 조회해서 위치별 로직을 구현
    # 여기서는 간단한 예시
    
    current_state = patient_state.current_state
    
    # 태그 ID 패턴으로 위치 추정 (실제로는 DB 조회)
    if 'entrance' in tag_id.lower():
        return 'ARRIVED' if not patient_state.is_logged_in else 'REGISTERED'
    elif 'exam' in tag_id.lower() or 'room' in tag_id.lower():
        return 'WAITING' if current_state in ['REGISTERED', 'ARRIVED'] else current_state
    elif 'exit' in tag_id.lower():
        return 'FINISHED'
    elif 'payment' in tag_id.lower():
        return 'PAYMENT'
    else:
        return current_state  # 위치를 알 수 없으면 현재 상태 유지

def calculate_wait_duration(queue):
    """대기 시간 계산"""
    if queue.state == 'waiting':
        wait_time = timezone.now() - queue.created_at
        return int(wait_time.total_seconds() / 60)  # 분 단위
    elif queue.state == 'called' and queue.called_at:
        call_wait_time = timezone.now() - queue.called_at
        return int(call_wait_time.total_seconds() / 60)  # 호출 후 경과 시간
    else:
        return 0
    
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def recent_state_transitions(request):
    """
    최근 상태 전환 목록
    GET /api/v1/queue/transitions/recent/
    """
    try:
        if request.user.role not in ['super', 'dept', 'staff']:
            return APIResponse.error(
                message="간호사 이상의 권한이 필요합니다.",
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        hours = int(request.GET.get('hours', 24))
        department = request.GET.get('department')
        
        start_time = timezone.now() - timedelta(hours=hours)
        
        query = StateTransition.objects.filter(
            created_at__gte=start_time
        ).select_related('user').order_by('-created_at')
        
        if department:
            # PatientState를 통해 부서 필터링
            patient_ids = PatientState.objects.filter(
                emr_department=department
            ).values_list('user_id', flat=True)
            query = query.filter(user_id__in=patient_ids)
        
        transitions = query[:100]  # 최근 100개만
        
        return APIResponse.success(
            data={
                'transitions': [{
                    'transition_id': str(t.transition_id),
                    'user_name': t.user.name if hasattr(t.user, 'name') else t.user.username,
                    'from_state': t.from_state,
                    'to_state': t.to_state,
                    'trigger_type': t.trigger_type,
                    'trigger_source': t.trigger_source,
                    'location_at_transition': t.location_at_transition,
                    'exam_id': t.exam_id,
                    'created_at': t.created_at.isoformat()
                } for t in transitions],
                'period_hours': hours,
                'total_count': query.count()
            },
            message=f"최근 {hours}시간 상태 전환을 조회했습니다."
        )
        
    except Exception as e:
        logger.error(f"Recent transitions error: {str(e)}")
        return APIResponse.error(
            message="최근 상태 전환 조회 중 오류가 발생했습니다.",
            code="RECENT_TRANSITIONS_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def state_transition_analytics(request):
    """
    상태 전환 분석 데이터
    GET /api/v1/queue/transitions/analytics/
    """
    try:
        if request.user.role not in ['super', 'dept']:
            return APIResponse.error(
                message="부서 관리자 이상의 권한이 필요합니다.",
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        days = int(request.GET.get('days', 7))
        start_date = timezone.now() - timedelta(days=days)
        
        transitions = StateTransition.objects.filter(
            created_at__gte=start_date
        )
        
        # 상태별 전환 통계
        state_stats = transitions.values('from_state', 'to_state').annotate(
            count=Count('transition_id')
        ).order_by('-count')
        
        # 트리거 타입별 통계
        trigger_stats = transitions.values('trigger_type').annotate(
            count=Count('transition_id')
        )
        
        # 시간대별 전환 패턴
        hourly_pattern = []
        for hour in range(24):
            hour_count = transitions.filter(
                created_at__hour=hour
            ).count()
            hourly_pattern.append({
                'hour': hour,
                'count': hour_count
            })
        
        # 평균 상태 체류 시간 계산
        avg_durations = {}
        for state in ['WAITING', 'CALLED', 'ONGOING']:
            # 해당 상태로 전환된 후 다음 상태로 전환되기까지의 시간
            state_entries = transitions.filter(to_state=state).order_by('user', 'created_at')
            durations = []
            
            for entry in state_entries:
                next_transition = transitions.filter(
                    user=entry.user,
                    from_state=state,
                    created_at__gt=entry.created_at
                ).first()
                
                if next_transition:
                    duration = (next_transition.created_at - entry.created_at).total_seconds() / 60
                    durations.append(duration)
            
            avg_durations[state] = {
                'avg_minutes': sum(durations) / len(durations) if durations else 0,
                'samples': len(durations)
            }
        
        return APIResponse.success(
            data={
                'period_days': days,
                'total_transitions': transitions.count(),
                'state_transitions': list(state_stats),
                'trigger_breakdown': list(trigger_stats),
                'hourly_pattern': hourly_pattern,
                'average_durations': avg_durations,
                'peak_hour': max(hourly_pattern, key=lambda x: x['count'])['hour'] if hourly_pattern else None
            },
            message="상태 전환 분석 데이터를 조회했습니다."
        )
        
    except Exception as e:
        logger.error(f"Transition analytics error: {str(e)}")
        return APIResponse.error(
            message="상태 전환 분석 중 오류가 발생했습니다.",
            code="TRANSITION_ANALYTICS_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def patient_daily_schedule(request):
    """
    환자 일일 스케줄 조회
    GET /api/v1/queue/patient/daily-schedule/
    """
    try:
        user = request.user
        target_date = request.GET.get('date', timezone.now().date().isoformat())
        
        # Appointment 모델에서 직접 조회
        appointments = Appointment.objects.filter(
            user=user,
            scheduled_date=target_date
        ).select_related('exam').order_by('scheduled_time')
        
        return APIResponse.success(
            data={
                'date': target_date,
                'schedules': [{
                    'sequence_order': idx + 1,
                    'exam_id': appt.exam.exam_id,
                    'exam_name': appt.exam.title,
                    'department': appt.exam.department,
                    'scheduled_time': appt.scheduled_time.strftime('%H:%M') if appt.scheduled_time else None,
                    'status': appt.status,
                    'emr_appointment_id': appt.emr_appointment_id
                } for idx, appt in enumerate(appointments)]
            },
            message="일일 스케줄을 조회했습니다."
        )
        
    except Exception as e:
        logger.error(f"Daily schedule error: {str(e)}")
        return APIResponse.error(
            message="일일 스케줄 조회 중 오류가 발생했습니다.",
            code="DAILY_SCHEDULE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def patient_state_history(request):
    """
    환자 상태 전환 히스토리
    GET /api/v1/queue/patient/state-history/
    """
    try:
        user = request.user
        days = int(request.GET.get('days', 7))
        
        start_date = timezone.now() - timedelta(days=days)
        
        transitions = StateTransition.objects.filter(
            user=user,
            created_at__gte=start_date
        ).order_by('-created_at')
        
        return APIResponse.success(
            data={
                'transitions': [{
                    'from_state': t.from_state,
                    'to_state': t.to_state,
                    'trigger_type': t.trigger_type,
                    'location_at_transition': t.location_at_transition,
                    'created_at': t.created_at.isoformat()
                } for t in transitions]
            },
            message="상태 전환 히스토리를 조회했습니다."
        )
        
    except Exception as e:
        logger.error(f"State history error: {str(e)}")
        return APIResponse.error(
            message="상태 히스토리 조회 중 오류가 발생했습니다.",
            code="STATE_HISTORY_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def nurse_patients_by_state(request):
    """
    상태별 환자 목록 (간호사용)
    GET /api/v1/queue/nurse/patients-by-state/
    """
    try:
        if request.user.role not in ['super', 'dept', 'staff']:
            return APIResponse.error(
                message="간호사 이상의 권한이 필요합니다.",
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        state = request.GET.get('state', 'WAITING')
        department = request.GET.get('department')
        
        query = PatientState.objects.filter(current_state=state).select_related('user')
        
        if department:
            query = query.filter(emr_department=department)
        
        patients = [{
            'user_id': ps.user.user_id,
            'patient_name': ps.user.name if hasattr(ps.user, 'name') else ps.user.username,
            'current_state': ps.current_state,
            'current_exam': ps.current_exam,
            'emr_department': ps.emr_department,
            'updated_at': ps.updated_at.isoformat()
        } for ps in query]
        
        return APIResponse.success(
            data={
                'state_filter': state,
                'department_filter': department,
                'patients': patients,
                'count': len(patients)
            },
            message=f"{state} 상태의 환자 목록을 조회했습니다."
        )
        
    except Exception as e:
        logger.error(f"Patients by state error: {str(e)}")
        return APIResponse.error(
            message="상태별 환자 조회 중 오류가 발생했습니다.",
            code="PATIENTS_BY_STATE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    