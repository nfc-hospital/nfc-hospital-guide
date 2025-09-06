import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:5000';

// Axios 인스턴스 생성
const chatbotClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 - 인증 토큰 추가
chatbotClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 - 에러 처리
chatbotClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Chatbot API Error:', error);
    return Promise.reject(error);
  }
);

export const enhancedChatbotAPI = {
  /**
   * 챗봇 질문 전송
   */
  async sendQuery(question, context = {}) {
    try {
      const response = await chatbotClient.post('/api/chatbot/query', {
        question,
        context: {
          ...context,
          timestamp: new Date().toISOString()
        }
      });

      const data = response.data;
      
      if (data.success) {
        return {
          success: true,
          messageId: data.data.messageId,
          type: data.data.type,
          urgency: data.data.urgency,
          content: data.data.content,
          disclaimer: data.data.disclaimer,
          confidence: data.data.confidence,
          actions: data.data.actions || [],
          suggestions: data.data.suggestions || [],
          metadata: data.data.metadata || {}
        };
      }
      
      throw new Error(data.error?.message || 'Unknown error');
      
    } catch (error) {
      console.error('Failed to send query:', error);
      
      // Fallback 응답
      return {
        success: false,
        content: '죄송합니다. 챗봇 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
        type: 'error',
        urgency: 'low',
        actions: [],
        suggestions: [
          '병원 대표번호로 문의',
          '1층 안내데스크 방문'
        ]
      };
    }
  },

  /**
   * 상황별 추천 질문 조회
   */
  async getSuggestions(userId = null) {
    try {
      const params = userId ? { userId } : {};
      const response = await chatbotClient.get('/api/chatbot/suggestions', { params });
      
      if (response.data.success) {
        return {
          state: response.data.data.state,
          suggestions: response.data.data.suggestions
        };
      }
      
      return {
        state: 'UNKNOWN',
        suggestions: [
          '병원 위치가 어디인가요?',
          '진료 시간을 알려주세요',
          '주차장은 어디에 있나요?'
        ]
      };
      
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return {
        state: 'UNKNOWN',
        suggestions: []
      };
    }
  },

  /**
   * FAQ 목록 조회
   */
  async getFAQ(category = 'all') {
    try {
      const response = await chatbotClient.get('/api/chatbot/faq', {
        params: { category }
      });
      
      if (response.data.success) {
        return {
          items: response.data.data.items,
          categories: response.data.data.categories,
          totalCount: response.data.data.totalCount
        };
      }
      
      return {
        items: [],
        categories: [],
        totalCount: 0
      };
      
    } catch (error) {
      console.error('Failed to get FAQ:', error);
      return {
        items: [],
        categories: [],
        totalCount: 0
      };
    }
  },

  /**
   * 응급 상황 신고
   */
  async reportEmergency(location, description) {
    try {
      const response = await chatbotClient.post('/api/chatbot/emergency', {
        location,
        description,
        timestamp: new Date().toISOString()
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Failed to report emergency:', error);
      // 응급 상황은 실패해도 안내
      return {
        success: false,
        message: '시스템 오류가 발생했습니다. 즉시 119에 신고하거나 응급실로 가세요.',
        actions: [
          { type: 'call', label: '119 신고', value: 'tel:119' },
          { type: 'call', label: '응급실', value: 'tel:02-0000-0119' }
        ]
      };
    }
  }
};

/**
 * 메시지 타입별 렌더링 데이터 생성
 */
export const formatMessageForDisplay = (apiResponse) => {
  const { type, content, disclaimer, actions, suggestions, urgency } = apiResponse;
  
  const message = {
    id: apiResponse.messageId || Date.now(),
    type: 'bot',
    timestamp: new Date(),
    text: content,
    disclaimer,
    urgency,
    structuredData: null
  };
  
  // 타입별 구조화된 데이터 생성
  switch (type) {
    case 'emergency':
      message.structuredData = {
        type: 'emergency',
        content,
        actions,
        urgency: 'critical'
      };
      break;
      
    case 'queue_status':
      message.structuredData = {
        type: 'queue_status',
        content: parseQueueInfo(content),
        actions
      };
      break;
      
    case 'location':
      message.structuredData = {
        type: 'location',
        content: parseLocationInfo(content),
        actions
      };
      break;
      
    case 'facility':
      message.structuredData = {
        type: 'facilities',
        content: parseFacilityInfo(content),
        actions
      };
      break;
      
    case 'payment':
      message.structuredData = {
        type: 'payment_info',
        content: parsePaymentInfo(content),
        actions
      };
      break;
      
    default:
      if (suggestions && suggestions.length > 0) {
        message.structuredData = {
          type: 'with_suggestions',
          content,
          suggestions,
          actions
        };
      }
  }
  
  return message;
};

// 헬퍼 함수들
function parseQueueInfo(content) {
  // 텍스트에서 대기 정보 추출
  const queueNumber = content.match(/대기번호:\s*(\d+)/)?.[1] || 'N/A';
  const peopleAhead = content.match(/내 앞 대기:\s*(\d+)/)?.[1] || '0';
  const waitTime = content.match(/예상 대기시간:\s*약?\s*(\d+)/)?.[1] || '0';
  const examName = content.match(/검사:\s*([^\n]+)/)?.[1] || '검사';
  const called = content.includes('호출되었습니다');
  
  return {
    title: examName,
    queueNumber,
    peopleAhead: parseInt(peopleAhead),
    waitTime: parseInt(waitTime),
    called
  };
}

function parseLocationInfo(content) {
  // 위치 정보 파싱
  const building = content.match(/본관|별관|신관|암센터/)?.[0] || '본관';
  const floor = content.match(/(\d+)층/)?.[1] || '';
  const room = content.match(/(\d+)호/)?.[1] || '';
  
  return {
    building,
    floor,
    room,
    fullLocation: `${building} ${floor}층 ${room ? room + '호' : ''}`.trim(),
    description: content
  };
}

function parseFacilityInfo(content) {
  // 편의시설 정보 파싱
  const facilities = [];
  const lines = content.split('\n');
  
  lines.forEach(line => {
    const match = line.match(/([☕🏪🍴💊🏧🚻])\s*([^:]+):\s*(.+)/);
    if (match) {
      facilities.push({
        icon: match[1],
        name: match[2].trim(),
        location: match[3].split('(')[0].trim(),
        hours: match[3].match(/\(([^)]+)\)/)?.[1] || ''
      });
    }
  });
  
  return facilities;
}

function parsePaymentInfo(content) {
  // 수납 정보 파싱
  const location = content.match(/위치:\s*([^\n]+)/)?.[1] || '1층 원무과';
  const hours = content.match(/운영시간:\s*([^\n]+)/)?.[1] || '';
  const methods = content.match(/결제방법:\s*([^\n]+)/)?.[1]?.split(',').map(m => m.trim()) || [];
  
  return {
    location,
    hours,
    methods,
    description: content
  };
}

export default enhancedChatbotAPI;