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
    const { currentQueues, todaysAppointments, patientState } = context;
    
    // 병원 정보 관련 질문 (운영시간, 연락처 등) - 우선순위 높임
    if (lowerMessage.includes('병원') || lowerMessage.includes('연락') || lowerMessage.includes('운영') || 
        lowerMessage.includes('전화') || lowerMessage.includes('번호')) {
      return {
        type: 'hospital_info',
        content: [
          { icon: '📞', label: '대표번호', value: '02-1234-5678', action: 'tel:02-1234-5678' },
          { icon: '⏰', label: '진료시간', value: '평일 8:30-17:30', detail: '토 8:30-12:30' },
          { icon: '🚨', label: '응급실', value: '24시간', action: 'tel:02-1234-5119' }
        ]
      };
    }
    
    // 대기 시간/순서 관련 질문 - 병원 운영시간과 구분하기 위해 조건 강화
    if ((lowerMessage.includes('대기') && (lowerMessage.includes('시간') || lowerMessage.includes('순서'))) || 
        lowerMessage.includes('순서') || 
        (lowerMessage.includes('시간') && !lowerMessage.includes('운영') && !lowerMessage.includes('진료시간')) || 
        lowerMessage.includes('기다')) {
      if (currentQueues && currentQueues.length > 0) {
        const activeQueue = currentQueues.find(q => q.state === 'waiting' || q.state === 'called');
        if (activeQueue) {
          const peopleAhead = Math.max(0, (activeQueue.queue_number || 1) - 1);
          const waitTime = activeQueue.estimated_wait_time || 15;
          return {
            type: 'queue_status',
            called: activeQueue.state === 'called',
            content: {
              title: activeQueue.exam?.title || '검사',
              peopleAhead: peopleAhead,
              waitTime: waitTime
            }
          };
        }
      }
      return {
        type: 'simple',
        content: '현재 대기 중인 검사가 없습니다.'
      };
    }
    
    // 진료비 관련 질문 - 우선순위 높임
    if (lowerMessage.includes('진료비') || lowerMessage.includes('비용') || lowerMessage.includes('수납') || 
        lowerMessage.includes('얼마') || lowerMessage.includes('가격')) {
      const completedExams = todaysAppointments?.filter(apt => apt.status === 'completed') || [];
      if (completedExams.length > 0) {
        return {
          type: 'payment_info',
          content: {
            completed: completedExams.length,
            location: '1층 원무과',
            methods: ['카드', '현금', '모바일']
          }
        };
      }
      return {
        type: 'simple',
        content: '아직 완료된 진료가 없습니다.'
      };
    }
    
    // 검사 준비사항 관련 질문 - 조건 강화
    if ((lowerMessage.includes('준비') && lowerMessage.includes('검사')) || 
        (lowerMessage.includes('검사') && lowerMessage.includes('준비사항')) ||
        (lowerMessage.includes('검사') && !lowerMessage.includes('비용') && !lowerMessage.includes('진료비'))) {
      if (todaysAppointments && todaysAppointments.length > 0) {
        const upcomingExams = todaysAppointments.filter(apt => 
          apt.status === 'scheduled' || apt.status === 'pending' || apt.status === 'waiting'
        );
        
        if (upcomingExams.length > 0) {
          let response = '오늘 예정된 검사의 준비사항입니다:\n\n';
          upcomingExams.forEach(exam => {
            response += `📋 ${exam.exam?.title || '검사'}\n`;
            response += `• 위치: ${exam.exam?.building || '본관'} ${exam.exam?.floor || '2'}층 ${exam.exam?.room || ''}\n`;
            
            // 검사별 준비사항
            const examName = (exam.exam?.title || '').toLowerCase();
            if (examName.includes('혈액') || examName.includes('채혈')) {
              response += `• 준비사항: 8시간 이상 금식 필요\n`;
            } else if (examName.includes('초음파')) {
              response += `• 준비사항: 검사 전 물을 충분히 드세요\n`;
            } else if (examName.includes('ct') || examName.includes('mri')) {
              response += `• 준비사항: 금속 물품 제거, 조영제 사용 가능\n`;
            } else {
              response += `• 준비사항: 특별한 준비사항 없음\n`;
            }
            response += '\n';
          });
          return response;
        }
      }
      return '오늘 예정된 검사가 없습니다. 검사 예약이 있다면 병원에 문의해주세요.';
    }
    
    // 진료 순서 관련 질문
    if (lowerMessage.includes('진료') || lowerMessage.includes('순서') || lowerMessage.includes('일정')) {
      if (todaysAppointments && todaysAppointments.length > 0) {
        let response = '오늘의 진료 일정입니다:\n\n';
        todaysAppointments.forEach((apt, index) => {
          const statusEmoji = apt.status === 'completed' ? '✅' : 
                            apt.status === 'ongoing' ? '🔄' : 
                            apt.status === 'waiting' ? '⏳' : '📅';
          response += `${statusEmoji} ${index + 1}. ${apt.exam?.title || '검사'}\n`;
          response += `   • 시간: ${new Date(apt.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}\n`;
          response += `   • 장소: ${apt.exam?.building || '본관'} ${apt.exam?.floor || '2'}층 ${apt.exam?.room || ''}\n`;
          response += `   • 상태: ${apt.status === 'completed' ? '완료' : 
                                  apt.status === 'ongoing' ? '진행 중' : 
                                  apt.status === 'waiting' ? '대기 중' : '예정'}\n\n`;
        });
        return response;
      }
      return '오늘 예약된 진료 일정이 없습니다.';
    }
    
    
    // 주의사항 관련 질문
    if (lowerMessage.includes('주의') || lowerMessage.includes('사항')) {
      const ongoingExam = todaysAppointments?.find(apt => apt.status === 'ongoing');
      if (ongoingExam) {
        return `${ongoingExam.exam?.title || '검사'} 중 주의사항:\n\n` +
               `⚠️ 검사 중 움직이지 마세요\n` +
               `📱 휴대폰은 진동 모드로 설정해주세요\n` +
               `👥 보호자는 대기실에서 기다려주세요\n` +
               `💊 검사 후 특별한 주의사항은 의료진이 안내해드립니다`;
      }
      return '검사 전후 주의사항은 각 검사실에서 자세히 안내해드립니다.';
    }
    
    
    // 편의시설 관련 질문
    if (lowerMessage.includes('카페') || lowerMessage.includes('편의점') || lowerMessage.includes('식당')) {
      return {
        type: 'facilities',
        content: [
          { icon: '☕', name: '카페', location: '1층 로비', hours: '7:00-19:00' },
          { icon: '🏪', name: '편의점', location: '지하 1층', hours: '24시간' },
          { icon: '💊', name: '약국', location: '1층 우측', hours: '8:30-18:00' },
          { icon: '🏧', name: 'ATM', location: '1층, 지하 1층', hours: '24시간' }
        ]
      };
    }
    
    // 주차 관련 질문
    if (lowerMessage.includes('주차')) {
      return `🚗 주차 안내\n\n` +
             `📍 위치: 지하 1-3층 주차장\n` +
             `💰 요금: 최초 30분 무료, 이후 10분당 500원\n` +
             `🎫 할인: 진료 확인 시 50% 할인\n` +
             `⏰ 운영시간: 24시간\n` +
             `📞 문의: 02-1234-5670`;
    }
    
    return {
      type: 'default',
      content: '무엇을 도와드릴까요?'
    };
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