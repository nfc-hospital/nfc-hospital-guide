from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from datetime import datetime

from authentication.models import User
from .models import PatientState, Queue
from appointments.models import Appointment


class TestEnvironmentPermission(IsAuthenticated):
    """테스트 환경에서만 사용 가능한 권한 클래스"""
    
    def has_permission(self, request, view):
        # 개발/테스트 환경에서만 허용
        if not settings.DEBUG:
            return False
            
        # IsAuthenticated를 먼저 체크
        if not super().has_permission(request, view):
            return False
            
        # 슈퍼유저만 허용
        return request.user.is_superuser


@api_view(['POST'])
@permission_classes([TestEnvironmentPermission])
def set_patient_state(request):
    """
    테스트용 환자 상태 설정 API
    
    이 API는 개발/테스트 환경에서만 활성화되며,
    특정 환자의 상태를 원하는 값으로 강제 설정합니다.
    """
    patient_id = request.data.get('patient_id')
    target_state = request.data.get('target_state')
    clear_appointments = request.data.get('clear_appointments', False)
    
    # 유효성 검사
    if not patient_id or not target_state:
        return Response({
            'error': 'patient_id와 target_state는 필수입니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 유효한 상태값인지 확인
    valid_states = [
        'UNREGISTERED', 'ARRIVED', 'REGISTERED', 'WAITING',
        'CALLED', 'ONGOING', 'COMPLETED', 'PAYMENT', 'FINISHED'
    ]
    
    if target_state not in valid_states:
        return Response({
            'error': f'target_state는 다음 중 하나여야 합니다: {", ".join(valid_states)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            # 환자 조회
            try:
                user = User.objects.get(user_id=patient_id)
            except User.DoesNotExist:
                return Response({
                    'error': f'환자 ID {patient_id}를 찾을 수 없습니다.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # PatientState 업데이트 또는 생성
            patient_state, created = PatientState.objects.update_or_create(
                user=user,
                defaults={
                    'current_state': target_state,
                    'updated_at': datetime.now()
                }
            )
            
            # 기존 예약 삭제 (옵션)
            if clear_appointments:
                # 관련 대기열 먼저 삭제
                Queue.objects.filter(user=user).delete()
                # 예약 삭제
                Appointment.objects.filter(user=user).delete()
            
            # 로그인 상태 설정 (필요한 경우)
            if target_state in ['REGISTERED', 'WAITING', 'CALLED', 'ONGOING', 'COMPLETED', 'PAYMENT']:
                patient_state.is_logged_in = True
                patient_state.login_method = 'test'
                patient_state.save()
            
            return Response({
                'success': True,
                'patient_id': patient_id,
                'current_state': patient_state.current_state,
                'created': created,
                'appointments_cleared': clear_appointments
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'error': f'상태 변경 중 오류 발생: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([TestEnvironmentPermission])
def create_test_appointment(request):
    """
    테스트용 예약 생성 API
    
    특정 환자에게 테스트용 예약을 생성합니다.
    """
    patient_id = request.data.get('patient_id')
    exam_id = request.data.get('exam_id')
    scheduled_time = request.data.get('scheduled_time')
    
    if not all([patient_id, exam_id]):
        return Response({
            'error': 'patient_id와 exam_id는 필수입니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            # 환자 조회
            try:
                user = User.objects.get(user_id=patient_id)
            except User.DoesNotExist:
                return Response({
                    'error': f'환자 ID {patient_id}를 찾을 수 없습니다.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # 예약 생성
            appointment = Appointment.objects.create(
                appointment_id=f"TEST_{patient_id}_{exam_id}_{datetime.now().timestamp()}",
                user=user,
                exam_id=exam_id,
                scheduled_at=scheduled_time or datetime.now(),
                status='scheduled'
            )
            
            return Response({
                'success': True,
                'appointment_id': appointment.appointment_id,
                'exam_id': exam_id,
                'scheduled_at': appointment.scheduled_at
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response({
            'error': f'예약 생성 중 오류 발생: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([TestEnvironmentPermission])
def reset_test_environment(request):
    """
    테스트 환경 초기화 API
    
    모든 테스트 데이터를 초기화합니다.
    """
    try:
        with transaction.atomic():
            # 테스트용 환자 식별 (예: 이메일이 test로 시작하는 환자)
            test_users = User.objects.filter(email__startswith='test@')
            
            # 관련 데이터 삭제
            for user in test_users:
                Queue.objects.filter(user=user).delete()
                Appointment.objects.filter(user=user).delete()
                PatientState.objects.filter(user=user).delete()
            
            return Response({
                'success': True,
                'reset_users': test_users.count()
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'error': f'환경 초기화 중 오류 발생: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)