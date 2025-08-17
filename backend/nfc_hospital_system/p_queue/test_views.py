# p_queue/test_views.py
"""
Cypress E2E 테스트를 위한 테스트 전용 API 엔드포인트
주의: 이 파일은 개발/테스트 환경에서만 사용되어야 합니다.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.db import transaction
from nfc_hospital_system.utils import APIResponse
from p_queue.models import PatientState, Queue, StateTransition
from appointments.models import Appointment, Exam
from datetime import datetime, timezone
import uuid
import functools


def test_environment_only(func):
    """테스트 환경에서만 실행 가능한 데코레이터"""
    @functools.wraps(func)
    def wrapper(request, *args, **kwargs):
        # DEBUG가 False인 경우 접근 차단
        if not settings.DEBUG:
            return APIResponse.error(
                "이 기능은 테스트 환경에서만 사용 가능합니다.",
                code="TEST_ENV_ONLY",
                status_code=403
            )
        
        # 추가 보안: 특정 테스트 헤더 확인
        test_header = request.headers.get('X-Test-Environment')
        if test_header != 'cypress-e2e-test':
            return APIResponse.error(
                "올바른 테스트 환경 헤더가 필요합니다.",
                code="TEST_HEADER_REQUIRED",
                status_code=403
            )
        
        return func(request, *args, **kwargs)
    return wrapper


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@test_environment_only
def set_patient_state(request):
    """환자의 전체 여정 상태를 강제로 변경 (테스트용)"""
    try:
        state = request.data.get('state')
        user_id = request.data.get('user_id') or request.user.user_id
        
        if not state:
            return APIResponse.error("state 파라미터가 필요합니다", code="TEST_001")
        
        # 유효한 상태인지 확인
        valid_states = [
            'UNREGISTERED', 'ARRIVED', 'REGISTERED', 'WAITING',
            'CALLED', 'ONGOING', 'COMPLETED', 'PAYMENT', 'FINISHED'
        ]
        
        if state not in valid_states:
            return APIResponse.error(f"유효하지 않은 상태입니다: {state}", code="TEST_002")
        
        # 트랜잭션으로 감싸서 오류 시 롤백 가능하도록 함
        with transaction.atomic():
            # PatientState 생성 또는 업데이트
            patient_state, created = PatientState.objects.update_or_create(
                user_id=user_id,
                defaults={
                    'current_state': state,
                    'is_logged_in': state != 'UNREGISTERED',
                    'updated_at': datetime.now(timezone.utc)
                }
            )
        
        # 상태 전환 기록
        StateTransition.objects.create(
            user_id=user_id,
            from_state=None if created else patient_state.current_state,
            to_state=state,
            trigger_type='TEST',
            trigger_source='Cypress Test'
        )
        
        return APIResponse.success({
            'user_id': str(user_id),
            'state': state,
            'message': f'환자 상태가 {state}로 변경되었습니다'
        })
        
    except Exception as e:
        return APIResponse.error(f"상태 변경 중 오류: {str(e)}", code="TEST_500")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@test_environment_only
def set_queue_state(request):
    """특정 검사의 대기열 상태를 변경 (테스트용)"""
    try:
        exam_id = request.data.get('exam_id')
        queue_state = request.data.get('queue_state')
        user_id = request.data.get('user_id') or request.user.user_id
        
        if not exam_id or not queue_state:
            return APIResponse.error("exam_id와 queue_state가 필요합니다", code="TEST_003")
        
        # 유효한 큐 상태인지 확인
        valid_queue_states = [
            'waiting', 'called', 'ongoing', 'completed',
            'delayed', 'no_show', 'cancelled'
        ]
        
        if queue_state not in valid_queue_states:
            return APIResponse.error(f"유효하지 않은 큐 상태입니다: {queue_state}", code="TEST_004")
        
        # 해당 검사의 예약 찾기
        appointment = Appointment.objects.filter(
            user_id=user_id,
            exam_id=exam_id
        ).first()
        
        if not appointment:
            # 예약이 없으면 테스트용으로 생성
            appointment = Appointment.objects.create(
                appointment_id=f'test-apt-{uuid.uuid4().hex[:8]}',
                user_id=user_id,
                exam_id=exam_id,
                scheduled_at=datetime.now(timezone.utc),
                status='scheduled'
            )
        
        # 트랜잭션으로 감싸서 안전하게 처리
        with transaction.atomic():
            # Queue 생성 또는 업데이트
            queue, created = Queue.objects.update_or_create(
                user_id=user_id,
                exam_id=exam_id,
                appointment_id=appointment.appointment_id,
                defaults={
                    'state': queue_state,
                    'queue_number': 1,
                    'estimated_wait_time': 10,
                    'priority': 'normal',
                    'updated_at': datetime.now(timezone.utc)
                }
            )
        
        return APIResponse.success({
            'exam_id': exam_id,
            'queue_state': queue_state,
            'queue_id': str(queue.queue_id),
            'message': f'{exam_id} 대기열 상태가 {queue_state}로 변경되었습니다'
        })
        
    except Exception as e:
        return APIResponse.error(f"큐 상태 변경 중 오류: {str(e)}", code="TEST_500")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@test_environment_only
def set_appointments(request):
    """테스트 환자의 당일 예약 정보를 설정 (테스트용)"""
    try:
        appointments_data = request.data.get('appointments', [])
        user_id = request.data.get('user_id') or request.user.user_id
        
        # 트랜잭션으로 모든 작업 감싸기
        with transaction.atomic():
            # 기존 테스트 예약만 삭제 (appointment_id가 'test-'로 시작하는 것만)
            Appointment.objects.filter(
                user_id=user_id,
                appointment_id__startswith='test-'
            ).delete()
        
        created_appointments = []
        
        for apt_data in appointments_data:
            # Exam이 존재하는지 확인, 없으면 생성
            exam, _ = Exam.objects.get_or_create(
                exam_id=apt_data['exam_id'],
                defaults={
                    'title': apt_data.get('exam_name', apt_data['exam_id']),
                    'description': f'{apt_data.get("exam_name", apt_data["exam_id"])} 검사',
                    'department': '테스트과',
                    'building': '본관',
                    'floor': '1F',
                    'room': f'{apt_data["exam_id"]}-room',
                    'average_duration': 30,
                    'buffer_time': 10,
                    'x_coord': 0.0,
                    'y_coord': 0.0
                }
            )
            
            # 예약 생성 (appointment_id가 항상 'test-'로 시작하도록 보장)
            apt_id = apt_data.get('appointment_id', f'test-{uuid.uuid4().hex[:8]}')
            if not apt_id.startswith('test-'):
                apt_id = f'test-{apt_id}'
                
            appointment = Appointment.objects.create(
                appointment_id=apt_id,
                user_id=user_id,
                exam_id=apt_data['exam_id'],
                scheduled_at=apt_data.get('scheduled_at', datetime.now(timezone.utc)),
                status=apt_data.get('status', 'scheduled'),
                arrival_confirmed=False
            )
            
            created_appointments.append({
                'appointment_id': appointment.appointment_id,
                'exam_id': appointment.exam_id,
                'scheduled_at': appointment.scheduled_at.isoformat()
            })
        
        return APIResponse.success({
            'appointments': created_appointments,
            'count': len(created_appointments),
            'message': f'{len(created_appointments)}개의 예약이 설정되었습니다'
        })
        
    except Exception as e:
        return APIResponse.error(f"예약 설정 중 오류: {str(e)}", code="TEST_500")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@test_environment_only
def reset_test_data(request):
    """테스트 데이터 초기화 (테스트용)"""
    try:
        user_id = request.data.get('user_id') or request.user.user_id
        
        # 안전장치: 테스트 사용자인지 확인
        from authentication.models import User
        user = User.objects.get(pk=user_id)
        
        # 테스트 사용자 조건 확인 (다음 중 하나라도 해당하면 테스트 사용자로 간주)
        is_test_user = any([
            user.phone_number == '010-1234-5678',  # 테스트용 전화번호
            user.email.startswith('test') and user.email.endswith('@example.com'),  # 테스트 이메일
            user.name.startswith('테스트'),  # 테스트 이름
            'test' in user.email.lower(),  # 이메일에 test 포함
        ])
        
        if not is_test_user:
            return APIResponse.error(
                "안전장치: 테스트 사용자가 아닙니다. 실제 사용자 데이터는 초기화할 수 없습니다.",
                code="TEST_403",
                status_code=403
            )
        
        # 트랜잭션으로 모든 삭제 작업 감싸기
        with transaction.atomic():
            # 추가 안전장치: 테스트 관련 데이터만 삭제
            # appointment_id가 'test-'로 시작하는 것만 삭제
            test_appointments = Appointment.objects.filter(
                user_id=user_id,
                appointment_id__startswith='test-'
            )
            test_appointment_ids = list(test_appointments.values_list('appointment_id', flat=True))
            
            # 테스트 예약과 연관된 큐만 삭제
            deleted_queues = Queue.objects.filter(
                user_id=user_id,
                appointment_id__in=test_appointment_ids
            ).delete()[0]
            
            # 테스트 예약만 삭제
            deleted_appointments = test_appointments.delete()[0]
            
            # PatientState는 테스트 사용자의 것만 삭제
            PatientState.objects.filter(user_id=user_id).delete()
            
            # StateTransition은 trigger_source가 'Cypress Test'인 것만 삭제
            deleted_transitions = StateTransition.objects.filter(
                user_id=user_id,
                trigger_source='Cypress Test'
            ).delete()[0]
        
        return APIResponse.success({
            'message': '테스트 데이터가 안전하게 초기화되었습니다',
            'deleted': {
                'test_appointments': len(test_appointment_ids),
                'user_phone': user.phone_number  # 확인용
            }
        })
        
    except User.DoesNotExist:
        return APIResponse.error("사용자를 찾을 수 없습니다", code="TEST_404")
    except Exception as e:
        return APIResponse.error(f"데이터 초기화 중 오류: {str(e)}", code="TEST_500")