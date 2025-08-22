from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from datetime import timedelta
from .models import EmrSyncStatus
from p_queue.models import PatientState
from authentication.models import User
from nfc_hospital_system.utils import APIResponse
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def emr_sync_status(request):
    """EMR 동기화 상태 조회 - 임시 구현"""
    return Response({
        'status': 'success',
        'message': 'EMR 동기화 상태 조회 (임시)',
        'data': []
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def emr_trigger_sync(request):
    """EMR 동기화 트리거 - 임시 구현"""
    return Response({
        'status': 'success',
        'message': 'EMR 동기화 트리거 실행 (임시)'
    })

@api_view(['GET'])
def emr_sync_history(request):
    """EMR 동기화 히스토리 - 임시 구현"""
    return Response({
        'status': 'success',
        'message': 'EMR 동기화 히스토리 (임시)',
        'data': []
    })

@api_view(['GET'])
def emr_mapping_rules(request):
    """EMR 매핑 규칙 - 임시 구현"""
    return Response({
        'status': 'success',
        'message': 'EMR 매핑 규칙 (임시)',
        'data': {}
    })

# 환자별 시나리오 정의 함수
def get_patient_scenario(patient_name, current_state):
    """환자 이름과 현재 상태를 기반으로 시나리오 정보 반환"""
    
    # 환자별 특별 시나리오 정의
    scenarios = {
        '수납대기 테스트': {
            'type': 'payment_flow',
            'description': '수납 처리 시나리오',
            'next_states': ['FINISHED'],
            'scenario_steps': [
                'PAYMENT → 수납 완료 → FINISHED'
            ]
        },
        '완료 테스트': {
            'type': 'completed_flow', 
            'description': '완료된 환자 시나리오',
            'next_states': [],
            'scenario_steps': [
                '모든 검사 완료'
            ]
        },
        '진행중 테스트': {
            'type': 'ongoing_exam',
            'description': '검사 진행 중 시나리오',
            'next_states': ['COMPLETED', 'PAYMENT'],
            'scenario_steps': [
                'ONGOING → 검사 완료 → COMPLETED → PAYMENT → FINISHED'
            ]
        },
        '등록완료 테스트': {
            'type': 'registered_flow',
            'description': '접수 완료 후 대기 시나리오', 
            'next_states': ['WAITING', 'CALLED'],
            'scenario_steps': [
                'REGISTERED → 검사실 도착 → WAITING → CALLED → ONGOING → COMPLETED'
            ]
        },
        '대기중 테스트': {
            'type': 'waiting_flow',
            'description': '대기열 시나리오',
            'next_states': ['CALLED', 'ONGOING'],
            'scenario_steps': [
                'WAITING → 환자 호출 → CALLED → 검사실 입실 → ONGOING'
            ]
        },
        'Cypress 테스트': {
            'type': 'cypress_test',
            'description': 'E2E 테스트용 환자',
            'next_states': ['ARRIVED', 'REGISTERED'],
            'scenario_steps': [
                'UNREGISTERED → NFC 태깅 → ARRIVED → 로그인 → REGISTERED'
            ]
        }
    }
    
    # 기본 시나리오 (환자 이름으로 매칭되지 않는 경우)
    default_scenario = {
        'type': 'standard_flow',
        'description': '표준 환자 여정',
        'scenario_steps': [
            'UNREGISTERED → ARRIVED → REGISTERED → WAITING → CALLED → ONGOING → COMPLETED → PAYMENT → FINISHED'
        ]
    }
    
    # 환자 이름으로 시나리오 매칭
    scenario = scenarios.get(patient_name, default_scenario)
    scenario['current_state'] = current_state
    
    # 바로 전/다음 상태만 추가 (단순화)
    transitions = get_simple_state_transitions(current_state)
    scenario['previous_state'] = transitions['previous']
    scenario['next_state'] = transitions['next']
    
    return scenario

def get_simple_state_transitions(current_state):
    """현재 상태에서 바로 전/다음 상태만 반환 (단순화)"""
    # 상태 순서 정의
    state_order = [
        'UNREGISTERED', 'ARRIVED', 'REGISTERED', 'WAITING', 
        'CALLED', 'ONGOING', 'COMPLETED', 'PAYMENT', 'FINISHED'
    ]
    
    try:
        current_index = state_order.index(current_state)
        
        # 바로 이전 상태
        prev_state = None
        if current_index > 0:
            prev_state = state_order[current_index - 1]
        
        # 바로 다음 상태
        next_state = None
        if current_index < len(state_order) - 1:
            next_state = state_order[current_index + 1]
        
        return {
            'previous': prev_state,
            'next': next_state
        }
    except ValueError:
        return {'previous': None, 'next': None}

# 시연용 가상 EMR 테스트 API
@api_view(['GET'])
@permission_classes([permissions.AllowAny])  # 테스트용으로 권한 완화
def test_patient_list(request):
    """
    시연용 테스트 환자 목록 조회
    GET /api/v1/test/patients
    """
    try:
        # 테스트 환자들 조회 (current_exam도 함께 로드)
        test_patients = PatientState.objects.select_related('user', 'current_exam').all()
        
        patient_list = []
        for ps in test_patients:
            try:
                # 환자별 시나리오 정보 추가
                scenario = get_patient_scenario(ps.user.name, ps.current_state)
                
                # current_exam이 Exam 객체인 경우 직렬화 가능한 형태로 변환
                current_exam_data = None
                if ps.current_exam:
                    current_exam_data = {
                        'exam_id': str(ps.current_exam.exam_id),
                        'title': ps.current_exam.title,
                        'department': ps.current_exam.department
                    }
                
                # 환자의 모든 예약된 검사 조회
                from appointments.models import Appointment
                appointments_data = []
                try:
                    appointments = Appointment.objects.filter(
                        user=ps.user
                    ).select_related('exam').order_by('scheduled_at')
                    
                    for appt in appointments:
                        appointments_data.append({
                            'appointment_id': str(appt.appointment_id),
                            'exam': {
                                'exam_id': str(appt.exam.exam_id),
                                'title': appt.exam.title,
                                'department': appt.exam.department,
                                'room': appt.exam.room,
                                'building': appt.exam.building
                            },
                            'scheduled_at': appt.scheduled_at.isoformat(),
                            'status': appt.status
                        })
                except:
                    pass  # Appointment 없어도 계속 진행
                
                # 환자의 Queue 상태 조회
                from p_queue.models import Queue
                current_queue = None
                queue_data = None
                try:
                    current_queue = Queue.objects.filter(
                        user=ps.user,
                        state__in=['waiting', 'called', 'ongoing']
                    ).select_related('exam').first()
                    
                    if current_queue:
                        queue_data = {
                            'queue_id': str(current_queue.queue_id),
                            'queue_number': current_queue.queue_number,
                            'state': current_queue.state,
                            'priority': current_queue.priority,
                            'exam_title': current_queue.exam.title if current_queue.exam else None,
                            'estimated_wait_time': current_queue.estimated_wait_time
                        }
                except:
                    pass  # Queue 없어도 계속 진행
                
                patient_list.append({
                    'user_id': str(ps.user.user_id),
                    'name': ps.user.name,
                    'email': ps.user.email,
                    'current_state': ps.current_state,
                    'current_location': ps.current_location,
                    'current_exam': current_exam_data,  # 직렬화 가능한 딕셔너리로 변환
                    'appointments': appointments_data,  # 모든 예약된 검사들
                    'current_queue': queue_data,  # Queue 정보 추가
                    'updated_at': ps.updated_at.isoformat(),
                    'scenario': scenario  # 시나리오 정보 추가
                })
            except Exception as e:
                # 개별 환자 처리 중 오류가 있어도 전체 리스트에는 영향 없도록
                logger.warning(f"Error processing patient {ps.user.name}: {str(e)}")
                continue
        
        return APIResponse.success(
            data={
                'patients': patient_list,
                'total': len(patient_list)
            },
            message="테스트 환자 목록을 조회했습니다."
        )
        
    except Exception as e:
        logger.error(f"Test patient list error: {str(e)}")
        return APIResponse.error(
            message=f"환자 목록 조회 중 오류가 발생했습니다: {str(e)}",
            code="FETCH_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PUT'])
@permission_classes([permissions.AllowAny])  # 테스트용으로 권한 완화
def test_update_patient_state(request):
    """
    시연용 환자 상태 변경
    PUT /api/v1/test/patient-state
    
    Body:
    {
        "user_id": "uuid",
        "new_state": "WAITING" // 9개 상태 중 하나
    }
    """
    
    user_id = request.data.get('user_id')
    new_state = request.data.get('new_state')
    
    # 유효한 상태인지 확인
    valid_states = ['UNREGISTERED', 'ARRIVED', 'REGISTERED', 'WAITING', 
                   'CALLED', 'ONGOING', 'COMPLETED', 'PAYMENT', 'FINISHED']
    
    if new_state not in valid_states:
        return APIResponse.error(
            message=f"유효하지 않은 상태입니다. 가능한 값: {', '.join(valid_states)}",
            code="INVALID_STATE",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # PatientState 업데이트
        patient_state = PatientState.objects.get(user_id=user_id)
        old_state = patient_state.current_state
        patient_state.current_state = new_state
        patient_state.save()
        
        # 상태 변경 시그널이 자동으로 WebSocket 알림 전송
        
        return APIResponse.success(
            data={
                'user_id': user_id,
                'old_state': old_state,
                'new_state': new_state,
                'updated_at': patient_state.updated_at.isoformat()
            },
            message=f"환자 상태를 {old_state}에서 {new_state}로 변경했습니다."
        )
        
    except PatientState.DoesNotExist:
        return APIResponse.error(
            message="해당 환자를 찾을 수 없습니다.",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # 테스트용으로 권한 완화
def test_simulate_patient_flow(request):
    """
    시연용 환자 흐름 시뮬레이션 (자동 진행)
    POST /api/v1/test/simulate
    
    Body:
    {
        "user_id": "uuid",
        "interval_seconds": 10  // 각 단계 사이 간격 (선택)
    }
    """
    
    user_id = request.data.get('user_id')
    
    try:
        patient_state = PatientState.objects.get(user_id=user_id)
        
        # 다음 상태 매핑
        next_state_map = {
            'UNREGISTERED': 'ARRIVED',
            'ARRIVED': 'REGISTERED',
            'REGISTERED': 'WAITING',
            'WAITING': 'CALLED',
            'CALLED': 'ONGOING',
            'ONGOING': 'COMPLETED',
            'COMPLETED': 'PAYMENT',
            'PAYMENT': 'FINISHED',
            'FINISHED': 'FINISHED'  # 마지막 상태는 유지
        }
        
        current = patient_state.current_state
        next_state = next_state_map.get(current, current)
        
        if current != next_state:
            patient_state.current_state = next_state
            patient_state.save()
            
            return APIResponse.success(
                data={
                    'user_id': user_id,
                    'previous_state': current,
                    'current_state': next_state,
                    'is_final': next_state == 'FINISHED'
                },
                message=f"환자가 {current}에서 {next_state}로 진행했습니다."
            )
        else:
            return APIResponse.success(
                data={
                    'user_id': user_id,
                    'current_state': current,
                    'is_final': True
                },
                message="이미 최종 상태(FINISHED)입니다."
            )
            
    except PatientState.DoesNotExist:
        return APIResponse.error(
            message="해당 환자를 찾을 수 없습니다.",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # 테스트용으로 권한 완화
def test_reset_all_states(request):
    """
    시연용 모든 테스트 환자 상태 초기화
    POST /api/v1/test/reset
    """
    
    # 모든 환자 상태를 REGISTERED로 초기화
    count = PatientState.objects.update(
        current_state='REGISTERED',
        current_location=None,
        current_exam=None
    )
    
    return APIResponse.success(
        data={
            'reset_count': count
        },
        message=f"{count}명의 환자 상태를 초기화했습니다."
    )

@api_view(['PUT'])
@permission_classes([permissions.AllowAny])  # 테스트용으로 권한 완화
def test_update_queue_state(request):
    """
    시연용 Queue 상태 변경 + 환자 상태 자동 연동
    PUT /api/v1/test/queue-state
    
    Body:
    {
        "queue_id": "uuid",
        "new_state": "called" // waiting, called, ongoing, completed 중 하나
    }
    """
    queue_id = request.data.get('queue_id')
    new_state = request.data.get('new_state')
    
    # 유효한 Queue 상태인지 확인
    valid_queue_states = ['waiting', 'called', 'ongoing', 'completed', 'cancelled', 'no_show']
    
    if new_state not in valid_queue_states:
        return APIResponse.error(
            message=f"유효하지 않은 Queue 상태입니다. 가능한 값: {', '.join(valid_queue_states)}",
            code="INVALID_QUEUE_STATE",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        from p_queue.models import Queue
        # Queue 업데이트
        queue = Queue.objects.get(queue_id=queue_id)
        old_queue_state = queue.state
        queue.state = new_state
        
        if new_state == 'called':
            from django.utils import timezone
            queue.called_at = timezone.now()
        
        queue.save()
        
        # 큐 상태에 따라 환자 상태도 자동 업데이트
        patient_state = PatientState.objects.get(user=queue.user)
        old_patient_state = patient_state.current_state
        
        # 큐 상태 -> 환자 상태 매핑
        queue_to_patient_state = {
            'waiting': 'WAITING',
            'called': 'CALLED', 
            'ongoing': 'ONGOING',
            'completed': 'COMPLETED'
        }
        
        if new_state in queue_to_patient_state:
            new_patient_state = queue_to_patient_state[new_state]
            patient_state.current_state = new_patient_state
            patient_state.current_exam = queue.exam  # 현재 검사도 업데이트
            patient_state.save()
        
        return APIResponse.success(
            data={
                'queue_id': queue_id,
                'old_queue_state': old_queue_state,
                'new_queue_state': new_state,
                'queue_number': queue.queue_number,
                'old_patient_state': old_patient_state,
                'new_patient_state': patient_state.current_state,
                'auto_updated': True
            },
            message=f"Queue 상태를 {old_queue_state}에서 {new_state}로, 환자 상태를 {old_patient_state}에서 {patient_state.current_state}로 변경했습니다."
        )
        
    except Queue.DoesNotExist:
        return APIResponse.error(
            message="해당 Queue를 찾을 수 없습니다.",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )
    except PatientState.DoesNotExist:
        return APIResponse.error(
            message="해당 환자 상태를 찾을 수 없습니다.",
            code="PATIENT_STATE_NOT_FOUND", 
            status_code=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def test_add_exam_to_patient(request):
    """
    시연용 환자에게 검사/진료 추가 
    POST /api/v1/test/add-exam
    
    Body:
    {
        "user_id": "uuid",
        "exam_id": "exam_uuid", 
        "scheduled_for": "today|tomorrow|yesterday" // 편의 옵션
    }
    """
    user_id = request.data.get('user_id')
    exam_id = request.data.get('exam_id')
    scheduled_for = request.data.get('scheduled_for', 'today')
    
    try:
        user = User.objects.get(user_id=user_id)
        
        from appointments.models import Exam, Appointment
        exam = Exam.objects.get(exam_id=exam_id)
        
        # 스케줄 시간 설정
        from datetime import datetime, timedelta
        now = timezone.now()
        if scheduled_for == 'today':
            scheduled_time = now.replace(hour=14, minute=0, second=0, microsecond=0)
        elif scheduled_for == 'tomorrow':
            scheduled_time = (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
        elif scheduled_for == 'yesterday':
            scheduled_time = (now - timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0)
        else:
            scheduled_time = now
        
        # appointment_id를 UUID로 생성
        import uuid as uuid_module
        appointment_id = str(uuid_module.uuid4())
        
        # Appointment 생성
        appointment = Appointment.objects.create(
            appointment_id=appointment_id,
            user=user,
            exam=exam,
            scheduled_at=scheduled_time,
            status='scheduled' if scheduled_for in ['today', 'tomorrow'] else 'completed'
        )
        
        # 오늘 검사인 경우 Queue도 생성
        if scheduled_for == 'today':
            from p_queue.models import Queue
            try:
                queue = Queue.objects.create(
                    appointment=appointment,
                    user=user,
                    exam=exam,
                    queue_number=Queue.get_next_queue_number(exam),
                    state='waiting'
                )
            except Exception as queue_error:
                logger.error(f"Queue creation failed: {str(queue_error)}")
                # Queue 생성에 실패해도 appointment는 유지
            
            # 환자 상태도 업데이트
            patient_state, created = PatientState.objects.get_or_create(user=user)
            patient_state.current_exam = exam
            if patient_state.current_state in ['UNREGISTERED', 'ARRIVED', 'REGISTERED']:
                patient_state.current_state = 'WAITING'
            patient_state.save()
        
        return APIResponse.success(
            data={
                'appointment_id': str(appointment.appointment_id),
                'exam_title': exam.title,
                'scheduled_at': appointment.scheduled_at.isoformat(),
                'status': appointment.status
            },
            message=f"{user.name}님에게 {exam.title} 검사를 추가했습니다."
        )
        
    except User.DoesNotExist:
        return APIResponse.error(message="환자를 찾을 수 없습니다.", code="USER_NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)
    except Exam.DoesNotExist:
        return APIResponse.error(message="검사를 찾을 수 없습니다.", code="EXAM_NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Add exam to patient error: {str(e)}")
        return APIResponse.error(
            message=f"검사 추가 중 오류가 발생했습니다: {str(e)}",
            code="ADD_EXAM_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_get_available_exams(request):
    """
    시연용 사용 가능한 검사/진료 목록 조회
    GET /api/v1/test/available-exams
    """
    try:
        from appointments.models import Exam
        exams = Exam.objects.filter(is_active=True).order_by('department', 'title')
        
        exam_list = []
        for exam in exams:
            exam_list.append({
                'exam_id': str(exam.exam_id),
                'title': exam.title,
                'department': exam.department,
                'room': exam.room,
                'building': exam.building,
                'floor': exam.floor
            })
        
        return APIResponse.success(
            data={'exams': exam_list},
            message=f"{len(exam_list)}개의 검사를 조회했습니다."
        )
        
    except Exception as e:
        return APIResponse.error(
            message=f"검사 목록 조회 중 오류가 발생했습니다: {str(e)}",
            code="FETCH_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )