import { RESPONSE_TEMPLATES } from './constants';

const API_BASE_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:5000';

export const chatbotAPI = {
  async sendMessage(message) {
    try {
      // JWT 토큰 가져오기
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_BASE_URL}/api/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // JWT 토큰이 있으면 Authorization 헤더에 추가
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          question: message,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // 백엔드 응답 구조에 맞게 파싱
      if (data.success && data.data) {
        return {
          success: true,
          message: data.data.response?.content || data.data.content || data.message || RESPONSE_TEMPLATES.DEVELOPMENT,
          structuredData: data.data.response || null,
          context: data.data.context || {}
        };
      }
      
      return {
        success: true,
        message: data.response || data.message || RESPONSE_TEMPLATES.DEVELOPMENT,
        context: data.context || {}
      };
    } catch (error) {
      console.error('챗봇 API 오류:', error);
      
      const fallbackResponse = this.getFallbackResponse(message);
      return {
        success: false,
        message: typeof fallbackResponse === 'string' ? fallbackResponse : fallbackResponse.content || '죄송합니다. 응답을 처리할 수 없습니다.',
        structuredData: typeof fallbackResponse === 'object' ? fallbackResponse : null,
        error: error.message
      };
    }
  },

  getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    // 서버 연결 실패 시 기본 응답만 제공
    const isLoggedIn = !!localStorage.getItem('access_token');
    
    // 병원 정보 관련 질문
    if (lowerMessage.includes('병원') || lowerMessage.includes('연락') || lowerMessage.includes('운영') || 
        lowerMessage.includes('전화') || lowerMessage.includes('번호')) {
      return `📞 대표: 1588-0000
⏰ 진료: 평일 8:30-17:30
🚨 응급실: 24시간 (02-0000-0119)`;
    }
    
    // 대기 시간/순서 관련 질문 - 서버 연결 실패시 일반 응답
    if ((lowerMessage.includes('대기') && (lowerMessage.includes('시간') || lowerMessage.includes('순서'))) || 
        lowerMessage.includes('순서') || 
        (lowerMessage.includes('시간') && !lowerMessage.includes('운영') && !lowerMessage.includes('진료시간')) || 
        lowerMessage.includes('기다')) {
      
      return isLoggedIn 
        ? '서버 연결이 불안정합니다. 잠시 후 다시 시도하시거나 원무과(1588-0000)로 문의해주세요.'
        : '로그인하시면 실시간 대기현황을 확인할 수 있어요.';
    }
    
    // 진료비 관련 질문
    if (lowerMessage.includes('진료비') || lowerMessage.includes('비용') || lowerMessage.includes('수납') || 
        lowerMessage.includes('얼마') || lowerMessage.includes('가격')) {
      return isLoggedIn
        ? '서버 연결이 불안정합니다. 1층 원무과에서 확인해주세요.'
        : '로그인하시면 진료비를 확인할 수 있어요. 수납은 1층 원무과예요.';
    }
    
    // 검사 준비사항 관련 질문
    if ((lowerMessage.includes('준비') && lowerMessage.includes('검사')) || 
        (lowerMessage.includes('검사') && lowerMessage.includes('준비사항'))) {
      
      return '일반적으로 혈액검사는 8시간 금식이 필요해요. 자세한 준비사항은 원무과(1588-0000)에 확인하세요.';
    }
    
    // 진료 순서 관련 질문
    if (lowerMessage.includes('진료') || lowerMessage.includes('일정')) {
      return isLoggedIn
        ? '서버 연결이 불안정합니다. 원무과에서 확인해주세요.'
        : '로그인하시면 오늘 일정을 확인할 수 있어요.';
    }
    
    
    // 주의사항 관련 질문
    if (lowerMessage.includes('주의') || lowerMessage.includes('사항')) {
      return '검사 중 움직이지 마세요. 휴대폰 진동 설정하세요.';
    }
    
    // 편의시설 관련 질문
    if (lowerMessage.includes('카페') || lowerMessage.includes('편의점') || lowerMessage.includes('식당')) {
      return '☕카페: 1층(7-19시)\n🏪편의점: B1층(24시간)\n💊약국: 1층(8:30-18시)';
    }
    
    // 주차 관련 질문
    if (lowerMessage.includes('주차')) {
      return '지하 1-3층, 30분 무료, 10분당 500원, 진료시 50% 할인';
    }
    
    // 기본 응답
    return '무엇을 도와드릴까요?';
  },

  async getQuickResponses() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/quick-responses`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.responses || [];
    } catch (error) {
      console.error('빠른 응답 가져오기 오류:', error);
      return [];
    }
  }
};

export const formatMessage = (text, type = 'bot', structuredData = null) => ({
  id: Date.now() + Math.random(),
  type,
  text: typeof text === 'string' ? text : (text.content || ''),
  structuredData: structuredData || (typeof text === 'object' ? text : null),
  timestamp: new Date()
});

export const simulateTypingDelay = (text) => {
  const baseDelay = 800;
  const charDelay = text.length * 20;
  return Math.min(baseDelay + charDelay, 3000);
};