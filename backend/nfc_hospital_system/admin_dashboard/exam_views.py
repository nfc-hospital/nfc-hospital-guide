"""
검사/진료 콘텐츠 관리 API
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Avg, Count, Q
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

from appointments.models import Exam
from appointments.serializers import ExamSerializer
from p_queue.models import Queue


class ExamContentViewSet(viewsets.ModelViewSet):
    """
    검사/진료 콘텐츠 관리 ViewSet
    CRUD 작업 및 대기시간 통계 제공
    """
    queryset = Exam.objects.filter(is_active=True)
    serializer_class = ExamSerializer
    
    def get_permissions(self):
        """
        개발 환경에서는 권한 체크 완화
        운영 환경에서는 관리자 권한 필요
        """
        if settings.DEBUG:
            # 개발 환경: 인증된 사용자면 모두 허용
            return [IsAuthenticated()]
        else:
            # 운영 환경: 부서 관리자 이상만 허용
            from authentication.permissions import IsDeptAdminOrHigher
            return [IsAuthenticated(), IsDeptAdminOrHigher()]
    
    def get_queryset(self):
        """활성화된 검사만 반환"""
        queryset = super().get_queryset()
        
        # 부서별 필터링
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
        
        # 카테고리별 필터링
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
            
        return queryset.order_by('department', 'title')
    
    def list(self, request, *args, **kwargs):
        """
        검사 목록 조회 + 평균 대기시간 통계 포함 (최적화됨)
        """
        queryset = self.get_queryset()
        
        # 부서 파라미터 가져오기
        department = self.request.query_params.get('department')
        
        # 오늘 날짜
        today = timezone.now().date()
        
        # 모든 검사의 오늘 대기열을 한 번에 가져오기 (최적화)
        exam_ids = queryset.values_list('exam_id', flat=True)
        today_queues = Queue.objects.filter(
            exam_id__in=exam_ids,
            created_at__date=today
        ).select_related('exam').values(
            'exam_id', 'state', 'created_at', 'called_at'
        )
        
        # 검사별로 대기열 데이터 그룹핑
        queue_data_by_exam = {}
        for queue in today_queues:
            exam_id = queue['exam_id']
            if exam_id not in queue_data_by_exam:
                queue_data_by_exam[exam_id] = {
                    'completed': [],
                    'waiting': 0,
                    'total': 0
                }
            
            queue_data_by_exam[exam_id]['total'] += 1
            
            if queue['state'] == 'completed' and queue['called_at']:
                wait_time = (queue['called_at'] - queue['created_at']).total_seconds() / 60
                queue_data_by_exam[exam_id]['completed'].append(wait_time)
            elif queue['state'] in ['waiting', 'called']:
                queue_data_by_exam[exam_id]['waiting'] += 1
        
        # 각 검사에 대한 데이터 구성
        exam_data = []
        # 부서별 필터링 시에는 제한 없이, 전체 조회 시에만 제한
        limit = None if department else 50  # 전체 조회 시 최대 50개
        exam_list = queryset[:limit] if limit else queryset
        for exam in exam_list:
            exam_id = exam.exam_id
            queue_info = queue_data_by_exam.get(exam_id, {
                'completed': [],
                'waiting': 0,
                'total': 0
            })
            
            # 평균 대기시간 계산
            if queue_info['completed']:
                avg_wait_time = round(sum(queue_info['completed']) / len(queue_info['completed']))
            else:
                avg_wait_time = exam.average_duration
            
            exam_dict = {
                'exam_id': exam.exam_id,
                'title': exam.title,
                'department': exam.department,
                'category': exam.category,
                'average_duration': exam.average_duration,
                'average_wait_time': avg_wait_time,
                'current_waiting_count': queue_info['waiting'],
                'total_today_count': queue_info['total']
            }
            
            exam_data.append(exam_dict)
        
        return Response({
            'count': len(exam_data),
            'results': exam_data
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        검사별 통계 정보 제공
        """
        # 기간 설정 (기본: 오늘)
        period = request.query_params.get('period', 'today')
        
        if period == 'today':
            start_date = timezone.now().date()
            end_date = start_date + timedelta(days=1)
        elif period == 'week':
            end_date = timezone.now().date() + timedelta(days=1)
            start_date = end_date - timedelta(days=7)
        elif period == 'month':
            end_date = timezone.now().date() + timedelta(days=1)
            start_date = end_date - timedelta(days=30)
        else:
            start_date = timezone.now().date()
            end_date = start_date + timedelta(days=1)
        
        # 검사별 통계 계산
        exams = Exam.objects.filter(is_active=True)
        statistics = []
        
        for exam in exams:
            queues = Queue.objects.filter(
                exam_id=exam.exam_id,
                created_at__gte=start_date,
                created_at__lt=end_date
            )
            
            # 평균 대기시간 계산
            completed_queues = queues.filter(state='completed')
            total_wait_time = 0
            wait_count = 0
            
            for queue in completed_queues:
                if queue.called_at:
                    wait_time = (queue.called_at - queue.created_at).total_seconds() / 60
                    total_wait_time += wait_time
                    wait_count += 1
            
            avg_wait_time = round(total_wait_time / wait_count) if wait_count > 0 else 0
            
            statistics.append({
                'exam_id': exam.exam_id,
                'title': exam.title,
                'department': exam.department,
                'total_patients': queues.count(),
                'completed': queues.filter(state='completed').count(),
                'cancelled': queues.filter(state='cancelled').count(),
                'no_show': queues.filter(state='no_show').count(),
                'average_wait_time': avg_wait_time,
                'average_duration': exam.average_duration
            })
        
        # 대기시간 기준으로 정렬
        statistics.sort(key=lambda x: x['average_wait_time'], reverse=True)
        
        return Response({
            'period': period,
            'start_date': start_date,
            'end_date': end_date,
            'statistics': statistics
        })
    
    def create(self, request, *args, **kwargs):
        """검사 생성"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """검사 수정"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
            
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """검사 비활성화 (soft delete)"""
        instance = self.get_object()
        
        # 진행 중인 대기열이 있는지 확인
        active_queues = Queue.objects.filter(
            exam_id=instance.exam_id,
            state__in=['waiting', 'called', 'ongoing']
        )
        
        if active_queues.exists():
            return Response(
                {'error': '진행 중인 대기열이 있어 비활성화할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.is_active = False
        instance.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)