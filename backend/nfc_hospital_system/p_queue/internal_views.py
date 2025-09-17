# p_queue/internal_views.py
"""
챗봇 서버 전용 내부 API 뷰
보안: IP 기반 접근 제어 또는 내부 API 키 인증
"""
import os
import logging
import traceback
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
from .serializers import QueueSerializer, PatientJourneySerializer

# 로깅 설정
logger = logging.getLogger(__name__)


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
    logger.info("\n" + "="*60)
    logger.info("✅ [내부 API 시작] 챗봇 서버로부터 환자 정보 요청 수신")
    logger.info(f"   요청된 User ID: {user_id}")
    logger.info(f"   클라이언트 IP: {request.META.get('REMOTE_ADDR')}")
    
    # 내부 API 키 검증
    if not verify_internal_api_key(request):
        logger.warning("🚨 [내부 API] API 키 인증 실패")
        
        # IP 기반 검증 (선택사항)
        allowed_ips = os.getenv('ALLOWED_INTERNAL_IPS', '127.0.0.1,localhost').split(',')
        client_ip = request.META.get('REMOTE_ADDR')
        
        if client_ip not in allowed_ips:
            logger.error(f"❌ [내부 API] 허용되지 않은 IP: {client_ip}")
            return Response(
                {"error": "Unauthorized access", "detail": "Invalid API key or IP"},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    try:
        # 사용자 조회
        logger.info(f"   사용자 조회 중: {user_id}")
        user = get_object_or_404(User, user_id=user_id, is_active=True)
        logger.info(f"✅ 사용자 찾음: {user.name} (role: {user.role})")
        
        # 환자 상태 조회 또는 생성
        patient_state_obj, created = PatientState.objects.get_or_create(
            user=user,
            defaults={'current_state': 'UNREGISTERED'}
        )
        
        if created:
            logger.info(f"🆕 PatientState 새로 생성: {user.name}")
        else:
            logger.info(f"🔄 기존 PatientState 사용: {patient_state_obj.current_state}")
        
        # PatientJourneySerializer를 사용하여 전체 컨텍스트 직렬화
        logger.info("📦 환자 정보 직렬화(Serialization) 시작...")
        
        try:
            serializer = PatientJourneySerializer(patient_state_obj)
            response_data = serializer.data
            logger.info("✅ 직렬화 성공")
        except Exception as serial_error:
            logger.error(f"❌ 직렬화 오류: {str(serial_error)}")
            logger.error(traceback.format_exc())
            raise serial_error
        
        # 추가 정보 포함
        response_data['timestamp'] = datetime.now().isoformat()
        
        # 응답 데이터 요약 로그
        logger.info("📤 응답 데이터 요약:")
        logger.info(f"   - 환자 상태: {response_data.get('patientState', response_data.get('current_state'))}")
        logger.info(f"   - 예약 수: {len(response_data.get('appointments', []))}")
        logger.info(f"   - 대기열 수: {len(response_data.get('currentQueues', []))}")
        logger.info("="*60 + "\n")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        logger.error(f"❌ [내부 API] 사용자를 찾을 수 없음: {user_id}")
        return Response(
            {"error": "User not found", "user_id": str(user_id)},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error("💥 [내부 API 심각한 오류]", exc_info=True)
        logger.error(f"   오류 타입: {type(e).__name__}")
        logger.error(f"   오류 메시지: {str(e)}")
        logger.error(f"   스택 트레이스:")
        logger.error(traceback.format_exc())
        
        return Response(
            {
                "error": "Internal server error",
                "detail": str(e),
                "type": type(e).__name__
            },
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