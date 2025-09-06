"""
질문 의도 분류 서비스
사용자 질문을 분석하여 적절한 응답 유형 결정
"""
import re
from typing import Dict, List, Tuple, Optional
from enum import Enum

class IntentCategory(Enum):
    """질문 의도 카테고리"""
    EMERGENCY = "emergency"          # 응급 상황
    QUEUE_STATUS = "queue_status"    # 대기열/순서 확인
    WAIT_TIME = "wait_time"          # 대기 시간
    LOCATION = "location"            # 위치/길찾기
    PREPARATION = "preparation"      # 검사 준비사항
    SCHEDULE = "schedule"            # 일정/예약
    PAYMENT = "payment"              # 수납/진료비
    FACILITY = "facility"            # 편의시설
    PARKING = "parking"              # 주차
    HOSPITAL_INFO = "hospital_info"  # 병원 정보
    MEDICAL_INFO = "medical_info"    # 의료 정보
    GENERAL = "general"              # 일반 문의

class IntentClassifier:
    """사용자 질문 의도 분류기"""
    
    def __init__(self):
        # 카테고리별 키워드 패턴
        self.patterns = {
            IntentCategory.EMERGENCY: {
                'keywords': ['응급', '급해', '급한', '심한 통증', '호흡곤란', 
                           '의식', '출혈', '쓰러', '기절', '가슴', '숨'],
                'priority': 1
            },
            IntentCategory.QUEUE_STATUS: {
                'keywords': ['대기', '순서', '순번', '몇 번', '내 차례', 
                           '언제 들어가', '호출', '불렀'],
                'priority': 2
            },
            IntentCategory.WAIT_TIME: {
                'keywords': ['기다', '대기 시간', '얼마나 걸려', '언제까지', 
                           '몇 분', '오래'],
                'priority': 3
            },
            IntentCategory.LOCATION: {
                'keywords': ['어디', '위치', '찾아가', '가는 길', '어떻게 가',
                           '몇 층', '건물', '검사실'],
                'priority': 4
            },
            IntentCategory.PREPARATION: {
                'keywords': ['준비', '준비사항', '금식', '주의사항', '검사 전',
                           '미리', '챙겨', '필요한'],
                'priority': 5
            },
            IntentCategory.SCHEDULE: {
                'keywords': ['일정', '예약', '예정', '스케줄', '오늘', '내일',
                           '언제', '시간표'],
                'priority': 6
            },
            IntentCategory.PAYMENT: {
                'keywords': ['수납', '진료비', '비용', '얼마', '결제', '카드',
                           '현금', '할인', '보험'],
                'priority': 7
            },
            IntentCategory.FACILITY: {
                'keywords': ['카페', '편의점', '식당', '화장실', '은행', 'ATM',
                           '약국', '휴게실', '매점'],
                'priority': 8
            },
            IntentCategory.PARKING: {
                'keywords': ['주차', '주차장', '주차료', '정산', '할인권',
                           '무료주차', '발렛'],
                'priority': 9
            },
            IntentCategory.HOSPITAL_INFO: {
                'keywords': ['병원', '전화', '연락처', '운영시간', '진료시간',
                           '휴진', '영업', '문의'],
                'priority': 10
            },
            IntentCategory.MEDICAL_INFO: {
                'keywords': ['검사', '진료', '치료', '수술', '약', '처방',
                           '결과', '소견서', '진단서'],
                'priority': 11
            }
        }
        
        # 응답 긴급도 레벨
        self.urgency_levels = {
            IntentCategory.EMERGENCY: 'critical',
            IntentCategory.QUEUE_STATUS: 'high',
            IntentCategory.WAIT_TIME: 'high',
            IntentCategory.LOCATION: 'medium',
            IntentCategory.PREPARATION: 'medium',
            IntentCategory.SCHEDULE: 'medium',
            IntentCategory.PAYMENT: 'low',
            IntentCategory.FACILITY: 'low',
            IntentCategory.PARKING: 'low',
            IntentCategory.HOSPITAL_INFO: 'low',
            IntentCategory.MEDICAL_INFO: 'medium',
            IntentCategory.GENERAL: 'low'
        }
        
    def classify(self, text: str) -> Tuple[IntentCategory, float, str]:
        """
        텍스트 의도 분류
        
        Returns:
            (카테고리, 신뢰도, 긴급도)
        """
        text_lower = text.lower()
        scores = {}
        
        # 각 카테고리별 점수 계산
        for category, pattern_info in self.patterns.items():
            score = self._calculate_score(text_lower, pattern_info['keywords'])
            if score > 0:
                scores[category] = score
                
        # 가장 높은 점수의 카테고리 선택
        if scores:
            best_category = max(scores, key=scores.get)
            confidence = min(scores[best_category] / 10.0, 1.0)  # 0-1 범위로 정규화
            urgency = self.urgency_levels.get(best_category, 'low')
            return best_category, confidence, urgency
            
        return IntentCategory.GENERAL, 0.5, 'low'
        
    def _calculate_score(self, text: str, keywords: List[str]) -> float:
        """키워드 매칭 점수 계산"""
        score = 0
        for keyword in keywords:
            if keyword in text:
                # 정확한 매칭은 높은 점수
                score += 3
            elif any(word in text for word in keyword.split()):
                # 부분 매칭은 낮은 점수
                score += 1
        return score
        
    def extract_entities(self, text: str, category: IntentCategory) -> Dict:
        """카테고리별 엔티티 추출"""
        entities = {}
        
        if category == IntentCategory.LOCATION:
            # 층수 추출
            floor_match = re.search(r'(\d+)\s*층', text)
            if floor_match:
                entities['floor'] = floor_match.group(1)
                
            # 건물명 추출
            buildings = ['본관', '별관', '신관', '암센터', '응급실']
            for building in buildings:
                if building in text:
                    entities['building'] = building
                    break
                    
        elif category == IntentCategory.SCHEDULE:
            # 시간 추출
            time_match = re.search(r'(\d{1,2})\s*시', text)
            if time_match:
                entities['time'] = f"{time_match.group(1)}시"
                
            # 날짜 키워드
            if '오늘' in text:
                entities['date'] = 'today'
            elif '내일' in text:
                entities['date'] = 'tomorrow'
                
        elif category == IntentCategory.PAYMENT:
            # 결제 방법
            if '카드' in text:
                entities['method'] = 'card'
            elif '현금' in text:
                entities['method'] = 'cash'
                
        return entities
        
    def get_response_template(self, category: IntentCategory) -> str:
        """카테고리별 응답 템플릿 반환"""
        templates = {
            IntentCategory.EMERGENCY: 
                "🚨 응급 상황으로 보입니다. 즉시 응급실로 가시거나 119에 신고하세요.",
                
            IntentCategory.QUEUE_STATUS:
                "대기 상태를 확인하겠습니다.",
                
            IntentCategory.WAIT_TIME:
                "예상 대기 시간을 확인하겠습니다.",
                
            IntentCategory.LOCATION:
                "위치 정보를 안내해드리겠습니다.",
                
            IntentCategory.PREPARATION:
                "검사 준비사항을 안내해드리겠습니다.",
                
            IntentCategory.SCHEDULE:
                "일정 정보를 확인하겠습니다.",
                
            IntentCategory.PAYMENT:
                "수납 관련 정보를 안내해드리겠습니다.",
                
            IntentCategory.FACILITY:
                "편의시설 정보를 안내해드리겠습니다.",
                
            IntentCategory.PARKING:
                "주차 정보를 안내해드리겠습니다.",
                
            IntentCategory.HOSPITAL_INFO:
                "병원 정보를 안내해드리겠습니다.",
                
            IntentCategory.MEDICAL_INFO:
                "의료 정보를 안내해드리겠습니다.",
                
            IntentCategory.GENERAL:
                "문의하신 내용에 대해 답변드리겠습니다."
        }
        
        return templates.get(category, "도움을 드리겠습니다.")
        
    def should_use_gpt(self, category: IntentCategory, confidence: float) -> bool:
        """GPT 사용 여부 결정 - 더 유연한 기준 적용"""
        # 응급 상황은 항상 사전 정의된 응답 사용 (안전 우선)
        if category == IntentCategory.EMERGENCY:
            return False
            
        # 신뢰도가 매우 낮으면 GPT 사용
        if confidence < 0.5:
            return True
            
        # 복잡한 질문 카테고리는 GPT 우선 사용
        gpt_preferred_categories = [
            IntentCategory.MEDICAL_INFO,
            IntentCategory.GENERAL,
            IntentCategory.PREPARATION,  # 검사별로 다양한 준비사항
            IntentCategory.SCHEDULE      # 복잡한 일정 조회
        ]
        
        if category in gpt_preferred_categories:
            return True
            
        # 단순 정보 조회는 구조화된 응답 사용
        structured_categories = [
            IntentCategory.HOSPITAL_INFO,
            IntentCategory.FACILITY,
            IntentCategory.PARKING
        ]
        
        if category in structured_categories and confidence > 0.8:
            return False
            
        # 그 외의 경우 신뢰도가 낮거나 애매하면 GPT 사용
        return confidence < 0.6