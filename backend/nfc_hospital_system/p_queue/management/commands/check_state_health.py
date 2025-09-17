"""
상태 일관성 및 시스템 헬스 체크 명령어
V2 리팩토링 - Phase 6 모니터링
사용법: python manage.py check_state_health
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
import json

from p_queue.models import Queue, PatientState, StateTransition, QueueStatusLog
from appointments.models import Appointment
from authentication.models import User
from common.state_definitions import (
    QUEUE_TO_JOURNEY_MAPPING, JOURNEY_TO_QUEUE_MAPPING,
    PatientJourneyState, QueueDetailState
)


class Command(BaseCommand):
    help = '상태 일관성 및 시스템 헬스 체크'
    
    def __init__(self):
        super().__init__()
        self.issues = []
        self.stats = {
            'total_users': 0,
            'total_queues': 0,
            'total_patient_states': 0,
            'inconsistencies': 0,
            'orphaned_states': 0,
            'ongoing_found': 0,
            'in_progress_found': 0
        }
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='발견된 문제를 자동으로 수정',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='상세 정보 출력',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='결과를 JSON 형식으로 출력',
        )
    
    def handle(self, *args, **options):
        self.fix = options.get('fix', False)
        self.verbose = options.get('verbose', False)
        self.json_output = options.get('json', False)
        
        if not self.json_output:
            self.stdout.write(self.style.SUCCESS('\n=== 상태 일관성 체크 시작 ===\n'))
        
        # 각 체크 수행
        self.check_ongoing_states()
        self.check_state_consistency()
        self.check_orphaned_states()
        self.check_transition_logs()
        self.check_queue_patient_sync()
        self.print_statistics()
        
        # 결과 출력
        if self.json_output:
            self.print_json_result()
        else:
            self.print_summary()
    
    def check_ongoing_states(self):
        """'ongoing' 상태 체크 및 정규화"""
        if not self.json_output:
            self.stdout.write('\n📋 Checking for "ongoing" states...')
        
        # Queue 테이블 체크
        ongoing_queues = Queue.objects.filter(state='ongoing')
        self.stats['ongoing_found'] += ongoing_queues.count()
        
        if ongoing_queues.exists():
            self.issues.append({
                'type': 'ONGOING_STATE',
                'table': 'Queue',
                'count': ongoing_queues.count(),
                'message': f'{ongoing_queues.count()}개의 Queue에서 "ongoing" 상태 발견'
            })
            
            if self.fix:
                updated = ongoing_queues.update(state='in_progress')
                self.stdout.write(
                    self.style.SUCCESS(f'  ✅ {updated}개 Queue 상태를 "in_progress"로 수정')
                )
        
        # PatientState 테이블 체크
        ongoing_patients = PatientState.objects.filter(current_state='ONGOING')
        self.stats['ongoing_found'] += ongoing_patients.count()
        
        if ongoing_patients.exists():
            self.issues.append({
                'type': 'ONGOING_STATE',
                'table': 'PatientState',
                'count': ongoing_patients.count(),
                'message': f'{ongoing_patients.count()}개의 PatientState에서 "ONGOING" 상태 발견'
            })
            
            if self.fix:
                updated = ongoing_patients.update(current_state='IN_PROGRESS')
                self.stdout.write(
                    self.style.SUCCESS(f'  ✅ {updated}개 PatientState를 "IN_PROGRESS"로 수정')
                )
        
        # Appointment 테이블 체크
        ongoing_appointments = Appointment.objects.filter(status='ongoing')
        self.stats['ongoing_found'] += ongoing_appointments.count()
        
        if ongoing_appointments.exists():
            self.issues.append({
                'type': 'ONGOING_STATE',
                'table': 'Appointment',
                'count': ongoing_appointments.count(),
                'message': f'{ongoing_appointments.count()}개의 Appointment에서 "ongoing" 상태 발견'
            })
            
            if self.fix:
                updated = ongoing_appointments.update(status='in_progress')
                self.stdout.write(
                    self.style.SUCCESS(f'  ✅ {updated}개 Appointment 상태를 "in_progress"로 수정')
                )
        
        # in_progress 카운트
        self.stats['in_progress_found'] = (
            Queue.objects.filter(state='in_progress').count() +
            PatientState.objects.filter(current_state='IN_PROGRESS').count()
        )
    
    def check_state_consistency(self):
        """Queue와 PatientState 간 일관성 체크"""
        if not self.json_output:
            self.stdout.write('\n🔍 Checking state consistency...')
        
        inconsistencies = []
        
        # 모든 PatientState 확인
        for patient_state in PatientState.objects.all():
            self.stats['total_patient_states'] += 1
            
            # 해당 사용자의 활성 큐 확인
            active_queues = Queue.objects.filter(
                user=patient_state.user,
                state__in=['waiting', 'called', 'in_progress']
            )
            
            if active_queues.exists():
                # 가장 우선순위가 높은 큐 상태 확인
                priority_queue = active_queues.order_by(
                    Q(state='in_progress') | Q(state='called') | Q(state='waiting'),
                    'queue_number'
                ).first()
                
                # 예상되는 Journey 상태
                expected_journey_state = None
                if priority_queue.state in ['waiting', 'delayed']:
                    expected_journey_state = PatientJourneyState.WAITING.value
                elif priority_queue.state == 'called':
                    expected_journey_state = PatientJourneyState.CALLED.value
                elif priority_queue.state == 'in_progress':
                    expected_journey_state = PatientJourneyState.IN_PROGRESS.value
                elif priority_queue.state == 'completed':
                    expected_journey_state = PatientJourneyState.COMPLETED.value
                
                # 불일치 확인
                if expected_journey_state and patient_state.current_state != expected_journey_state:
                    inconsistencies.append({
                        'user_id': str(patient_state.user.user_id),
                        'patient_state': patient_state.current_state,
                        'expected_state': expected_journey_state,
                        'queue_state': priority_queue.state
                    })
                    self.stats['inconsistencies'] += 1
                    
                    if self.verbose:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  ⚠️ 불일치: User {patient_state.user.email} - '
                                f'PatientState: {patient_state.current_state}, '
                                f'Expected: {expected_journey_state}'
                            )
                        )
                    
                    if self.fix:
                        patient_state.current_state = expected_journey_state
                        patient_state.save()
                        self.stdout.write(
                            self.style.SUCCESS(f'    ✅ PatientState 수정됨')
                        )
        
        if inconsistencies:
            self.issues.append({
                'type': 'STATE_INCONSISTENCY',
                'count': len(inconsistencies),
                'message': f'{len(inconsistencies)}개의 상태 불일치 발견',
                'details': inconsistencies[:10] if self.verbose else None
            })
    
    def check_orphaned_states(self):
        """고아 상태 확인 (Queue 없는 PatientState)"""
        if not self.json_output:
            self.stdout.write('\n🔍 Checking for orphaned states...')
        
        orphaned = []
        
        for patient_state in PatientState.objects.exclude(
            current_state__in=[
                PatientJourneyState.UNREGISTERED.value,
                PatientJourneyState.FINISHED.value
            ]
        ):
            # 활성 큐가 있는지 확인
            has_active_queue = Queue.objects.filter(
                user=patient_state.user,
                state__in=['waiting', 'called', 'in_progress']
            ).exists()
            
            # 오늘 예약이 있는지 확인
            has_today_appointment = Appointment.objects.filter(
                user=patient_state.user,
                scheduled_at__date=timezone.now().date()
            ).exists()
            
            # 큐도 없고 예약도 없는데 활성 상태인 경우
            if not has_active_queue and not has_today_appointment:
                if patient_state.current_state in [
                    PatientJourneyState.WAITING.value,
                    PatientJourneyState.CALLED.value,
                    PatientJourneyState.IN_PROGRESS.value
                ]:
                    orphaned.append({
                        'user_id': str(patient_state.user.user_id),
                        'state': patient_state.current_state,
                        'updated_at': patient_state.updated_at.isoformat()
                    })
                    self.stats['orphaned_states'] += 1
                    
                    if self.fix:
                        # COMPLETED 상태로 변경
                        patient_state.current_state = PatientJourneyState.COMPLETED.value
                        patient_state.save()
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  ✅ User {patient_state.user.email}의 고아 상태를 COMPLETED로 수정'
                            )
                        )
        
        if orphaned:
            self.issues.append({
                'type': 'ORPHANED_STATE',
                'count': len(orphaned),
                'message': f'{len(orphaned)}개의 고아 상태 발견',
                'details': orphaned[:10] if self.verbose else None
            })
    
    def check_transition_logs(self):
        """상태 전이 로그 검증"""
        if not self.json_output:
            self.stdout.write('\n📝 Checking transition logs...')
        
        # 최근 24시간 내 전이 로그
        recent_transitions = StateTransition.objects.filter(
            created_at__gte=timezone.now() - timedelta(hours=24)
        )
        
        invalid_transitions = []
        
        for transition in recent_transitions:
            # 유효하지 않은 전이 확인
            if transition.from_state and transition.to_state:
                # 전이 규칙 확인 (간단한 버전)
                valid = self.is_valid_transition(transition.from_state, transition.to_state)
                if not valid:
                    invalid_transitions.append({
                        'id': str(transition.transition_id),
                        'from': transition.from_state,
                        'to': transition.to_state,
                        'created_at': transition.created_at.isoformat()
                    })
        
        if invalid_transitions:
            self.issues.append({
                'type': 'INVALID_TRANSITION',
                'count': len(invalid_transitions),
                'message': f'{len(invalid_transitions)}개의 잘못된 상태 전이 발견',
                'details': invalid_transitions[:10] if self.verbose else None
            })
    
    def check_queue_patient_sync(self):
        """Queue와 Patient 수 일치 확인"""
        if not self.json_output:
            self.stdout.write('\n📊 Checking queue-patient synchronization...')
        
        # 통계 수집
        self.stats['total_users'] = User.objects.filter(role='patient').count()
        self.stats['total_queues'] = Queue.objects.count()
        
        # 활성 큐가 있는 사용자
        users_with_queues = Queue.objects.filter(
            state__in=['waiting', 'called', 'in_progress']
        ).values('user').distinct().count()
        
        # PatientState가 있는 사용자
        users_with_state = PatientState.objects.values('user').distinct().count()
        
        # 불일치 확인
        if users_with_queues != users_with_state:
            self.issues.append({
                'type': 'USER_STATE_MISMATCH',
                'message': f'큐가 있는 사용자({users_with_queues})와 '
                          f'PatientState가 있는 사용자({users_with_state}) 수 불일치'
            })
    
    def is_valid_transition(self, from_state, to_state):
        """상태 전이 유효성 확인"""
        # 간단한 유효성 체크 (실제로는 STATE_TRANSITIONS 사용)
        valid_transitions = {
            'UNREGISTERED': ['ARRIVED'],
            'ARRIVED': ['REGISTERED'],
            'REGISTERED': ['WAITING'],
            'WAITING': ['CALLED', 'COMPLETED'],
            'CALLED': ['IN_PROGRESS', 'WAITING'],
            'IN_PROGRESS': ['COMPLETED'],
            'COMPLETED': ['PAYMENT', 'WAITING'],
            'PAYMENT': ['FINISHED'],
            'FINISHED': ['UNREGISTERED']
        }
        
        return to_state in valid_transitions.get(from_state, [])
    
    def print_statistics(self):
        """통계 정보 수집"""
        # Raw SQL로 추가 체크
        with connection.cursor() as cursor:
            # ongoing 레코드 수 직접 확인
            cursor.execute("SELECT COUNT(*) FROM queues WHERE state = 'ongoing'")
            raw_ongoing_queues = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM patient_states WHERE current_state = 'ONGOING'")
            raw_ongoing_patients = cursor.fetchone()[0]
            
            if raw_ongoing_queues > 0 or raw_ongoing_patients > 0:
                self.issues.append({
                    'type': 'RAW_SQL_CHECK',
                    'message': f'Raw SQL: Queue({raw_ongoing_queues}), '
                              f'PatientState({raw_ongoing_patients})에서 ongoing 발견'
                })
    
    def print_summary(self):
        """요약 출력"""
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS('\n📊 체크 결과 요약\n'))
        
        self.stdout.write(f'총 사용자: {self.stats["total_users"]}')
        self.stdout.write(f'총 큐: {self.stats["total_queues"]}')
        self.stdout.write(f'총 PatientState: {self.stats["total_patient_states"]}')
        self.stdout.write(f'\n발견된 문제:')
        self.stdout.write(f'  - "ongoing" 상태: {self.stats["ongoing_found"]}개')
        self.stdout.write(f'  - "in_progress" 상태: {self.stats["in_progress_found"]}개')
        self.stdout.write(f'  - 상태 불일치: {self.stats["inconsistencies"]}개')
        self.stdout.write(f'  - 고아 상태: {self.stats["orphaned_states"]}개')
        
        if self.issues:
            self.stdout.write('\n' + self.style.WARNING('⚠️ 발견된 이슈:'))
            for issue in self.issues:
                self.stdout.write(f"  - [{issue['type']}] {issue['message']}")
        else:
            self.stdout.write('\n' + self.style.SUCCESS('✅ 모든 상태가 정상입니다!'))
        
        if self.stats['ongoing_found'] == 0:
            self.stdout.write(
                self.style.SUCCESS('\n✨ "ongoing" 상태가 완전히 제거되었습니다!')
            )
        
        self.stdout.write('\n' + '=' * 50)
    
    def print_json_result(self):
        """JSON 형식으로 결과 출력"""
        result = {
            'timestamp': timezone.now().isoformat(),
            'stats': self.stats,
            'issues': self.issues,
            'health_status': 'HEALTHY' if not self.issues else 'UNHEALTHY'
        }
        self.stdout.write(json.dumps(result, indent=2, ensure_ascii=False))