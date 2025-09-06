import { RESPONSE_TEMPLATES } from './constants';

const API_BASE_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:5000';

export const chatbotAPI = {
  async sendMessage(message, context = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: message,  // 'message'를 'question'으로 변경
          context,
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
      
      const fallbackResponse = this.getFallbackResponse(message, context);
      return {
        success: false,
        message: typeof fallbackResponse === 'string' ? fallbackResponse : fallbackResponse.content || '죄송합니다. 응답을 처리할 수 없습니다.',
        structuredData: typeof fallbackResponse === 'object' ? fallbackResponse : null,
        error: error.message
      };
    }
  },

  getFallbackResponse(message, context = {}) {
    const lowerMessage = message.toLowerCase();
    const { currentQueues, todaysAppointments, patientState, userId } = context;
    const isLoggedIn = !!userId;
    
    // 병원 정보 관련 질문
    if (lowerMessage.includes('병원') || lowerMessage.includes('연락') || lowerMessage.includes('운영') || 
        lowerMessage.includes('전화') || lowerMessage.includes('번호')) {
      return `📞 대표: 1588-0000
⏰ 진료: 평일 8:30-17:30
🚨 응급실: 24시간 (02-0000-0119)`;
    }
    
    // 대기 시간/순서 관련 질문
    if ((lowerMessage.includes('대기') && (lowerMessage.includes('시간') || lowerMessage.includes('순서'))) || 
        lowerMessage.includes('순서') || 
        (lowerMessage.includes('시간') && !lowerMessage.includes('운영') && !lowerMessage.includes('진료시간')) || 
        lowerMessage.includes('기다')) {
      
      if (!isLoggedIn) {
        return '로그인하시면 실시간 대기현황을 확인할 수 있어요.';
      }
      
      if (currentQueues && currentQueues.length > 0) {
        const activeQueue = currentQueues.find(q => q.state === 'waiting' || q.state === 'called');
        if (activeQueue) {
          const waitTime = activeQueue.estimated_wait_time || 15;
          return `대기번호 ${activeQueue.queue_number}번, 약 ${waitTime}분 남았어요.`;
        }
      }
      return '대기 중인 검사가 없어요.';
    }
    
    // 진료비 관련 질문
    if (lowerMessage.includes('진료비') || lowerMessage.includes('비용') || lowerMessage.includes('수납') || 
        lowerMessage.includes('얼마') || lowerMessage.includes('가격')) {
      if (!isLoggedIn) {
        return '로그인하시면 진료비를 확인할 수 있어요. 수납은 1층 원무과예요.';
      }
      const completedExams = todaysAppointments?.filter(apt => apt.status === 'completed') || [];
      if (completedExams.length > 0) {
        return `완료된 검사 ${completedExams.length}건, 1층 원무과에서 수납하세요.`;
      }
      return '아직 완료된 진료가 없어요.';
    }
    
    // 검사 준비사항 관련 질문
    if ((lowerMessage.includes('준비') && lowerMessage.includes('검사')) || 
        (lowerMessage.includes('검사') && lowerMessage.includes('준비사항'))) {
      
      if (!isLoggedIn) {
        return '로그인하시면 맞춤 준비사항 안내해드려요. 일반적으로 혈액검사는 8시간 금식이 필요해요.';
      }
      
      if (todaysAppointments && todaysAppointments.length > 0) {
        const upcomingExam = todaysAppointments.find(apt => 
          apt.status === 'scheduled' || apt.status === 'pending' || apt.status === 'waiting'
        );
        
        if (upcomingExam) {
          const examName = (upcomingExam.exam?.title || '').toLowerCase();
          if (examName.includes('혈액') || examName.includes('채혈')) {
            return '8시간 금식 필요해요. 물은 괜찮아요.';
          } else if (examName.includes('초음파')) {
            return '검사 전 물을 충분히 드세요.';
          } else if (examName.includes('ct') || examName.includes('mri')) {
            return '금속 물품 제거하세요. 조영제 사용 가능성 있어요.';
          }
          return '특별한 준비사항 없어요.';
        }
      }
      return '예정된 검사가 없어요. 원무과(1588-0000)에 확인하세요.';
    }
    
    // 진료 순서 관련 질문
    if (lowerMessage.includes('진료') || lowerMessage.includes('일정')) {
      if (!isLoggedIn) {
        return '로그인하시면 오늘 일정을 확인할 수 있어요.';
      }
      if (todaysAppointments && todaysAppointments.length > 0) {
        const next = todaysAppointments.find(a => a.status !== 'completed');
        if (next) {
          const time = new Date(next.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
          return `다음: ${next.exam?.title || '검사'} ${time}, ${next.exam?.building || '본관'} ${next.exam?.floor || '2'}층`;
        }
        return '오늘 일정이 모두 완료됐어요.';
      }
      return '오늘 예약이 없어요.';
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