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

      // 새로운 백엔드 응답 구조에 맞게 파싱
      if (data.success && data.answer) {
        return {
          success: true,
          message: data.answer,
          authenticated: data.authenticated || false
        };
      }

      return {
        success: true,
        message: data.answer || data.message || '죄송합니다. 응답을 받지 못했습니다.',
        authenticated: false
      };
    } catch (error) {
      console.error('챗봇 API 오류:', error);

      const fallbackResponse = this.getFallbackResponse(message);
      return {
        success: false,
        message: fallbackResponse,
        error: error.message
      };
    }
  },

  getFallbackResponse(message) {
    // 서버 연결 실패 시 간단한 fallback 응답
    const lowerMessage = message.toLowerCase();

    // 병원 정보 관련 질문
    if (lowerMessage.includes('병원') || lowerMessage.includes('전화') || lowerMessage.includes('연락')) {
      return '죄송합니다. 챗봇 서버 연결에 실패했습니다.\n\n대표전화: 1588-0000\n응급실: 02-0000-0119 (24시간)';
    }

    // 주차 관련 질문
    if (lowerMessage.includes('주차')) {
      return '지하 1-3층 주차장 이용 가능합니다.\n최초 30분 무료, 10분당 500원\n진료 확인 시 50% 할인';
    }

    // 편의시설 관련 질문
    if (lowerMessage.includes('카페') || lowerMessage.includes('편의점')) {
      return '☕ 카페: 본관 1층 (07:00-19:00)\n🏪 편의점: 지하 1층 (24시간)\n💊 약국: 본관 1층';
    }

    // 기본 응답
    return '죄송합니다. 챗봇 서버에 연결할 수 없습니다.\n\n원무과(1588-0000)로 문의해주세요.';
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