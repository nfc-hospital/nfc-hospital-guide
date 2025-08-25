from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from datetime import date
from django.utils import timezone

# 수동 JWT 인증 사용
from authentication.jwt_auth import ManualJWTAuthentication

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination

from .models import Exam, ExamPreparation, Appointment, ExamResult, ExamPostCareInstruction
from .serializers import (
    ExamSerializer, ExamPreparationSerializer, AppointmentSerializer,
    ExamListSerializer, ExamResultSerializer, TodayScheduleSerializer,
    ExamPostCareInstructionSerializer
)
from .permissions import IsPatientOwner, IsPatientOrStaff
from p_queue.models import PatientState

# 페이지네이션 설정
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ExamViewSet(viewsets.ModelViewSet):
    # `exam_id`가 PK이므로 queryset은 모든 객체 가져옴
    queryset = Exam.objects.all().order_by('-created_at') # 최신순 정렬
    serializer_class = ExamSerializer
    pagination_class = StandardResultsSetPagination # 페이지네이션 적용
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    # 쿼리 파라미터 필터링
    filterset_fields = {
        'department': ['exact'],
        'is_active': ['exact'],
        'category': ['exact'],
        'building': ['exact'],
        'floor': ['exact'],
        'room': ['exact'],
    }
    
    # 검색 필드 
    search_fields = [
        'title', 'description', 'department', 'category',
        'building', 'floor', 'room'
    ]
    
    # 정렬 필드
    ordering_fields = [
        'title', 'created_at', 'updated_at', 'average_duration',
        'department', 'category', 'building', 'floor', 'room'
    ]

    def get_queryset(self):
        """
        GET /exams 요청 시 is_active=True인 검사만 기본으로 반환.
        관리자는 모든 검사(is_active=False 포함)를 볼 수 있도록 재정의.
        """
        queryset = super().get_queryset()
        
        # 현재 로그인된 사용자가 관리자인지 확인 (request.user.is_staff 사용)
        if not self.request.user.is_staff: 
            queryset = queryset.filter(is_active=True)
            
        return queryset

    def get_permissions(self):
        """
        API 액션에 따른 권한 설정
        - 검사 목록 조회 (GET /exams): 누구나 접근 가능 (is_active=True만)
        - 검사 상세 조회 (GET /exams/{id}): 누구나 접근 가능 (is_active=True만)
        - 검사 생성 (POST /exams): 관리자 전용
        - 검사 수정 (PATCH /exams/{id}): 관리자 전용
        - 검사 삭제 (DELETE /exams/{id}): 관리자 전용
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdminUser] # 관리자만 가능
        else:
            # 목록/상세 조회는 누구나 접근 가능
            self.permission_classes = [] 
        return super().get_permissions()

    # 특정 검사의 준비사항을 별도로 관리하는 API

    @action(detail=True, methods=['post'], url_path='preparations', permission_classes=[IsAdminUser])
    def add_preparation(self, request, pk=None):
        """특정 검사에 준비사항 추가"""
        exam = self.get_object()
        # 여러 준비사항을 한 번에 추가할 수 있도록 many=True 사용
        serializer = ExamPreparationSerializer(data=request.data, many=True)
        if serializer.is_valid():
            # 각각의 준비사항에 exam을 연결하여 저장
            for prep_data in serializer.validated_data:
                ExamPreparation.objects.create(exam=exam, **prep_data)
            # 새로 추가된 준비사항들을 다시 Serializer로 직렬화하여 응답
            return Response(ExamPreparationSerializer(exam.preparations.all(), many=True).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], url_path='preparations/(?P<prep_id>[^/.]+)', permission_classes=[IsAdminUser])
    def update_preparation(self, request, pk=None, prep_id=None):
        """특정 검사의 특정 준비사항 수정"""
        exam = self.get_object()
        try:
            preparation = ExamPreparation.objects.get(exam=exam, prep_id=prep_id)
        except ExamPreparation.DoesNotExist:
            return Response({"detail": "Preparation not found."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = ExamPreparationSerializer(preparation, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path='preparations/(?P<prep_id>[^/.]+)', permission_classes=[IsAdminUser])
    def remove_preparation(self, request, pk=None, prep_id=None):
        """특정 검사의 특정 준비사항 삭제"""
        exam = self.get_object()
        try:
            preparation = ExamPreparation.objects.get(exam=exam, prep_id=prep_id)
            preparation.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ExamPreparation.DoesNotExist:
            return Response({"detail": "Preparation not found."}, status=status.HTTP_404_NOT_FOUND)


class TodaysAppointmentsView(ListAPIView):
    """
    오늘의 예약 목록 API
    GET /api/v1/appointments/today/
    """
    authentication_classes = [ManualJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        today = timezone.now().date()
        queryset = Appointment.objects.filter(
            user=self.request.user,
            scheduled_at__date=today
        )
        
        # exam이 null이 아닌 경우만 select_related 적용
        queryset = queryset.exclude(exam__isnull=True).select_related('exam')
        
        return queryset.order_by('scheduled_at')


class PatientExamViewSet(viewsets.GenericViewSet):
    """
    환자용 검사 관련 API ViewSet
    """
    permission_classes = [IsAuthenticated, IsPatientOwner]
    
    @action(detail=False, methods=['get'], url_path='my-list')
    def my_list(self, request):
        """
        환자 본인의 전체 검사 목록 조회
        GET /api/v1/exams/my-list/
        
        Query Parameters:
        - is_past: true/false (과거/예정 검사 필터링)
        - page: 페이지 번호
        - page_size: 페이지 크기
        """
        queryset = Appointment.objects.filter(
            user=request.user
        ).select_related('exam', 'result').order_by('-scheduled_at')
        
        # 과거/예정 필터링
        is_past = request.query_params.get('is_past', None)
        if is_past is not None:
            today = timezone.now().date()
            if is_past.lower() == 'true':
                # 과거 검사 (오늘 이전)
                queryset = queryset.filter(scheduled_at__date__lt=today)
            else:
                # 예정 검사 (오늘 이후)
                queryset = queryset.filter(scheduled_at__date__gte=today)
        
        # 페이지네이션 적용
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = ExamListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = ExamListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='result')
    def result(self, request, pk=None):
        """
        특정 검사의 결과 조회
        GET /api/v1/exams/{appointment_id}/result/
        
        Note: pk는 appointment_id를 받습니다 (exam_id가 아님)
        """
        try:
            # 환자 본인의 예약인지 확인
            appointment = Appointment.objects.get(
                appointment_id=pk,
                user=request.user
            )
        except Appointment.DoesNotExist:
            return Response(
                {"error": "예약을 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 검사가 완료되었는지 확인
        if appointment.status != 'done':
            return Response(
                {
                    "error": "검사가 아직 완료되지 않았습니다.",
                    "status": appointment.status,
                    "message": "검사 결과는 검사가 완료된 후에 확인할 수 있습니다."
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 검사 결과 조회
        try:
            result = ExamResult.objects.get(appointment=appointment)
            serializer = ExamResultSerializer(result)
            return Response(serializer.data)
        except ExamResult.DoesNotExist:
            return Response(
                {
                    "error": "검사 결과가 아직 등록되지 않았습니다.",
                    "message": "검사 결과가 준비되면 알림을 보내드리겠습니다."
                },
                status=status.HTTP_404_NOT_FOUND
            )

# 중복된 클래스 제거됨 - 129번 줄에 이미 정의되어 있음

class TodayScheduleView(APIView):
    """
    당일 일정 조회 API
    GET /api/v1/schedule/today
    
    API 명세서 v3에 정의된 환자의 전체 여정 정보 제공
    """
    permission_classes = [IsAuthenticated, IsPatientOwner]
    
    def get(self, request):
        """
        환자의 오늘 일정 및 현재 상태 반환
        """
        user = request.user
        today = timezone.now().date()
        
        # 1. 오늘의 예약 조회
        appointments = Appointment.objects.filter(
            user=user,
            scheduled_at__date=today
        ).select_related('exam').prefetch_related('exam__preparations', 'queues').order_by('scheduled_at')
        
        # 2. 환자의 현재 상태 조회 또는 생성
        patient_state, created = PatientState.objects.get_or_create(
            user=user,
            defaults={'current_state': 'UNREGISTERED'}
        )
        
        # 3. 상태 결정 로직
        current_state = self._determine_patient_state(user, appointments, patient_state)
        
        # 4. 다음 행동 안내 메시지 생성
        next_action = self._generate_next_action(current_state, appointments)
        
        # 5. 현재 위치 정보 (NFC 태그 기반)
        current_location = patient_state.current_location
        
        # 6. 응답 데이터 구성 - appointments를 직접 전달 (Model 객체로)
        response_data = {
            'state': current_state,
            'appointments': appointments,  # QuerySet 그대로 전달
            'current_location': current_location,
            'next_action': next_action,
            'timestamp': timezone.now()
        }
        
        serializer = TodayScheduleSerializer(response_data, context={'request': request})
        
        # API 명세서에 맞게 직접 응답 구성
        return Response({
            'appointments': serializer.data.get('appointments', []),
            'state': serializer.data.get('state'),
            'current_location': serializer.data.get('current_location'),
            'next_action': serializer.data.get('next_action'),
            'timestamp': timezone.now().isoformat()
        })
    
    def _determine_patient_state(self, user, appointments, patient_state):
        """
        환자의 현재 상태를 결정하는 로직
        """
        # 이미 저장된 상태가 있으면 우선 사용
        if patient_state.current_state != 'UNREGISTERED':
            # 활성 대기열이 있는지 확인
            active_queue = user.queues.filter(
                state__in=['waiting', 'called', 'ongoing']
            ).first()
            
            if active_queue:
                # 대기열 상태에 따라 환자 상태 매핑
                queue_state_mapping = {
                    'waiting': 'WAITING',
                    'called': 'CALLED',
                    'ongoing': 'ONGOING'
                }
                return queue_state_mapping.get(active_queue.state, patient_state.current_state)
            
            # 모든 예약이 완료되었는지 확인
            if appointments.exists():
                all_completed = all(apt.status == 'done' for apt in appointments)
                if all_completed:
                    # 수납 상태 확인 (여기서는 간단히 PAYMENT로 설정)
                    return 'PAYMENT'
            
            return patient_state.current_state
        
        # 상태가 UNREGISTERED인 경우
        if not appointments.exists():
            return 'UNREGISTERED'
        
        # 도착 확인된 예약이 있는지 확인
        if any(apt.arrival_confirmed for apt in appointments):
            return 'REGISTERED'
        
        return 'UNREGISTERED'
    
    def _generate_next_action(self, state, appointments):
        """
        현재 상태에 따른 다음 행동 안내 메시지 생성
        """
        state_actions = {
            'UNREGISTERED': '병원에 도착하시면 로비의 NFC 태그를 스캔해주세요.',
            'ARRIVED': '접수창구에서 접수를 진행해주세요.',
            'REGISTERED': '오늘의 검사 일정을 확인하고 첫 번째 검사실로 이동해주세요.',
            'WAITING': '잠시만 기다려주세요. 곧 호출될 예정입니다.',
            'CALLED': '검사실로 입장해주세요.',
            'ONGOING': '검사가 진행 중입니다.',
            'COMPLETED': '다음 검사로 이동하거나 수납창구로 가주세요.',
            'PAYMENT': '수납창구에서 수납을 진행해주세요.',
            'FINISHED': '오늘의 모든 일정이 완료되었습니다. 안전하게 귀가하세요.'
        }
        
        # 상태별 기본 메시지
        base_action = state_actions.get(state, '병원 직원에게 문의해주세요.')
        
        # 다음 예약 정보 추가
        if state in ['REGISTERED', 'COMPLETED'] and appointments:
            next_appointment = appointments.filter(status__in=['waiting', 'ongoing']).first()
            if next_appointment:
                time_str = next_appointment.scheduled_at.strftime('%H:%M')
                location = f"{next_appointment.exam.building} {next_appointment.exam.floor}층 {next_appointment.exam.room}"
                base_action = f"{base_action} {time_str} {next_appointment.exam.title}"
        
        return base_action


class ExamPostCareInstructionView(APIView):
    """
    특정 검사의 검사 후 주의사항 조회
    GET /api/v1/appointments/exams/{exam_id}/post-care-instructions/
    """
    permission_classes = []  # 누구나 접근 가능
    
    def get(self, request, exam_id):
        """검사의 주의사항 반환"""
        try:
            # 검사 확인
            exam = Exam.objects.get(exam_id=exam_id, is_active=True)
        except Exam.DoesNotExist:
            return Response(
                {"error": "검사를 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 검사 후 주의사항 조회
        instructions = exam.post_care_instructions.all().order_by('-priority', 'type', 'title')
        serializer = ExamPostCareInstructionSerializer(instructions, many=True)
        
        return Response({
            "success": True,
            "data": {
                "exam_id": exam_id,
                "exam_title": exam.title,
                "post_care_instructions": serializer.data,
                "total_instructions": instructions.count(),
                "critical_instructions": instructions.filter(is_critical=True).count()
            },
            "message": "검사 후 주의사항을 조회했습니다."
        })


class AppointmentPreparationView(APIView):
    """
    특정 예약의 검사 준비사항 조회
    GET /api/v1/appointments/{appointment_id}/preparation
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, appointment_id):
        """예약에 해당하는 검사의 준비사항 반환"""
        try:
            # 환자 본인의 예약인지 확인
            appointment = Appointment.objects.select_related('exam').get(
                appointment_id=appointment_id,
                user=request.user
            )
        except Appointment.DoesNotExist:
            return Response(
                {"error": "예약을 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 검사의 준비사항 조회
        preparations = appointment.exam.preparations.all().order_by('-is_required', 'type', 'title')
        serializer = ExamPreparationSerializer(preparations, many=True)
        
        return Response({
            "success": True,
            "data": {
                "appointment_id": appointment_id,
                "exam_id": appointment.exam.exam_id,
                "exam_title": appointment.exam.title,
                "scheduled_at": appointment.scheduled_at,
                "preparations": serializer.data
            }
        })
