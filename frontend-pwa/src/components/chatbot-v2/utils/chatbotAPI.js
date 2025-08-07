import { RESPONSE_TEMPLATES } from './constants';

const API_BASE_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:5000';

export const chatbotAPI = {
  async sendMessage(message, context = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.response || RESPONSE_TEMPLATES.DEVELOPMENT,
        context: data.context || {}
      };
    } catch (error) {
      console.error('챗봇 API 오류:', error);
      
      return {
        success: false,
        message: this.getFallbackResponse(message),
        error: error.message
      };
    }
  },

  getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('위치') || lowerMessage.includes('어디')) {
      return '위치 안내가 필요하시군요. NFC 태그를 스캔하거나 병원 안내데스크에 문의해 주세요.';
    }
    
    if (lowerMessage.includes('시간') || lowerMessage.includes('기다려')) {
      return '대기 시간은 현재 상황에 따라 달라질 수 있습니다. 접수창구에서 확인해 주시기 바랍니다.';
    }
    
    if (lowerMessage.includes('준비') || lowerMessage.includes('검사')) {
      return '검사 준비사항은 검사 종류에 따라 다릅니다. 담당 의료진에게 문의해 주세요.';
    }
    
    if (lowerMessage.includes('주차')) {
      return '지하 주차장을 이용해 주세요. 주차권은 접수 시 할인받으실 수 있습니다.';
    }
    
    if (lowerMessage.includes('화장실')) {
      return '화장실은 각 층 엘리베이터 옆에 위치해 있습니다.';
    }
    
    if (lowerMessage.includes('약국')) {
      return '원내 약국은 1층 로비 우측에 위치해 있습니다.';
    }
    
    return RESPONSE_TEMPLATES.DEVELOPMENT;
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

export const formatMessage = (text, type = 'bot') => ({
  id: Date.now() + Math.random(),
  type,
  text,
  timestamp: new Date()
});

export const simulateTypingDelay = (text) => {
  const baseDelay = 800;
  const charDelay = text.length * 20;
  return Math.min(baseDelay + charDelay, 3000);
};