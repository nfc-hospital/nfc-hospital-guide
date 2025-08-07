"""
의료법 준수를 위한 안전장치 모듈
"""

def medical_safety_filter(response, question=""):
    """응답 필터링 및 면책조항 추가"""
    
    disclaimers = {
        "diagnosis": "※ 이 정보는 참고용이며, 정확한 진단은 의료진과 상담하세요.",
        "medication": "※ 약물 복용은 반드시 의사/약사와 상담 후 결정하세요.",
        "emergency": "※ 응급상황 시 즉시 119에 연락하거나 응급실을 방문하세요.",
        "treatment": "※ 치료 방법은 개인차가 있으므로 의료진과 상담하세요.",
        "general": "※ 이 정보는 일반적인 안내사항이며, 개인별 상황은 다를 수 있습니다."
    }

    # 의료 관련 키워드 감지
    medical_keywords = {
        "diagnosis": ['진단', '병명', '질환', '증상', '병', '아프', '통증'],
        "medication": ['약', '복용', '처방', '용량', '부작용', '먹어도', '드셔도'],
        "emergency": ['응급', '급성', '심한 통증', '출혈', '호흡곤란', '의식잃'],
        "treatment": ['치료', '수술', '시술', '요법', '처치']
    }

    # 금지된 주제들
    prohibited_topics = [
        '처방전', '용량', '진단서', '소견서', '치료법', '수술 방법',
        '약물 조합', '부작용 해결', '증상 진단'
    ]

    question_lower = question.lower()
    response_lower = response.lower()
    
    # 금지된 주제 체크
    for topic in prohibited_topics:
        if topic in question_lower:
            return {
                "response": "죄송합니다. 의료적 판단이 필요한 사항은 의료진과 직접 상담해주세요.",
                "disclaimer": disclaimers["general"],
                "suggest_action": "간호사 호출 또는 안내데스크 문의",
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

    return {
        "response": response,
        "disclaimer": "\n".join(added_disclaimers),
        "blocked": False
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