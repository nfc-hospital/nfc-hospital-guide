"""
환자 컨텍스트 관리 서비스
Django API와 연동하여 실시간 환자 정보 제공
"""
import requests
from datetime import datetime
from typing import Dict, Optional, List
import logging

logger = logging.getLogger(__name__)

class ContextManager:
    """환자 상태 및 병원 정보 컨텍스트 관리"""
    
    PATIENT_STATES = {
        'UNREGISTERED': '병원 도착 전 상태입니다. 예약 정보를 확인하고 병원에 방문해주세요.',
        'ARRIVED': '병원에 도착하셨습니다. 1층 무인 접수기 또는 접수 창구에서 접수를 진행해주세요.',
        'REGISTERED': '접수가 완료되었습니다. 검사실로 이동해주세요.',
        'WAITING': '대기 중입니다. 호출될 때까지 대기실에서 기다려주세요.',
        'CALLED': '호출되었습니다. 검사실로 입장해주세요.',
        'ONGOING': '검사가 진행 중입니다.',
        'COMPLETED': '검사가 완료되었습니다. 다음 일정을 확인해주세요.',
        'PAYMENT': '수납이 필요합니다. 1층 원무과에서 수납을 진행해주세요.',
        'FINISHED': '모든 절차가 완료되었습니다. 안전히 귀가하세요.'
    }
    
    def __init__(self, django_api_url: str = 'http://localhost:8000'):
        self.api_url = django_api_url
        self.session = requests.Session()
        
    def get_guest_context(self) -> Dict:
        """비로그인 사용자용 기본 컨텍스트"""
        return {
            'timestamp': datetime.now().isoformat(),
            'is_authenticated': False,
            'is_guest': True,
            'patient_state': 'GUEST',
            'current_queues': [],
            'appointments': [],
            'location': None,
            'hospital_info': self._get_hospital_info(),
            'available_services': [
                '병원 시설 안내',
                '진료 시간 안내',
                '위치 및 교통편',
                '일반 검사 정보',
                '주차 안내',
                '편의시설 정보'
            ]
        }
        
    def get_patient_context(self, user_id: Optional[str] = None, 
                           auth_token: Optional[str] = None) -> Dict:
        """환자의 현재 상태 및 관련 정보 조회"""
        
        context = {
            'timestamp': datetime.now().isoformat(),
            'is_authenticated': False,
            'patient_state': None,
            'current_queues': [],
            'appointments': [],
            'location': None,
            'hospital_info': self._get_hospital_info()
        }
        
        if not user_id or not auth_token:
            return context
            
        try:
            # Django API에서 환자 정보 조회
            headers = {'Authorization': f'Bearer {auth_token}'}
            
            # 환자 상태 조회
            state_response = self.session.get(
                f'{self.api_url}/api/v1/auth/profile/',
                headers=headers,
                timeout=5
            )
            
            if state_response.status_code == 200:
                profile_data = state_response.json().get('data', {})
                context['is_authenticated'] = True
                context['patient_state'] = profile_data.get('state', 'UNREGISTERED')
                
            # 대기열 정보 조회
            queue_response = self.session.get(
                f'{self.api_url}/api/v1/queue/my-position',
                headers=headers,
                timeout=5
            )
            
            if queue_response.status_code == 200:
                queue_data = queue_response.json().get('data', {})
                context['current_queues'] = queue_data.get('queues', [])
                
            # 오늘의 예약 정보 조회
            appointments_response = self.session.get(
                f'{self.api_url}/api/v1/appointments/today',
                headers=headers,
                timeout=5
            )
            
            if appointments_response.status_code == 200:
                appointments_data = appointments_response.json().get('data', {})
                context['appointments'] = appointments_data.get('appointments', [])
                
        except Exception as e:
            logger.error(f"Error fetching patient context: {e}")
            
        return context
        
    def _get_hospital_info(self) -> Dict:
        """병원 기본 정보 반환"""
        return {
            'name': '서울대학교병원',
            'main_number': '1588-0000',
            'emergency': '02-0000-0119',
            'address': '서울특별시 종로구 대학로 101',
            'operating_hours': {
                'weekday': '평일: 08:30 - 17:30',
                'saturday': '토요일: 08:30 - 12:30',
                'sunday': '일요일/공휴일: 응급실만 운영'
            },
            'departments': {
                '내과': '02-0000-2001',
                '외과': '02-0000-2002',
                '정형외과': '02-0000-2003',
                '영상의학과': '02-0000-2004',
                '진단검사의학과': '02-0000-2005',
                '응급의학과': '02-0000-2119'
            },
            'facilities': {
                'cafe': {'location': '본관 1층', 'hours': '07:00-19:00'},
                'store': {'location': '본관 지하 1층', 'hours': '24시간'},
                'pharmacy': {'location': '본관 1층', 'hours': '08:30-18:00'},
                'atm': {'location': '본관 1층, 지하 1층', 'hours': '24시간'},
                'parking': {
                    'location': '지하 1-3층',
                    'fee': '최초 30분 무료, 10분당 500원',
                    'discount': '진료 확인 시 50% 할인'
                }
            }
        }
        
    def build_prompt_context(self, patient_context: Dict) -> str:
        """GPT 프롬프트용 컨텍스트 문자열 생성"""
        
        prompt_parts = []
        
        # 환자 상태 정보
        if patient_context.get('is_authenticated'):
            state = patient_context.get('patient_state')
            if state and state in self.PATIENT_STATES:
                prompt_parts.append(f"환자 현재 상태: {state}")
                prompt_parts.append(f"상태 설명: {self.PATIENT_STATES[state]}")
                
            # 대기열 정보
            queues = patient_context.get('current_queues', [])
            if queues:
                for queue in queues:
                    prompt_parts.append(
                        f"대기 정보: {queue.get('exam_name', '검사')} - "
                        f"대기번호 {queue.get('queue_number', 'N/A')}, "
                        f"예상 대기시간 {queue.get('estimated_wait_time', 0)}분"
                    )
                    
            # 예약 정보
            appointments = patient_context.get('appointments', [])
            if appointments:
                prompt_parts.append(f"오늘 예약: {len(appointments)}건")
                for apt in appointments[:3]:  # 최대 3개만 표시
                    prompt_parts.append(
                        f"- {apt.get('exam_name', '검사')} "
                        f"({apt.get('scheduled_time', '시간 미정')})"
                    )
        else:
            prompt_parts.append("비로그인 사용자 - 개인화된 정보 제공 불가")
            
        return "\n".join(prompt_parts)
        
    def get_state_based_suggestions(self, patient_state: str) -> List[str]:
        """환자 상태에 따른 추천 질문/안내"""
        
        suggestions = {
            'GUEST': [
                "병원 진료 시간이 어떻게 되나요?",
                "주차장 위치와 요금을 알려주세요",
                "MRI 검사는 어떻게 받나요?",
                "응급실은 24시간 운영하나요?",
                "병원 내 카페나 편의점이 있나요?"
            ],
            'UNREGISTERED': [
                "병원 위치가 어디인가요?",
                "주차장은 어디에 있나요?",
                "오늘 진료 예약을 확인하고 싶어요"
            ],
            'ARRIVED': [
                "접수는 어디서 하나요?",
                "무인 접수기 사용 방법을 알려주세요",
                "접수에 필요한 서류는 무엇인가요?"
            ],
            'REGISTERED': [
                "검사실 위치를 알려주세요",
                "검사 전 준비사항이 있나요?",
                "대기 시간은 얼마나 되나요?"
            ],
            'WAITING': [
                "내 대기 순서를 확인해주세요",
                "예상 대기 시간은 얼마나 되나요?",
                "대기 중에 식사를 해도 되나요?"
            ],
            'CALLED': [
                "검사실로 어떻게 가나요?",
                "검사 시 주의사항은 무엇인가요?",
                "검사는 얼마나 걸리나요?"
            ],
            'COMPLETED': [
                "다음 검사는 언제인가요?",
                "검사 결과는 언제 나오나요?",
                "수납은 어디서 하나요?"
            ],
            'PAYMENT': [
                "수납 창구 위치가 어디인가요?",
                "진료비는 얼마인가요?",
                "카드 결제가 가능한가요?"
            ],
            'FINISHED': [
                "주차료 정산은 어디서 하나요?",
                "다음 진료 예약은 어떻게 하나요?",
                "처방전은 어디서 받나요?"
            ]
        }
        
        return suggestions.get(patient_state, [
            "병원 시설 안내",
            "진료 시간 문의",
            "오늘의 일정 확인"
        ])