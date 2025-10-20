from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from datetime import timedelta
from .models import EmrSyncStatus
from p_queue.models import PatientState
from authentication.models import User
from nfc.models import NFCTag, FacilityRoute
from hospital_navigation.models import HospitalMap, NavigationNode, DepartmentZone
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

# 병원 내 주요 위치 정의
HOSPITAL_LOCATIONS = {
    # 주요 시설
    '정문': {'building': '본관', 'floor': '1층', 'room': '정문 로비', 'x': 100, 'y': 400, 'icon': '🏥'},
    '원무과': {'building': '본관', 'floor': '1층', 'room': '원무과 접수처', 'x': 450, 'y': 240, 'icon': '💳'},
    '로비': {'building': '본관', 'floor': '1층', 'room': '중앙 로비', 'x': 250, 'y': 400, 'icon': '🏛️'},
    '안내데스크': {'building': '본관', 'floor': '1층', 'room': '안내데스크', 'x': 450, 'y': 200, 'icon': '💁‍♀️'},
    '응급실': {'building': '본관', 'floor': '1층', 'room': '응급의료센터', 'x': 220, 'y': 280, 'icon': '🚨'},
    '약국': {'building': '본관', 'floor': '1층', 'room': '원내약국', 'x': 780, 'y': 280, 'icon': '💊'},
    '수납창구': {'building': '본관', 'floor': '1층', 'room': '수납처', 'x': 200, 'y': 450, 'icon': '💳'},
    
    # 검사실
    '채혈실': {'building': '본관', 'floor': '1층', 'room': '채혈실', 'x': 675, 'y': 160, 'icon': '🩸'},
    '채혈실 대기실': {'building': '본관', 'floor': '1층', 'room': '채혈실 대기실', 'x': 340, 'y': 210, 'icon': '🪑'},
    '소변검사실': {'building': '본관', 'floor': '1층', 'room': '소변검사실', 'x': 400, 'y': 200, 'icon': '🧪'},
    '진단검사의학과': {'building': '본관', 'floor': '1층', 'room': '진단검사의학과', 'x': 480, 'y': 160, 'icon': '🧪'},
    
    # X-ray/CT/MRI
    'X-ray실': {'building': '암센터', 'floor': '2층', 'room': 'X-ray실', 'x': 145, 'y': 435, 'icon': '📷'},
    'CT실': {'building': '암센터', 'floor': '2층', 'room': 'CT실', 'x': 360, 'y': 270, 'icon': '🔍'},
    'MRI실': {'building': '암센터', 'floor': '2층', 'room': 'MRI실', 'x': 560, 'y': 270, 'icon': '🧲'},
    '초음파실': {'building': '암센터', 'floor': '2층', 'room': '초음파실', 'x': 335, 'y': 430, 'icon': '📡'},
    '영상의학과': {'building': '암센터', 'floor': '2층', 'room': '영상의학과', 'x': 150, 'y': 110, 'icon': '📷'},
    
    # 진료과
    '내과': {'building': '본관', 'floor': '2층', 'room': '내과 진료실', 'x': 215, 'y': 290, 'icon': '🏥'},
    '내과 대기실': {'building': '본관', 'floor': '2층', 'room': '내과 대기실', 'x': 250, 'y': 200, 'icon': '🏥'},
    '정형외과': {'building': '별관', 'floor': '1층', 'room': '정형외과', 'x': 300, 'y': 200, 'icon': '🦴'},
    '재활의학과': {'building': '별관', 'floor': '1층', 'room': '재활의학과', 'x': 500, 'y': 200, 'icon': '🏃‍♂️'},
    '이비인후과': {'building': '본관', 'floor': '2층', 'room': '이비인후과', 'x': 735, 'y': 175, 'icon': '👂'},
    
    # 편의시설
    '편의점': {'building': '본관', 'floor': '1층', 'room': '편의점', 'x': 570, 'y': 280, 'icon': '🏪'},
    '카페': {'building': '본관', 'floor': '1층', 'room': '카페', 'x': 570, 'y': 360, 'icon': '☕'},
    '은행': {'building': '본관', 'floor': '1층', 'room': '은행', 'x': 680, 'y': 280, 'icon': '🏦'},
}

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
            'type': 'in_progress_exam',
            'description': '검사 진행 중 시나리오',
            'next_states': ['WAITING', 'PAYMENT'],
            'scenario_steps': [
                'IN_PROGRESS → 검사 완료 → WAITING (다음 검사) 또는 PAYMENT (모두 완료)'
            ]
        },
        '등록완료 테스트': {
            'type': 'registered_flow',
            'description': '접수 완료 후 대기 시나리오',
            'next_states': ['WAITING', 'CALLED'],
            'scenario_steps': [
                'REGISTERED → 검사실 도착 → WAITING → CALLED → IN_PROGRESS'
            ]
        },
        '대기중 테스트': {
            'type': 'waiting_flow',
            'description': '대기열 시나리오',
            'next_states': ['CALLED', 'IN_PROGRESS'],
            'scenario_steps': [
                'WAITING → 환자 호출 → CALLED → 검사실 입실 → IN_PROGRESS'
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
        'description': '표준 환자 여정 (8단계)',
        'scenario_steps': [
            'UNREGISTERED → ARRIVED → REGISTERED → WAITING → CALLED → IN_PROGRESS → PAYMENT → FINISHED'
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
    # 상태 순서 정의 (8단계 - COMPLETED 제거, IN_PROGRESS로 통일)
    state_order = [
        'UNREGISTERED', 'ARRIVED', 'REGISTERED', 'WAITING',
        'CALLED', 'IN_PROGRESS', 'PAYMENT', 'FINISHED'
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

# ==================== Queue 관리 헬퍼 함수들 ====================

def find_next_pending_appointment(user_id, today):
    """
    완료되지 않은 다음 예약 찾기

    Args:
        user_id: 사용자 ID
        today: 검색할 날짜

    Returns:
        다음 예약 객체 또는 None
    """
    from appointments.models import Appointment

    # 🔍 전체 당일 예약 조회
    all_today_appointments = Appointment.objects.filter(
        user__user_id=user_id,
        scheduled_at__date=today
    ).order_by('created_at')

    # 🔍 완료되지 않은 예약만 필터링
    # examined = 검사 완료, completed = 예약 완료, 나머지는 취소/부재
    FINAL_STATUSES = ['completed', 'examined', 'cancelled', 'no_show']
    pending_appointments = all_today_appointments.exclude(
        status__in=FINAL_STATUSES
    )

    print(f"[DEBUG HELPER] 📋 전체 당일 예약 수: {all_today_appointments.count()}")
    print(f"[DEBUG HELPER] ⏳ 대기 중인 예약 수: {pending_appointments.count()}")
    for apt in pending_appointments:
        print(f"[DEBUG HELPER]   → {apt.appointment_id}: {apt.exam.title} (status={apt.status})")

    return pending_appointments.first()


def ensure_queue_for_appointment(appointment, user, today):
    """
    Appointment에 대한 Queue가 있는지 확인하고 없으면 생성
    중복 Queue가 있으면 정리

    Args:
        appointment: Appointment 객체
        user: User 객체
        today: 날짜

    Returns:
        Queue 객체
    """
    from p_queue.models import Queue
    from datetime import datetime, time

    # ✅ 타임존 안전한 날짜 범위 계산
    today_start = timezone.make_aware(datetime.combine(today, time.min))
    today_end = timezone.make_aware(datetime.combine(today, time.max))

    # ⚠️ 중요: 전체 Queue 테이블에서 확인 (활성 상태만)
    existing_queues = Queue.objects.filter(
        appointment_id=appointment.appointment_id,
        user__user_id=user.user_id,
        created_at__gte=today_start,
        created_at__lte=today_end,
        state__in=['waiting', 'called', 'in_progress']  # 활성 상태만
    )

    existing_count = existing_queues.count()
    print(f"[DEBUG HELPER]   → 기존 활성 Queue 개수: {existing_count}")

    if existing_count > 1:
        # 중복 Queue가 있으면 오래된 것들 삭제
        print(f"[DEBUG HELPER]   ⚠️ 중복 Queue 발견! {existing_count}개 중 최신 것만 유지")
        latest_queue = existing_queues.order_by('-created_at').first()
        deleted_count = existing_queues.exclude(queue_id=latest_queue.queue_id).delete()[0]
        print(f"[DEBUG HELPER]   → {deleted_count}개 중복 Queue 삭제")

        # 최신 Queue 상태 업데이트
        old_state = latest_queue.state
        latest_queue.state = 'waiting'
        latest_queue.save()
        print(f"[DEBUG HELPER]   → {latest_queue.exam.title} 상태를 {old_state} → waiting으로 변경")
        return latest_queue

    elif existing_count == 1:
        # Queue가 정확히 1개 있으면 재사용 (상태만 업데이트)
        queue = existing_queues.first()
        old_state = queue.state
        if old_state != 'waiting':
            queue.state = 'waiting'
            queue.save()
            print(f"[DEBUG HELPER]   → 기존 Queue 재사용: {queue.exam.title} ({old_state} → waiting)")
        else:
            print(f"[DEBUG HELPER]   → 기존 Queue 재사용: {queue.exam.title} (이미 waiting)")
        return queue

    else:
        # Queue가 없으면 새로 생성
        queue = Queue.objects.create(
            appointment=appointment,
            user=user,
            exam=appointment.exam,
            queue_number=Queue.get_next_queue_number(appointment.exam),
            state='waiting',
            priority='normal',
            estimated_wait_time=0
        )
        print(f"[DEBUG HELPER]   → Queue {queue.exam.title} 새로 생성 (waiting)")
        print(f"[DEBUG HELPER]   → 생성된 Queue ID: {queue.queue_id}, state={queue.state}")
        return queue

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
        # 특정 전화번호만 필터링 (EMR환자 제외)
        test_phone_numbers = [
            '010-1234-5678',  # 관리자
            '010-2222-2222',  # 관리자
            '010-1111-1111',  # 등록완료 테스트
            '010-3333-3333',  # 진행중 테스트
        ]

        test_patients = PatientState.objects.select_related('user', 'current_exam').filter(
            user__phone_number__in=test_phone_numbers
        )
        
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
                from p_queue.models import Queue
                from django.db.models import Prefetch
                appointments_data = []
                try:
                    # ✅ N+1 쿼리 제거: prefetch_related로 Queue 미리 로드
                    # ✅ 오늘 날짜 필터 추가 (성능 최적화)
                    from django.utils import timezone
                    today = timezone.now().date()

                    appointments = Appointment.objects.filter(
                        user=ps.user,
                        scheduled_at__date=today
                    ).select_related('exam').prefetch_related(
                        Prefetch(
                            'queues',  # ✅ related_name='queues'로 수정
                            queryset=Queue.objects.filter(created_at__date=today)
                        )
                    ).order_by('created_at')

                    for appt in appointments:
                        # ✅ 이미 prefetch된 Queue 사용 (추가 DB 쿼리 없음)
                        queue_for_appt = appt.queues.first() if hasattr(appt, 'queues') else None

                        # Queue 상태가 있으면 그것을 우선, 없으면 Appointment 상태 사용
                        actual_status = queue_for_appt.state if queue_for_appt else appt.status

                        # Queue 정보 구조화
                        queue_info = None
                        if queue_for_appt:
                            queue_info = {
                                'queue_id': str(queue_for_appt.queue_id),
                                'state': queue_for_appt.state,
                                'queue_number': queue_for_appt.queue_number
                            }

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
                            'status': actual_status,  # Queue 상태 우선 반환
                            'queue_id': str(queue_for_appt.queue_id) if queue_for_appt else None,
                            'queue_info': queue_info  # ✅ Frontend에서 사용하는 queue_info 추가
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
                        state__in=['waiting', 'called', 'in_progress']
                    ).select_related('exam').first()
                    
                    if current_queue:
                        queue_data = {
                            'queue_id': str(current_queue.queue_id),
                            'queue_number': current_queue.queue_number,
                            'state': current_queue.state,
                            'priority': current_queue.priority,
                            'exam_title': current_queue.exam.title if current_queue.exam else None,
                            'estimated_wait_time': current_queue.estimated_wait_time,
                            'appointment_id': str(current_queue.appointment_id) if current_queue.appointment_id else None
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
    시연용 환자 상태 변경 + Queue 상태 자동 동기화
    PUT /api/v1/test/patient-state

    Body:
    {
        "user_id": "uuid",
        "new_state": "WAITING" // 8개 상태 중 하나
    }

    ✨ Queue 동기화 로직:
    - UNREGISTERED/ARRIVED: Queue 영향 없음 (검사 전)
    - REGISTERED: 모든 Queue를 waiting으로 초기화
    - WAITING: 모든 in_progress Queue를 waiting으로 변경
    - CALLED: 첫 waiting Queue를 called로 변경
    - IN_PROGRESS: 첫 called/waiting Queue를 in_progress로 (나머지는 waiting)
    - PAYMENT: 모든 Queue를 completed로 변경
    - FINISHED: 모든 Queue를 completed로 변경
    """

    user_id = request.data.get('user_id')
    new_state = request.data.get('new_state')

    # 🔍 함수 진입 로그
    print(f"\n[DEBUG TEST API] ==================== API 호출 시작 ====================")
    print(f"[DEBUG TEST API] 📞 함수: test_update_patient_state")
    print(f"[DEBUG TEST API] 👤 user_id: {user_id}")
    print(f"[DEBUG TEST API] 🔄 요청된 상태: {new_state}")

    # 유효한 상태인지 확인 (8단계 - COMPLETED 제거, IN_PROGRESS로 통일)
    valid_states = ['UNREGISTERED', 'ARRIVED', 'REGISTERED', 'WAITING',
                   'CALLED', 'IN_PROGRESS', 'PAYMENT', 'FINISHED']

    if new_state not in valid_states:
        return APIResponse.error(
            message=f"유효하지 않은 상태입니다. 가능한 값: {', '.join(valid_states)}",
            code="INVALID_STATE",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    try:
        from p_queue.models import Queue
        from appointments.models import Appointment

        # PatientState 조회 (아직 변경하지 않음!)
        patient_state = PatientState.objects.get(user_id=user_id)
        old_state = patient_state.current_state

        # ✅ Queue 동기화 후에 최종 상태를 결정 (자동 분기 로직 대응)
        final_state = new_state  # 기본값은 요청된 상태

        # 🔄 Queue 동기화 로직
        queues_updated = 0
        sync_message = ""

        # ✅ 환자의 오늘 Queue만 조회 (성능 최적화: 날짜 필터링)
        from django.utils import timezone
        today = timezone.now().date()
        user_queues = Queue.objects.filter(
            user__user_id=user_id,
            created_at__date=today
        ).order_by('created_at')

        # 🆕 상태 되돌림 로직 (PAYMENT/FINISHED → 이전 단계)
        if old_state in ['PAYMENT', 'FINISHED'] and new_state in ['UNREGISTERED', 'ARRIVED', 'REGISTERED', 'WAITING', 'CALLED', 'IN_PROGRESS']:
            print(f"[DEBUG TEST API] 🔙 {old_state}에서 {new_state}로 되돌림 - 검사 상태 복구")

            # 1단계: 모든 completed Queue를 waiting으로 복구
            completed_queues = user_queues.filter(state='completed')
            restored_count = 0
            for queue in completed_queues:
                queue.state = 'waiting'
                queue.save()

                # Appointment도 함께 복구
                if queue.appointment:
                    queue.appointment.status = 'scheduled'
                    queue.appointment.save()
                    print(f"[DEBUG TEST API]   → Queue {queue.exam.title}: completed → waiting")
                    print(f"[DEBUG TEST API]   → Appointment {queue.appointment.appointment_id}: examined → scheduled")

                restored_count += 1

            print(f"[DEBUG TEST API] ✅ {restored_count}개 검사를 waiting으로 복구")

            # 2단계: new_state에 따라 검사 상태 조정
            if new_state in ['UNREGISTERED', 'ARRIVED']:
                # 검사 전 단계 - current_exam 초기화만
                patient_state.current_exam = None
                sync_message = f"{restored_count}개 검사를 waiting으로 복구했습니다 (검사 전 단계)."
            elif new_state == 'REGISTERED':
                # 접수 완료 단계 - current_exam 초기화
                patient_state.current_exam = None
                sync_message = f"{restored_count}개 검사를 waiting으로 복구했습니다 (접수 완료)."
            elif new_state != 'WAITING':
                # CALLED/IN_PROGRESS로 되돌림 - user_queues 재조회
                user_queues = Queue.objects.filter(
                    user__user_id=user_id,
                    created_at__date=today
                ).order_by('created_at')

                first_queue = user_queues.filter(state='waiting').first()
                if first_queue:
                    if new_state == 'CALLED':
                        first_queue.state = 'called'
                        first_queue.called_at = timezone.now()
                    elif new_state == 'IN_PROGRESS':
                        first_queue.state = 'in_progress'

                    first_queue.save()

                    # current_exam 설정
                    patient_state.current_exam = first_queue.exam

                    print(f"[DEBUG TEST API]   → 첫 번째 검사({first_queue.exam.title})를 {new_state.lower()}로 변경")
                    sync_message = f"{restored_count}개 검사를 복구하고, 첫 번째 검사를 {new_state}로 변경했습니다."
                else:
                    sync_message = f"{restored_count}개 검사를 waiting으로 복구했습니다."
            else:
                # WAITING으로 되돌림 - 첫 번째 검사를 current_exam으로 설정
                first_queue = user_queues.filter(state='waiting').first()
                if first_queue:
                    patient_state.current_exam = first_queue.exam
                sync_message = f"{restored_count}개 검사를 waiting으로 복구했습니다."

            queues_updated = restored_count

        # 🆕 IN_PROGRESS/CALLED → 이전 단계 되돌림
        elif old_state == 'IN_PROGRESS' and new_state in ['CALLED', 'WAITING']:
            print(f"[DEBUG TEST API] 🔙 IN_PROGRESS에서 {new_state}로 되돌림")

            in_progress_queues = user_queues.filter(state='in_progress')
            for queue in in_progress_queues:
                if new_state == 'CALLED':
                    queue.state = 'called'
                else:
                    queue.state = 'waiting'
                queue.save()

                # Appointment도 함께 복구
                if queue.appointment:
                    queue.appointment.status = 'scheduled' if new_state == 'WAITING' else 'waiting'
                    queue.appointment.save()

                print(f"[DEBUG TEST API]   → Queue {queue.exam.title}: in_progress → {queue.state}")

            queues_updated = in_progress_queues.count()
            sync_message = f"{queues_updated}개 검사를 {new_state.lower()}로 되돌렸습니다."

        # 🆕 CALLED → WAITING 되돌림
        elif old_state == 'CALLED' and new_state == 'WAITING':
            print(f"[DEBUG TEST API] 🔙 CALLED에서 WAITING으로 되돌림")

            called_queues = user_queues.filter(state='called')
            for queue in called_queues:
                queue.state = 'waiting'
                queue.save()

                if queue.appointment:
                    queue.appointment.status = 'scheduled'
                    queue.appointment.save()

            queues_updated = called_queues.count()
            sync_message = f"{queues_updated}개 검사를 waiting으로 되돌렸습니다."

        elif new_state == 'UNREGISTERED' or new_state == 'ARRIVED':
            # 검사 전 단계 - Queue에 영향 없음
            print(f"[DEBUG TEST API] ⚪ {new_state} 상태 - Queue 영향 없음")
            sync_message = "검사 전 단계입니다. Queue 상태 변경 없음."

        elif new_state == 'REGISTERED':
            # 접수 완료 - 모든 Queue를 waiting으로 초기화 (자동 시작하지 않음)
            print(f"[DEBUG TEST API] 📝 REGISTERED 상태 전환 - 접수 완료")

            # ✅ 당일 예약을 pending → scheduled로 변경
            appointments_updated = Appointment.objects.filter(
                user=patient_state.user,
                scheduled_at__date=today,
                status='pending'
            ).update(status='scheduled')
            print(f"[DEBUG TEST API]   → {appointments_updated}개 예약을 pending → scheduled로 변경")

            # ✅ 모든 Queue를 waiting으로 초기화 (Bulk Update)
            queues_updated = user_queues.exclude(state='waiting').update(state='waiting')
            print(f"[DEBUG TEST API]   → {queues_updated}개 Queue를 waiting으로 초기화")

            # ✅ 첫 번째 검사를 current_exam으로 설정하되, waiting 상태 유지
            # QuerySet 재조회 (Bulk update 반영)
            user_queues = Queue.objects.filter(
                user__user_id=user_id,
                created_at__date=today
            ).order_by('created_at')

            first_queue = user_queues.filter(state='waiting').first()
            if first_queue:
                # ✅ REGISTERED 상태 그대로 유지 (자동 WAITING 전환하지 않음)
                patient_state.current_exam = first_queue.exam
                patient_state.current_state = 'REGISTERED'  # REGISTERED 상태 유지
                patient_state.save()
                sync_message = f"{appointments_updated}개 예약을 scheduled로 변경. 첫 검사 '{first_queue.exam.title}' 접수 완료."
            else:
                sync_message = f"{appointments_updated}개 예약을 scheduled로 변경하고, {queues_updated}개 Queue를 waiting으로 초기화했습니다."

        elif new_state == 'WAITING':
            # WAITING 상태 전환 - 단순화된 로직
            print(f"[DEBUG TEST API] 🔍 WAITING 상태 전환 - 다음 검사 찾기")

            # ✅ 1단계: 현재 in_progress인 Queue를 completed로 변경하고, 해당 Appointment도 examined로 변경
            in_progress_queues = user_queues.filter(state='in_progress')
            queues_updated = 0
            for queue in in_progress_queues:
                queue.state = 'completed'
                queue.save()
                queues_updated += 1

                # Appointment도 함께 examined로 변경
                if queue.appointment:
                    queue.appointment.status = 'examined'
                    queue.appointment.save()
                    print(f"[DEBUG TEST API]   → Queue & Appointment {queue.exam.title}: in_progress → completed/examined")

            print(f"[DEBUG TEST API]   → {queues_updated}개 in_progress Queue를 completed로 변경")

            # ✅ 2단계: 헬퍼 함수로 다음 예약 찾기
            next_appointment = find_next_pending_appointment(user_id, today)

            if next_appointment:
                # ✅ 다음 검사가 있으면 WAITING 상태 유지
                patient_state.current_exam = next_appointment.exam

                # ✅ Appointment 상태 업데이트
                next_appointment.status = 'waiting'
                next_appointment.save()

                # ✅ 헬퍼 함수로 Queue 확인/생성
                next_queue = ensure_queue_for_appointment(next_appointment, patient_state.user, today)

                print(f"[DEBUG TEST API] ✅ 다음 검사 발견: {next_appointment.exam.title} → WAITING 유지")
                sync_message = f"{queues_updated}개 검사 완료. 다음 검사: '{next_appointment.exam.title}' 대기 중"
                final_state = 'WAITING'
            else:
                # ✅ 다음 검사가 없으면 PAYMENT로 전환
                patient_state.current_exam = None
                print(f"[DEBUG TEST API] 💰 다음 검사 없음 → PAYMENT 전환")
                sync_message = f"{queues_updated}개 검사 완료. 모든 일정 완료 → PAYMENT 단계로 자동 전환"
                final_state = 'PAYMENT'

        elif new_state == 'CALLED':
            # 호출됨 - 첫 waiting Queue를 called로 변경
            print(f"[DEBUG TEST API] 📢 CALLED 상태 전환 - 환자 호출")

            # ✅ 타임존 안전한 날짜 범위로 당일 Queue만 조회
            from datetime import datetime, time
            from django.db import transaction

            today_start = timezone.make_aware(datetime.combine(today, time.min))
            today_end = timezone.make_aware(datetime.combine(today, time.max))

            # 🔒 transaction.atomic()으로 감싸서 동시 호출 방지
            with transaction.atomic():
                user_queues = Queue.objects.filter(
                    user__user_id=user_id,
                    created_at__gte=today_start,
                    created_at__lte=today_end
                ).order_by('created_at')  # 생성 순으로 정렬 (첫번째 검사부터)

                # 🔍 디버깅: 당일 Queue 상태 확인
                print(f"[DEBUG TEST API] 🔍 CALLED 전환 전 Queue 확인 (당일만):")
                print(f"[DEBUG TEST API] 📋 당일 Queue 수: {user_queues.count()}")
                for q in user_queues[:5]:  # 최근 5개만 출력
                    print(f"[DEBUG TEST API]   → Queue {q.exam.title}: state={q.state}, created_at={q.created_at}")

                # ✅ 중요: 이미 called 상태인 Queue가 있는지 먼저 확인
                existing_called = user_queues.filter(state='called').exists()
                if existing_called:
                    print(f"[DEBUG TEST API]   ⚠️ 이미 called 상태인 Queue가 있습니다. 중복 호출 방지.")
                    sync_message = "이미 호출된 검사가 있습니다."
                else:
                    # 🔒 select_for_update()로 row-level lock 적용 (race condition 방지)
                    first_waiting = user_queues.filter(state='waiting').select_for_update().first()
                    if first_waiting:
                        print(f"[DEBUG TEST API]   → 호출할 Queue 발견: {first_waiting.exam.title}")
                        first_waiting.state = 'called'
                        first_waiting.called_at = timezone.now()
                        first_waiting.save()
                        queues_updated = 1
                        patient_state.current_exam = first_waiting.exam
                        sync_message = f"{first_waiting.exam.title} 검사를 called로 변경했습니다."
                    else:
                        print(f"[DEBUG TEST API]   ⚠️ 호출할 waiting Queue가 없음")
                        sync_message = "호출할 waiting 상태의 Queue가 없습니다."

        elif new_state == 'IN_PROGRESS':
            # 진행중 - 완료되지 않은 Queue 중 첫 called/waiting Queue를 in_progress로
            print(f"[DEBUG TEST API] ⏩ IN_PROGRESS 상태 전환 - 검사 시작")

            # ✅ 타임존 안전한 날짜 범위로 당일 Queue만 조회
            from datetime import datetime, time
            from django.db import transaction

            today_start = timezone.make_aware(datetime.combine(today, time.min))
            today_end = timezone.make_aware(datetime.combine(today, time.max))

            # 🔒 transaction.atomic()으로 감싸서 동시 호출 방지
            with transaction.atomic():
                user_queues = Queue.objects.filter(
                    user__user_id=user_id,
                    created_at__gte=today_start,
                    created_at__lte=today_end
                ).order_by('created_at')  # 생성 순으로 정렬 (첫번째 검사부터)

                # ✅ 먼저 다른 모든 in_progress Queue를 completed로 변경 (Bulk Update with Lock)
                queues_updated = user_queues.filter(state='in_progress').select_for_update().update(state='completed')
                print(f"[DEBUG TEST API]   → {queues_updated}개 기존 in_progress Queue를 completed로 변경")

                # QuerySet 재조회 (Bulk update 반영)
                user_queues = Queue.objects.filter(
                    user__user_id=user_id,
                    created_at__gte=today_start,
                    created_at__lte=today_end
                ).order_by('created_at')  # 생성 순으로 정렬 (첫번째 검사부터)

                # 🔍 디버깅: 당일 Queue 상태 확인
                print(f"[DEBUG TEST API] 🔍 IN_PROGRESS 전환 전 Queue 확인 (당일만):")
                print(f"[DEBUG TEST API] 📋 당일 Queue 수: {user_queues.count()}")
                for q in user_queues[:5]:
                    print(f"[DEBUG TEST API]   → Queue {q.exam.title}: state={q.state}, created_at={q.created_at}")

                # 🔒 select_for_update()로 row-level lock 적용 (race condition 방지)
                # 1순위: called 상태 (완료되지 않은 것만)
                target_queue = user_queues.filter(state='called').select_for_update().first()
                # 2순위: waiting 상태 (완료되지 않은 것만)
                if not target_queue:
                    target_queue = user_queues.filter(state='waiting').select_for_update().first()

                if target_queue:
                    # 선택된 Queue를 in_progress로 변경
                    print(f"[DEBUG TEST API]   → 대상 Queue 발견: {target_queue.exam.title} (상태: {target_queue.state})")
                    target_queue.state = 'in_progress'
                    target_queue.save()
                    queues_updated += 1

                    patient_state.current_exam = target_queue.exam

                    sync_message = f"{target_queue.exam.title} 검사를 in_progress로 변경했습니다 (순차적 진행)."
                    final_state = 'IN_PROGRESS'  # ✅ 정상 처리
                else:
                    # ✅ 진행할 Queue가 없으면 모든 검사 완료 → PAYMENT로 자동 전환
                    print(f"[DEBUG TEST API]   ⚠️ 진행할 Queue 없음 (모든 검사 완료)")
                    print(f"[DEBUG TEST API]   💰 자동으로 PAYMENT 상태로 전환")
                    patient_state.current_exam = None
                    sync_message = "모든 검사 완료. PAYMENT 단계로 자동 전환."
                    final_state = 'PAYMENT'  # ✅ 자동 분기

        elif new_state == 'PAYMENT' or new_state == 'FINISHED':
            # ✅ 수납/완료 - 모든 Queue를 completed로 변경 (Bulk Update)
            print(f"[DEBUG TEST API] 💳 {new_state} 상태 전환 - 수납/완료 단계")
            queues_updated = user_queues.exclude(state='completed').update(state='completed')
            print(f"[DEBUG TEST API]   → {queues_updated}개 Queue를 completed로 변경")

            # current_exam 초기화
            if patient_state.current_exam:
                print(f"[DEBUG TEST API]   → current_exam 초기화")
                patient_state.current_exam = None

            sync_message = f"{queues_updated}개 Queue를 completed로 변경했습니다."

        # ✅ 최종적으로 환자 상태 저장 (Queue 동기화 후)
        patient_state.current_state = final_state
        patient_state.save()

        # 상태 변경 시그널이 자동으로 WebSocket 알림 전송

        print(f"[DEBUG TEST API] ✅ 상태 전환 완료: {old_state} → {final_state}")
        print(f"[DEBUG TEST API] ==================== API 호출 종료 ====================\n")

        return APIResponse.success(
            data={
                'user_id': user_id,
                'old_state': old_state,
                'new_state': final_state,  # ✅ 실제 최종 상태 반환
                'queues_updated': queues_updated,
                'sync_message': sync_message,
                'updated_at': patient_state.updated_at.isoformat()
            },
            message=f"환자 상태를 {old_state}에서 {final_state}로 변경했습니다. {sync_message}"
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
    시연용 환자 흐름 시뮬레이션 (자동 진행) - 8단계 시스템
    POST /api/v1/test/simulate

    Body:
    {
        "user_id": "uuid",
        "interval_seconds": 10  // 각 단계 사이 간격 (선택)
    }

    IN_PROGRESS 완료 시 동적 분기:
    - 다음 예약이 있으면 → WAITING
    - 모든 예약 완료 → PAYMENT
    """

    user_id = request.data.get('user_id')

    try:
        patient_state = PatientState.objects.get(user_id=user_id)
        current = patient_state.current_state

        # IN_PROGRESS 완료 시 동적 분기 로직
        if current == 'IN_PROGRESS':
            # 다음 대기 중인 예약이 있는지 확인
            from appointments.models import Appointment
            next_appointment = Appointment.objects.filter(
                user=patient_state.user,
                status__in=['scheduled', 'pending']
            ).order_by('scheduled_at').first()

            if next_appointment:
                # 다음 검사가 있으면 WAITING으로
                next_state = 'WAITING'
                message = f"환자가 IN_PROGRESS에서 WAITING으로 진행했습니다 (다음 검사: {next_appointment.exam.title})"
            else:
                # 모든 검사 완료 → PAYMENT로
                next_state = 'PAYMENT'
                message = "환자가 IN_PROGRESS에서 PAYMENT로 진행했습니다 (모든 검사 완료)"
        else:
            # 일반적인 상태 전이 매핑 (8단계)
            next_state_map = {
                'UNREGISTERED': 'ARRIVED',
                'ARRIVED': 'REGISTERED',
                'REGISTERED': 'WAITING',
                'WAITING': 'CALLED',
                'CALLED': 'IN_PROGRESS',
                # 'IN_PROGRESS': 동적 분기 (위에서 처리)
                'PAYMENT': 'FINISHED',
                'FINISHED': 'FINISHED'  # 마지막 상태는 유지
            }

            next_state = next_state_map.get(current, current)
            message = f"환자가 {current}에서 {next_state}로 진행했습니다."

        if current != next_state:
            patient_state.current_state = next_state
            patient_state.save()

            return APIResponse.success(
                data={
                    'user_id': user_id,
                    'previous_state': current,
                    'current_state': next_state,
                    'is_final': next_state == 'FINISHED',
                    'branching_applied': current == 'IN_PROGRESS'
                },
                message=message
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

        # ✅ NEW: in_progress로 변경할 때, 같은 환자의 다른 in_progress 검사를 completed로
        completed_other_count = 0
        if new_state == 'in_progress':
            from django.utils import timezone
            today = timezone.now().date()

            other_in_progress = Queue.objects.filter(
                user=queue.user,
                state='in_progress',
                created_at__date=today
            ).exclude(queue_id=queue_id)

            completed_other_count = other_in_progress.update(state='completed')

            if completed_other_count > 0:
                logger.info(f"✅ {completed_other_count}개의 다른 in_progress 검사를 completed로 변경")

        queue.state = new_state

        if new_state == 'called':
            from django.utils import timezone
            queue.called_at = timezone.now()

        queue.save()

        # 큐 상태에 따라 환자 상태도 자동 업데이트
        patient_state = PatientState.objects.get(user=queue.user)
        old_patient_state = patient_state.current_state

        # 큐 상태 -> 환자 상태 매핑 (8단계 시스템)
        queue_to_patient_state = {
            'waiting': 'WAITING',
            'called': 'CALLED',
            'in_progress': 'IN_PROGRESS'
            # 'completed': 동적 분기 (아래에서 처리)
        }

        if new_state == 'completed':
            # Queue 'completed' 시 동적 분기 로직
            print(f"\n[DEBUG QUEUE API] ==================== Queue completed 처리 시작 ====================")
            print(f"[DEBUG QUEUE API] 📞 함수: test_update_queue_state")
            print(f"[DEBUG QUEUE API] 🔄 Queue 상태: {old_queue_state} → completed")
            print(f"[DEBUG QUEUE API] 👤 환자: {queue.user.name}")
            print(f"[DEBUG QUEUE API] 🏥 완료된 검사: {queue.exam.title}")

            from appointments.models import Appointment
            from django.utils import timezone
            today = timezone.now().date()

            # 🆕 완료된 Queue의 Appointment를 examined로 변경 (동기화)
            if queue.appointment:
                queue.appointment.status = 'examined'
                queue.appointment.save()
                print(f"[DEBUG QUEUE API]   → Appointment {queue.appointment.appointment_id} 상태를 examined로 변경")

            # 🔍 디버깅: 전체 당일 예약 조회
            all_today_appointments = Appointment.objects.filter(
                user=queue.user,
                scheduled_at__date=today
            ).order_by('created_at')

            print(f"[DEBUG QUEUE API] 🔍 다음 검사 찾기...")
            print(f"[DEBUG QUEUE API] 📋 전체 당일 예약 수: {all_today_appointments.count()}")

            # 🔍 완료되지 않은 예약만 필터링
            FINAL_STATUSES = ['completed', 'examined', 'cancelled', 'no_show']
            pending_appointments = all_today_appointments.exclude(
                status__in=FINAL_STATUSES
            ).exclude(appointment_id=queue.appointment_id)

            print(f"[DEBUG QUEUE API] ⏳ 대기 중인 예약 수: {pending_appointments.count()}")
            for apt in pending_appointments:
                print(f"[DEBUG QUEUE API]   → {apt.appointment_id}: {apt.exam.title} (status={apt.status})")

            next_appointment = pending_appointments.first()

            if next_appointment:
                # 다음 검사가 있으면 WAITING으로
                new_patient_state = 'WAITING'
                print(f"[DEBUG QUEUE API] ✅ 다음 검사 발견: {next_appointment.exam.title} → WAITING 전환")
            else:
                # 모든 검사 완료 → PAYMENT로
                new_patient_state = 'PAYMENT'
                print(f"[DEBUG QUEUE API] 💰 다음 검사 없음 → PAYMENT 전환")

            patient_state.current_state = new_patient_state
            patient_state.current_exam = None  # 검사 완료 시 current_exam 초기화
            patient_state.save()

            print(f"[DEBUG QUEUE API] ✅ 환자 상태 전환 완료: {old_patient_state} → {new_patient_state}")
            print(f"[DEBUG QUEUE API] ==================== Queue completed 처리 종료 ====================\n")
        elif new_state in queue_to_patient_state:
            new_patient_state = queue_to_patient_state[new_state]
            patient_state.current_state = new_patient_state
            patient_state.current_exam = queue.exam  # 현재 검사도 업데이트
            patient_state.save()
        else:
            new_patient_state = old_patient_state  # 변경 없음
        
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
        
        # appointment_id를 EMR_ 접두사와 함께 생성 (기존 데이터 형식과 일치)
        import uuid as uuid_module
        appointment_id = f"EMR_{uuid_module.uuid4().hex[:8]}"
        
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
            # ARRIVED 상태는 유지 - 접수를 완료해야만 REGISTERED로 변경
            # REGISTERED 상태만 WAITING으로 변경
            if patient_state.current_state == 'REGISTERED':
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

@api_view(['DELETE'])
@permission_classes([permissions.AllowAny])
def test_remove_exam_from_patient(request, appointment_id):
    """
    시연용 환자의 검사/진료 삭제
    DELETE /api/v1/test/remove-exam/{appointment_id}/

    Body:
    {
        "user_id": "uuid"  // 검증용
    }
    """
    user_id = request.data.get('user_id')

    try:
        from appointments.models import Appointment
        from p_queue.models import Queue

        # Appointment 조회 및 검증
        appointment = Appointment.objects.get(appointment_id=appointment_id)

        # 사용자 검증 (선택적)
        if user_id and str(appointment.user.user_id) != user_id:
            return APIResponse.error(
                message="권한이 없습니다.",
                code="UNAUTHORIZED",
                status_code=status.HTTP_403_FORBIDDEN
            )

        # 관련된 Queue가 있으면 함께 삭제 (중복 Queue 대응)
        deleted_count, _ = Queue.objects.filter(appointment_id=appointment_id).delete()
        if deleted_count > 0:
            logger.info(f"{deleted_count} Queue(s) deleted with appointment {appointment_id}")
        else:
            logger.info(f"No Queue found for appointment {appointment_id}")

        # 검사 정보 백업
        exam_title = appointment.exam.title
        patient_name = appointment.user.name

        # Appointment 삭제
        appointment.delete()

        return APIResponse.success(
            data={
                'appointment_id': appointment_id,
                'exam_title': exam_title,
                'patient_name': patient_name
            },
            message=f"{patient_name}님의 {exam_title} 검사를 삭제했습니다."
        )

    except Appointment.DoesNotExist:
        return APIResponse.error(
            message="해당 예약을 찾을 수 없습니다.",
            code="APPOINTMENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Remove exam from patient error: {str(e)}")
        return APIResponse.error(
            message=f"검사 삭제 중 오류가 발생했습니다: {str(e)}",
            code="REMOVE_EXAM_ERROR",
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

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_get_locations(request):
    """
    시연용 병원 내 위치 목록 조회
    GET /api/v1/test/locations
    """
    try:
        locations = []
        for name, data in HOSPITAL_LOCATIONS.items():
            locations.append({
                'key': name,  # 프론트엔드에서 key로 사용
                'name': name,
                'building': data['building'],
                'floor': data['floor'],
                'room': data['room'],
                'x': data['x'],
                'y': data['y'],
                'icon': data.get('icon', '📍')  # icon 추가, 기본값 📍
            })
        
        return APIResponse.success(
            data={'locations': locations},
            message=f"{len(locations)}개의 위치를 조회했습니다."
        )
        
    except Exception as e:
        return APIResponse.error(
            message=f"위치 목록 조회 중 오류가 발생했습니다: {str(e)}",
            code="FETCH_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def test_set_exam_in_progress(request):
    """
    시연용 특정 검사를 진행중으로 변경
    POST /api/v1/test/set-exam-in-progress

    Body:
    {
        "user_id": "uuid",
        "appointment_id": "appointment_uuid"
    }
    """
    user_id = request.data.get('user_id')
    appointment_id = request.data.get('appointment_id')

    if not user_id or not appointment_id:
        return APIResponse.error(
            message="user_id와 appointment_id가 필요합니다.",
            code="MISSING_FIELDS",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    try:
        from p_queue.models import Queue
        from appointments.models import Appointment

        # Appointment 조회
        appointment = Appointment.objects.select_related('exam', 'user').get(
            appointment_id=appointment_id,
            user__user_id=user_id
        )

        # ✅ 먼저 이 환자의 다른 모든 in_progress 검사들을 completed로 변경
        # (드롭다운으로 다른 검사를 선택하면 이전 검사는 완료된 것으로 간주)
        other_in_progress_queues = Queue.objects.filter(
            user=appointment.user,
            state='in_progress'
        ).exclude(appointment_id=appointment_id)

        completed_count = 0
        for q in other_in_progress_queues:
            q.state = 'completed'
            q.save()
            completed_count += 1

        logger.info(f"Marked {completed_count} other queues as completed for user {user_id}")

        # Queue가 있는지 확인
        queue = Queue.objects.filter(appointment_id=appointment_id).first()

        if queue:
            # Queue가 있으면 in_progress로 변경
            old_queue_state = queue.state
            queue.state = 'in_progress'
            queue.save()

            # 환자 상태도 자동 업데이트
            patient_state = PatientState.objects.get(user=appointment.user)
            old_patient_state = patient_state.current_state
            patient_state.current_state = 'IN_PROGRESS'
            patient_state.current_exam = appointment.exam
            patient_state.save()

            return APIResponse.success(
                data={
                    'user_id': str(user_id),
                    'appointment_id': appointment_id,
                    'exam_title': appointment.exam.title,
                    'old_queue_state': old_queue_state,
                    'new_queue_state': 'in_progress',
                    'old_patient_state': old_patient_state,
                    'new_patient_state': 'IN_PROGRESS',
                    'completed_other_exams': completed_count
                },
                message=f"{appointment.exam.title} 검사를 진행중으로 변경했습니다."
            )
        else:
            # Queue가 없으면 생성하고 in_progress로 설정
            queue = Queue.objects.create(
                appointment=appointment,
                user=appointment.user,
                exam=appointment.exam,
                queue_number=Queue.get_next_queue_number(appointment.exam),
                state='in_progress'
            )

            # 환자 상태도 업데이트
            patient_state, created = PatientState.objects.get_or_create(
                user=appointment.user
            )
            old_patient_state = patient_state.current_state
            patient_state.current_state = 'IN_PROGRESS'
            patient_state.current_exam = appointment.exam
            patient_state.save()

            return APIResponse.success(
                data={
                    'user_id': str(user_id),
                    'appointment_id': appointment_id,
                    'exam_title': appointment.exam.title,
                    'queue_created': True,
                    'queue_id': str(queue.queue_id),
                    'old_patient_state': old_patient_state,
                    'new_patient_state': 'IN_PROGRESS',
                    'completed_other_exams': completed_count
                },
                message=f"{appointment.exam.title} 검사를 진행중으로 변경했습니다 (Queue 생성됨)."
            )

    except Appointment.DoesNotExist:
        return APIResponse.error(
            message="해당 예약을 찾을 수 없습니다.",
            code="APPOINTMENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Set exam in progress error: {str(e)}")
        return APIResponse.error(
            message=f"검사 진행중 변경 중 오류가 발생했습니다: {str(e)}",
            code="SET_IN_PROGRESS_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([permissions.AllowAny])
def test_update_patient_location(request):
    """
    시연용 환자 위치 업데이트
    PUT /api/v1/test/patient-location
    """
    try:
        user_id = request.data.get('user_id')
        location_key = request.data.get('location_key')  # 프론트엔드에서 location_key로 변경
        custom_location = request.data.get('custom_location')  # 커스텀 위치 정보
        
        if not user_id:
            return APIResponse.error(message="user_id가 필요합니다.", code="INVALID_INPUT", status_code=status.HTTP_400_BAD_REQUEST)
        
        # 환자 상태 조회
        patient_state = PatientState.objects.select_related('user').get(user__user_id=user_id)
        
        # 위치 정보 설정
        if location_key and location_key in HOSPITAL_LOCATIONS:
            # 사전 정의된 위치 사용
            location_data = HOSPITAL_LOCATIONS[location_key]
            location_str = location_key  # 키 자체를 저장하여 나중에 참조하기 쉽게 함
        elif custom_location:
            # 커스텀 위치 사용
            location_str = custom_location
        else:
            location_str = patient_state.current_location  # 기존 위치 유지
        
        # 위치 업데이트
        patient_state.current_location = location_str
        patient_state.save()
        
        logger.info(f"Patient {patient_state.user.name} location updated to: {location_str}")
        
        return APIResponse.success(
            data={
                'user_id': str(user_id),
                'name': patient_state.user.name,
                'current_location': location_str,
                'updated_at': patient_state.updated_at.isoformat()
            },
            message=f"{patient_state.user.name}님의 위치를 업데이트했습니다."
        )
        
    except PatientState.DoesNotExist:
        return APIResponse.error(message="환자 상태를 찾을 수 없습니다.", code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Update patient location error: {str(e)}")
        return APIResponse.error(
            message=f"위치 업데이트 중 오류가 발생했습니다: {str(e)}",
            code="UPDATE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# 지도 및 경로 관리 API
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_get_maps(request):
    """
    모든 지도 정보와 SVG 파일 목록 반환
    GET /api/v1/test/maps
    """
    try:
        # SVG 파일 목록 (frontend에서 사용 가능한)
        available_maps = [
            {
                'id': 'main_1f',
                'name': '본관 1층',
                'building': '본관',
                'floor': '1층',
                'svg_url': '/images/maps/main_1f.svg',
                'interactive_svg_url': '/images/maps/main_1f.interactive.svg',
                'type': 'floor_map'
            },
            {
                'id': 'main_2f',
                'name': '본관 2층',
                'building': '본관',
                'floor': '2층',
                'svg_url': '/images/maps/main_2f.svg',
                'interactive_svg_url': '/images/maps/main_2f.interactive.svg',
                'type': 'floor_map'
            },
            {
                'id': 'cancer_1f',
                'name': '암센터 1층',
                'building': '암센터',
                'floor': '1층',
                'svg_url': '/images/maps/cancer_1f.svg',
                'interactive_svg_url': '/images/maps/cancer_1f.interactive.svg',
                'type': 'floor_map'
            },
            {
                'id': 'cancer_2f',
                'name': '암센터 2층',
                'building': '암센터',
                'floor': '2층',
                'svg_url': '/images/maps/cancer_2f.svg',
                'interactive_svg_url': '/images/maps/cancer_2f.interactive.svg',
                'type': 'floor_map'
            },
            {
                'id': 'annex_1f',
                'name': '별관 1층',
                'building': '별관',
                'floor': '1층',
                'svg_url': '/images/maps/annex_1f.svg',
                'type': 'floor_map'
            },
            {
                'id': 'overview_main_1f',
                'name': '본관 1층 개요도',
                'building': '본관',
                'floor': '1층',
                'svg_url': '/images/maps/overview_main_1f.svg',
                'type': 'overview'
            },
            {
                'id': 'overview_main_2f',
                'name': '본관 2층 개요도',
                'building': '본관',
                'floor': '2층',
                'svg_url': '/images/maps/overview_main_2f.svg',
                'type': 'overview'
            },
            {
                'id': 'overview_cancer_2f',
                'name': '암센터 2층 개요도',
                'building': '암센터',
                'floor': '2층',
                'svg_url': '/images/maps/overview_cancer_2f.svg',
                'type': 'overview'
            }
        ]
        
        # DB에 저장된 HospitalMap 정보
        hospital_maps = HospitalMap.objects.filter(is_active=True).values(
            'map_id', 'building', 'floor', 'width', 'height', 'scale'
        )
        
        # DB에 저장된 FacilityRoute 정보 (MapEditor로 그린 경로)
        facility_routes = FacilityRoute.objects.all().values(
            'facility_name', 'map_id', 'nodes', 'edges', 'updated_at'
        )
        
        # DepartmentZone 정보 (진료과/시설 위치)
        department_zones = DepartmentZone.objects.filter(is_active=True).values(
            'name', 'svg_id', 'building', 'floor', 'zone_type', 'icon', 'description'
        )
        
        return APIResponse.success(
            data={
                'available_maps': available_maps,
                'hospital_maps': list(hospital_maps),
                'facility_routes': list(facility_routes),
                'department_zones': list(department_zones),
                'map_editor_url': '/map-editor'  # Frontend MapEditor 경로
            },
            message="지도 정보를 조회했습니다."
        )
    except Exception as e:
        logger.error(f"Get maps error: {str(e)}")
        return APIResponse.error(
            message=f"지도 정보 조회 중 오류가 발생했습니다: {str(e)}",
            code="FETCH_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_get_facility_route(request, facility_name):
    """
    특정 시설의 경로 정보 반환
    GET /api/v1/test/facility-route/{facility_name}

    Returns:
    {
        "route_id": "uuid",
        "route_name": "route_시연_P1_도착_원무과",
        "facility_name": "시연_P1_도착_원무과",
        "route_data": { "maps": {...} } or { "nodes": [...], "edges": [...] },
        "route_type": "demo" or "facility",
        "map_id": "main_1f",
        "nodes": [...],  // 하위 호환
        "edges": [...],  // 하위 호환
        "updated_at": "2025-10-19T..."
    }
    """
    try:
        # route_name 기반 조회 시도 (우선순위)
        route_name = f"route_{facility_name}"
        route = FacilityRoute.objects.filter(
            route_name=route_name,
            is_active=True
        ).first()

        # 없으면 facility_name으로 조회 (하위 호환)
        if not route:
            route = FacilityRoute.objects.filter(
                facility_name=facility_name,
                is_active=True
            ).first()

        if not route:
            return APIResponse.error(
                message=f"시설 경로를 찾을 수 없습니다: {facility_name}",
                code="NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )

        # 시설의 위치 정보 (HOSPITAL_LOCATIONS에서)
        location_info = HOSPITAL_LOCATIONS.get(facility_name, {})

        return APIResponse.success(
            data={
                # 새 구조 필드
                'route_id': str(route.route_id),
                'route_name': route.route_name,
                'route_data': route.route_data,  # 🆕 Multi-floor 또는 단일 층 데이터
                'route_type': route.route_type,

                # 기존 필드 (하위 호환)
                'facility_name': route.facility_name,
                'map_id': route.map_id,
                'nodes': route.nodes,
                'edges': route.edges,
                'svg_element_id': route.svg_element_id,

                # 추가 정보
                'location_info': location_info,
                'is_active': route.is_active,
                'updated_at': route.updated_at.isoformat(),
                'created_at': route.created_at.isoformat()
            },
            message=f"{facility_name} 경로 정보를 조회했습니다."
        )
    except Exception as e:
        logger.error(f"Get facility route error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message=f"경로 조회 중 오류가 발생했습니다: {str(e)}",
            code="FETCH_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def test_save_facility_route(request):
    """
    시설 경로 저장/업데이트 (MapEditor에서 호출)
    POST /api/v1/test/save-facility-route

    Body (Multi-floor 형식):
    {
        "facility_name": "시연_P1_도착_원무과",
        "maps": {
            "main_1f": { "nodes": [...], "edges": [...] },
            "main_2f": { "nodes": [...], "edges": [...] }
        },
        "current_map": "main_1f",
        "svg_element_id": "room-reception"
    }

    Body (구 형식 - 하위 호환):
    {
        "facility_name": "채혈실",
        "nodes": [...],
        "edges": [...],
        "map_id": "main_1f",
        "svg_element_id": "blood-test-room"
    }
    """
    try:
        facility_name = request.data.get('facility_name')

        # 🆕 Multi-floor 데이터 확인
        maps = request.data.get('maps')
        current_map = request.data.get('current_map')

        # 구 형식 데이터 (하위 호환)
        nodes = request.data.get('nodes', [])
        edges = request.data.get('edges', [])
        map_id = request.data.get('map_id')
        svg_element_id = request.data.get('svg_element_id', '')

        # 필수 값 검증
        if not facility_name:
            return APIResponse.error(
                message="facility_name은 필수입니다",
                code="MISSING_FIELDS",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # route_name 생성 (facility_name 기반, unique constraint)
        route_name = f"route_{facility_name}"

        # 🔄 route_data 구성
        if maps:
            # Multi-floor 형식
            route_data = {
                'maps': maps,
                'currentMap': current_map or 'main_1f'
            }
            effective_map_id = current_map or 'main_1f'
        else:
            # 단일 층 형식 (하위 호환)
            route_data = {
                'nodes': nodes,
                'edges': edges,
                'map_id': map_id or 'main_1f'
            }
            effective_map_id = map_id or 'main_1f'

        # route_type 자동 분류 (시연용 vs 일반 시설)
        route_type = 'demo' if '시연' in facility_name else 'facility'

        # ✅ route_name 기준으로 저장 (unique constraint)
        route, created = FacilityRoute.objects.update_or_create(
            route_name=route_name,
            defaults={
                # 새 구조 필드
                'route_data': route_data,
                'route_type': route_type,
                'is_active': True,

                # 하위 호환 필드 (기존 코드 지원)
                'facility_name': facility_name,
                'nodes': nodes,
                'edges': edges,
                'map_id': effective_map_id,
                'svg_element_id': svg_element_id,
            }
        )

        return APIResponse.success(
            data={
                'route_id': str(route.route_id),
                'route_name': route.route_name,
                'facility_name': route.facility_name,
                'route_type': route.route_type,
                'created': created,
                'message': f"{'생성' if created else '업데이트'}되었습니다: {facility_name}"
            },
            message=f"경로가 {'생성' if created else '업데이트'}되었습니다."
        )
    except Exception as e:
        logger.error(f"Save facility route error: {str(e)}", exc_info=True)
        return APIResponse.error(
            message=f"경로 저장 중 오류가 발생했습니다: {str(e)}",
            code="SAVE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([permissions.AllowAny])
def test_delete_patient_queues(request):
    """
    시연용 특정 환자의 모든 Queue 삭제
    DELETE /api/v1/test/queues/delete-patient/

    Body:
    {
        "user_id": "uuid"
    }
    """
    user_id = request.data.get('user_id')

    if not user_id:
        return APIResponse.error(
            message="user_id가 필요합니다.",
            code="MISSING_FIELD",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    try:
        from p_queue.models import Queue

        # 특정 환자의 모든 Queue 삭제
        deleted_count, _ = Queue.objects.filter(user__user_id=user_id).delete()

        logger.info(f"Deleted {deleted_count} Queue(s) for user {user_id}")

        return APIResponse.success(
            data={
                'user_id': user_id,
                'deleted_count': deleted_count
            },
            message=f"{deleted_count}개의 Queue를 삭제했습니다."
        )

    except Exception as e:
        logger.error(f"Delete patient queues error: {str(e)}")
        return APIResponse.error(
            message=f"Queue 삭제 중 오류가 발생했습니다: {str(e)}",
            code="DELETE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([permissions.AllowAny])
def test_delete_all_queues(request):
    """
    시연용 전체 Queue 초기화 (모든 환자의 모든 Queue 삭제)
    DELETE /api/v1/test/queues/delete-all/

    Body: 없음 (또는 확인용 {"confirm": true})
    """
    # 안전장치: confirm 파라미터 확인
    confirm = request.data.get('confirm', False)

    if not confirm:
        return APIResponse.error(
            message="전체 Queue 삭제를 위해서는 'confirm': true가 필요합니다.",
            code="CONFIRMATION_REQUIRED",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    try:
        from p_queue.models import Queue

        # 모든 Queue 삭제
        deleted_count, _ = Queue.objects.all().delete()

        logger.warning(f"DELETED ALL QUEUES: {deleted_count} Queue(s) deleted")

        return APIResponse.success(
            data={
                'deleted_count': deleted_count
            },
            message=f"전체 {deleted_count}개의 Queue를 삭제했습니다."
        )

    except Exception as e:
        logger.error(f"Delete all queues error: {str(e)}")
        return APIResponse.error(
            message=f"Queue 삭제 중 오류가 발생했습니다: {str(e)}",
            code="DELETE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )