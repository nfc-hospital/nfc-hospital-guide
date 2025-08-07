/**
 * 오프라인 FAQ 데이터 캐시
 */

export const offlineFAQ = {
  "검사 준비사항": {
    "CT": {
      "preparation": ["금식 6시간", "금속류 제거", "검사복 착용"],
      "duration": "15-30분",
      "location": "본관 3층 304호",
      "notes": "조영제 사용 시 알레르기 확인 필요"
    },
    "MRI": {
      "preparation": ["금식 4시간", "모든 금속 제거", "심박동기 확인"],
      "duration": "30-60분", 
      "location": "본관 지하 1층",
      "notes": "폐소공포증 있으시면 미리 알려주세요"
    },
    "X-ray": {
      "preparation": ["금속류 제거", "임신 여부 확인"],
      "duration": "5-10분",
      "location": "본관 2층 201호",
      "notes": "임신 중이시면 반드시 의료진에게 알려주세요"
    },
    "혈액검사": {
      "preparation": ["12시간 금식", "물 소량 섭취 가능"],
      "duration": "5분",
      "location": "본관 1층 채혈실",
      "notes": "혈관이 가늘면 채혈이 어려울 수 있어요"
    },
    "내시경": {
      "preparation": ["8-12시간 금식", "틀니 제거", "렌즈 제거"],
      "duration": "20-30분",
      "location": "본관 2층 내시경실",
      "notes": "검사 후 30분간 금식이 필요해요"
    }
  },
  
  "검사실 위치": {
    "CT실": "본관 3층 304호",
    "MRI실": "본관 지하 1층",
    "X-ray실": "본관 2층 201호",
    "채혈실": "본관 1층",
    "내시경실": "본관 2층 203호",
    "초음파실": "본관 2층 205호"
  },

  "대기시간 정보": {
    "일반진료": "10-30분",
    "X-ray": "5-15분",
    "CT": "예약시간 기준",
    "MRI": "예약시간 기준",
    "혈액검사": "5-10분",
    "내시경": "예약시간 기준"
  },

  "병원 정보": {
    "운영시간": {
      "평일": "09:00 - 18:00",
      "토요일": "09:00 - 13:00",
      "일요일": "휴진",
      "응급실": "24시간"
    },
    "주차": {
      "위치": "지하 1-3층, 별관 옆",
      "요금": "최초 30분 무료, 이후 10분당 500원",
      "진료시": "4시간 무료",
      "시간": "24시간 운영"
    },
    "연락처": {
      "대표전화": "02-123-4567",
      "응급실": "02-123-4568",
      "예약": "02-123-4569"
    }
  }
};

/**
 * 오프라인 FAQ 검색
 */
export function searchOfflineFAQ(question) {
  const question_lower = question.toLowerCase();
  
  // 검사 준비사항 검색
  for (const [examType, info] of Object.entries(offlineFAQ["검사 준비사항"])) {
    if (question_lower.includes(examType.toLowerCase()) || 
        question_lower.includes(examType.toLowerCase().replace('-', '')) ||
        question_lower.includes(examType.toLowerCase().replace('ray', '레이'))) {
      
      const response = `${examType} 검사 안내:\n\n` +
        `📍 위치: ${info.location}\n` +
        `⏱️ 소요시간: ${info.duration}\n` +
        `📝 준비사항:\n${info.preparation.map(item => `• ${item}`).join('\n')}\n\n` +
        `💡 ${info.notes}`;
      
      return {
        query: question,
        response: response,
        confidence: 0.8,
        source: "offline_cache",
        relatedInfo: {
          preparation: info.preparation,
          location: info.location
        }
      };
    }
  }

  // 위치 검색
  if (question_lower.includes('위치') || question_lower.includes('어디') || question_lower.includes('찾아')) {
    for (const [room, location] of Object.entries(offlineFAQ["검사실 위치"])) {
      if (question_lower.includes(room.toLowerCase().replace('실', ''))) {
        return {
          query: question,
          response: `${room}은 ${location}에 있습니다.\n\n병원 안내도를 참고하시거나, 안내데스크에 문의해주세요.`,
          confidence: 0.9,
          source: "offline_cache",
          relatedInfo: {
            location: location
          }
        };
      }
    }
  }

  // 대기시간 검색
  if (question_lower.includes('대기') || question_lower.includes('시간') || question_lower.includes('얼마나')) {
    let response = "일반적인 대기시간 안내:\n\n";
    Object.entries(offlineFAQ["대기시간 정보"]).forEach(([type, time]) => {
      response += `• ${type}: ${time}\n`;
    });
    response += "\n※ 실제 대기시간은 당일 상황에 따라 달라질 수 있습니다.";
    
    return {
      query: question,
      response: response,
      confidence: 0.7,
      source: "offline_cache"
    };
  }

  // 주차 관련
  if (question_lower.includes('주차')) {
    const parkingInfo = offlineFAQ["병원 정보"]["주차"];
    const response = `주차장 안내:\n\n` +
      `📍 위치: ${parkingInfo.위치}\n` +
      `💰 요금: ${parkingInfo.요금}\n` +
      `🏥 진료시: ${parkingInfo.진료시}\n` +
      `⏰ 운영: ${parkingInfo.시간}`;
    
    return {
      query: question,
      response: response,
      confidence: 0.9,
      source: "offline_cache"
    };
  }

  // 운영시간 관련
  if (question_lower.includes('시간') || question_lower.includes('운영') || question_lower.includes('언제')) {
    const hours = offlineFAQ["병원 정보"]["운영시간"];
    const response = `병원 운영시간:\n\n` +
      `• 평일: ${hours.평일}\n` +
      `• 토요일: ${hours.토요일}\n` +
      `• 일요일: ${hours.일요일}\n` +
      `• 응급실: ${hours.응급실}`;
    
    return {
      query: question,
      response: response,
      confidence: 0.9,
      source: "offline_cache"
    };
  }

  // 기본 응답
  return {
    query: question,
    response: "죄송합니다. 현재 오프라인 모드로 실행 중이어서 제한된 정보만 제공할 수 있습니다.\n\n" +
              "다음 주제에 대해 질문해보세요:\n" +
              "• 검사 준비사항 (CT, MRI, X-ray, 혈액검사 등)\n" +
              "• 검사실 위치\n" +
              "• 병원 운영시간\n" +
              "• 주차 정보\n" +
              "• 일반적인 대기시간\n\n" +
              "더 자세한 정보는 병원 직원에게 문의해주세요.",
    confidence: 0.3,
    source: "offline_fallback"
  };
}

/**
 * 네트워크 상태 확인
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * 로컬 스토리지에 채팅 기록 저장
 */
export function saveChatHistory(messages) {
  try {
    sessionStorage.setItem('chatHistory', JSON.stringify(messages));
  } catch (error) {
    console.warn('채팅 기록 저장 실패:', error);
  }
}

/**
 * 로컬 스토리지에서 채팅 기록 불러오기
 */
export function loadChatHistory() {
  try {
    const saved = sessionStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('채팅 기록 불러오기 실패:', error);
    return null;
  }
}

/**
 * 응급 상황 키워드 체크 (오프라인용)
 */
export function checkEmergencyKeywords(question) {
  const emergencyKeywords = [
    '응급', '급한', '심한 통증', '호흡곤란', '의식', '출혈',
    '쓰러', '기절', '가슴 아', '숨 막', '어지러'
  ];
  
  const question_lower = question.toLowerCase();
  return emergencyKeywords.some(keyword => question_lower.includes(keyword));
}

/**
 * 응급 상황 응답 (오프라인용)
 */
export function getEmergencyResponse() {
  return {
    query: "응급상황",
    response: "🚨 응급 상황이 의심됩니다.\n\n" +
              "즉시 다음 조치를 취해주세요:\n\n" +
              "1️⃣ 응급실로 바로 내원하세요\n" +
              "📞 119에 신고하세요\n" +
              "🏥 병원 응급실: 1층\n" +
              "☎️ 응급실 직통: 02-123-4568\n\n" +
              "환자가 의식이 없거나 호흡이 어려우면 즉시 119를 부르세요.",
    confidence: 1.0,
    source: "emergency_protocol",
    priority: "EMERGENCY"
  };
}