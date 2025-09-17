"""
의료법 준수를 위한 안전장치 및 개인정보 보호 모듈
"""
import re

def remove_sensitive_info(text):
    """민감한 개인정보 패턴 제거"""
    patterns = [
        # 주민등록번호 패턴
        (r'\d{6}[-\s]?\d{7}', '[주민번호]'),
        # 전화번호 패턴
        (r'01[0-9][-\s]?\d{3,4}[-\s]?\d{4}', '[전화번호]'),
        (r'02[-\s]?\d{3,4}[-\s]?\d{4}', '[전화번호]'),
        # 이메일 주소
        (r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[이메일]'),
        # 신용카드 번호
        (r'\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}', '[카드번호]'),
        # 계좌번호 (일반적인 패턴)
        (r'\d{10,14}', '[계좌번호]'),
        # 환자 ID (P로 시작하는 ID)
        (r'P\d{8,}', '[환자ID]'),
        # 의료보험번호
        (r'[가-힣]{1,2}\d{8,10}', '[보험번호]'),
        # 상세 주소 (동/호수 정보)
        (r'\d+동\s*\d+호', '[상세주소]'),
        # IP 주소
        (r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', '[IP주소]')
    ]
    
    filtered_text = text
    for pattern, replacement in patterns:
        filtered_text = re.sub(pattern, replacement, filtered_text)
    
    return filtered_text

def medical_safety_filter(response, question=""):
    """응답 필터링 및 면책조항 추가 - 더 유연한 접근"""
    
    disclaimers = {
        "diagnosis": "💊 의료 안내: 정확한 진단은 의료진과 상담이 필요합니다.",
        "medication": "💊 복약 안내: 약물 관련 사항은 의사/약사와 확인하세요.",
        "emergency": "🚨 응급 안내: 응급상황 시 즉시 119 또는 응급실로!",
        "treatment": "🏥 치료 안내: 개인별 치료 계획은 의료진과 상담하세요.",
        "general": "ℹ️ 일반 안내: 자세한 사항은 의료진과 상담하세요."
    }

    # 의료 관련 키워드 감지 (부드러운 감지)
    medical_keywords = {
        "diagnosis": ['진단', '병명', '질환'],
        "medication": ['약', '복용', '처방', '용량'],
        "emergency": ['응급', '급성', '심한 통증', '출혈', '호흡곤란'],
        "treatment": ['치료', '수술', '시술']
    }

    # 엄격히 금지된 주제들만 제한
    strictly_prohibited = [
        '처방전 발급', '구체적 용량', '진단서 작성', '수술 집도',
        '약물 처방', '의료 행위'
    ]

    question_lower = question.lower()
    response_lower = response.lower()
    
    # 엄격히 금지된 주제만 차단
    for topic in strictly_prohibited:
        if topic in question_lower:
            return {
                "response": "죄송합니다. 이 내용은 의료진과 직접 상담이 필요한 사항입니다. 병원 진료 시 자세한 상담을 받으실 수 있습니다.",
                "disclaimer": disclaimers["general"],
                "suggest_action": "의료진 상담 필요",
                "blocked": True
            }

    # 면책조항 추가
    added_disclaimers = []
    
    for category, keywords in medical_keywords.items():
        if any(keyword in question_lower or keyword in response_lower for keyword in keywords):
            if disclaimers[category] not in added_disclaimers:
                added_disclaimers.append(disclaimers[category])

    # 일반적인 면책조항 추가
    if not added_disclaimers:
        added_disclaimers.append(disclaimers["general"])

    # 개인정보 필터링 적용
    filtered_response = remove_sensitive_info(response)
    
    return {
        "response": filtered_response,
        "disclaimer": "\n".join(added_disclaimers),
        "blocked": False,
        "filtered": filtered_response != response  # 필터링 여부 표시
    }

def check_emergency_keywords(question):
    """응급 상황 키워드 체크"""
    emergency_keywords = [
        '응급', '급한', '심한 통증', '호흡곤란', '의식', '출혈',
        '쓰러', '기절', '가슴 아', '숨 막', '어지러'
    ]
    
    question_lower = question.lower()
    for keyword in emergency_keywords:
        if keyword in question_lower:
            return True
    return False

def get_emergency_response():
    """응급 상황 응답"""
    return {
        "response": "응급 상황이 의심됩니다.\n\n"
                   "즉시 다음 조치를 취해주세요:\n"
                   "1. 응급실로 바로 내원하세요\n"
                   "2. 119에 신고하세요\n"
                   "3. 병원 응급실: 1층 응급실\n"
                   "4. 응급실 직통전화: 02-XXX-XXXX\n\n"
                   "환자가 의식이 없거나 호흡이 어려우면 즉시 119를 부르세요.",
        "disclaimer": "※ 응급상황 시 즉시 119에 연락하거나 응급실을 방문하세요.",
        "priority": "EMERGENCY"
    }