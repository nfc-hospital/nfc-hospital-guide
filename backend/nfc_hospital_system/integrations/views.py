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

# 시연용 가상 EMR 테스트 API
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def test_patient_list(request):
    """
    시연용 테스트 환자 목록 조회
    GET /api/v1/virtual-db/test/patients
    """
    if request.user.role not in ['super', 'dept']:
        return APIResponse.error(
            message="관리자 권한이 필요합니다.",
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    # 테스트 환자들 조회
    test_patients = PatientState.objects.select_related('user').all()
    
    patient_list = []
    for ps in test_patients:
        patient_list.append({
            'user_id': str(ps.user.user_id),
            'name': ps.user.name,
            'email': ps.user.email,
            'current_state': ps.current_state,
            'current_location': ps.current_location,
            'current_exam': ps.current_exam,
            'updated_at': ps.updated_at.isoformat()
        })
    
    return APIResponse.success(
        data={
            'patients': patient_list,
            'total': len(patient_list)
        },
        message="테스트 환자 목록을 조회했습니다."
    )

@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def test_update_patient_state(request):
    """
    시연용 환자 상태 변경
    PUT /api/v1/virtual-db/test/patient-state
    
    Body:
    {
        "user_id": "uuid",
        "new_state": "WAITING" // 9개 상태 중 하나
    }
    """
    if request.user.role not in ['super', 'dept']:
        return APIResponse.error(
            message="관리자 권한이 필요합니다.",
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
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
@permission_classes([permissions.IsAuthenticated])
def test_simulate_patient_flow(request):
    """
    시연용 환자 흐름 시뮬레이션 (자동 진행)
    POST /api/v1/virtual-db/test/simulate
    
    Body:
    {
        "user_id": "uuid",
        "interval_seconds": 10  // 각 단계 사이 간격 (선택)
    }
    """
    if request.user.role not in ['super', 'dept']:
        return APIResponse.error(
            message="관리자 권한이 필요합니다.",
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
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
@permission_classes([permissions.IsAuthenticated])
def test_reset_all_states(request):
    """
    시연용 모든 테스트 환자 상태 초기화
    POST /api/v1/virtual-db/test/reset
    """
    if request.user.role != 'super':
        return APIResponse.error(
            message="최고 관리자 권한이 필요합니다.",
            code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
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