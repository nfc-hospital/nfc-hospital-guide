# p_queue/internal_views.py
"""
챗봇 서버 전용 내부 API 뷰
보안: IP 기반 접근 제어 또는 내부 API 키 인증
"""
import os
from datetime import datetime, date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404

from authentication.models import User
from appointments.models import Appointment
from appointments.serializers import AppointmentSerializer
from .models import Queue, PatientState, QueueDetailState
from .serializers import QueueSerializer


def verify_internal_api_key(request):
    """내부 API 키 검증"""
    api_key = request.headers.get('X-Internal-Api-Key')
    expected_key = os.getenv('INTERNAL_API_KEY', 'internal-secret-key')
    return api_key == expected_key


@api_view(['GET'])
@authentication_classes([])  # JWT 인증 건너뛰기
@permission_classes([AllowAny])  # 권한 체크 건너뛰기 (IP/API키로 대체)
def get_patient_context(request, user_id):
    """
    챗봇 서버용 환자 컨텍스트 조회
    
    Returns:
        - patient_state: 현재 환자 상태 (9단계 여정)
        - current_queues: 현재 대기중인 큐 목록
        - todays_appointments: 오늘 예약 목록
        - current_location: 현재 위치 정보
    """
    # 내부 API 키 검증
    if not verify_internal_api_key(request):
        # IP 기반 검증 (선택사항)
        allowed_ips = os.getenv('ALLOWED_INTERNAL_IPS', '127.0.0.1,localhost').split(',')
        client_ip = request.META.get('REMOTE_ADDR')
        
        if client_ip not in allowed_ips:
            return Response(
                {"error": "Unauthorized access"},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    try:
        # 사용자 조회
        user = get_object_or_404(User, user_id=user_id, is_active=True)
        
        # 환자 상태 조회
        patient_state_obj = PatientState.objects.filter(user=user).first()
        patient_state = patient_state_obj.current_state if patient_state_obj else 'UNREGISTERED'
        
        # 현재 대기중인 큐 조회 (대기중 또는 호출된 상태)
        current_queues = Queue.objects.filter(
            user=user,
            state__in=['waiting', 'called', QueueDetailState.IN_PROGRESS]
        ).select_related('exam', 'appointment').order_by('created_at')
        
        # 오늘 예약 목록 조회
        today = date.today()
        todays_appointments = Appointment.objects.filter(
            user=user,
            scheduled_at__date=today
        ).select_related('exam').order_by('scheduled_at')
        
        # 현재 위치 정보 (있다면)
        current_location = None
        if patient_state_obj and patient_state_obj.current_location:
            current_location = {
                "location_id": patient_state_obj.current_location,
                "description": get_location_description(patient_state_obj.current_location)
            }
        
        # 응답 데이터 구성
        response_data = {
            "user": {
                "user_id": str(user.user_id),
                "name": user.name,
                "role": user.role,
                "patient_id": user.patient_id
            },
            "patient_state": patient_state,
            "current_queues": QueueSerializer(current_queues, many=True).data,
            "todays_appointments": AppointmentSerializer(todays_appointments, many=True).data,
            "current_location": current_location,
            "timestamp": datetime.now().isoformat()
        }
        
        # 대기시간 예측 정보 추가
        if current_queues.exists():
            active_queue = current_queues.first()
            response_data["wait_info"] = {
                "queue_number": active_queue.queue_number,
                "estimated_wait_time": active_queue.estimated_wait_time,
                "people_ahead": Queue.objects.filter(
                    exam=active_queue.exam,
                    state='waiting',
                    queue_number__lt=active_queue.queue_number
                ).count(),
                "exam_name": active_queue.exam.title if active_queue.exam else "검사",
                "exam_location": get_exam_location(active_queue.exam) if active_queue.exam else None
            }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def get_location_description(location_id):
    """위치 ID를 읽기 쉬운 설명으로 변환"""
    # 실제 구현에서는 Location 모델에서 조회
    location_map = {
        "main_1f_lobby": "본관 1층 로비",
        "main_2f_lab": "본관 2층 검사실",
        "main_3f_radiology": "본관 3층 영상의학과",
        "annex_1f_payment": "별관 1층 수납창구"
    }
    return location_map.get(location_id, location_id)


def get_exam_location(exam):
    """검사 위치 정보 반환"""
    if not exam:
        return None
    
    location = f"{exam.building or '본관'} {exam.floor or ''}층"
    if exam.room:
        location += f" {exam.room}"
    return location.strip()