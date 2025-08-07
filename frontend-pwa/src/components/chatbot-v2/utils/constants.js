export const CHATBOT_STAGES = {
  FLOATING_BUTTON: 1,
  QUICK_SELECT: 2,
  FULL_CHAT: 3
};

export const MESSAGE_TYPES = {
  USER: 'user',
  BOT: 'bot',
  SYSTEM: 'system'
};

export const QUICK_QUESTIONS = [
  { 
    icon: '📍', 
    text: '검사실 위치', 
    question: '검사실이 어디에 있나요?',
    category: 'location'
  },
  { 
    icon: '⏰', 
    text: '대기 시간', 
    question: '얼마나 기다려야 하나요?',
    category: 'waiting'
  },
  { 
    icon: '📋', 
    text: '준비사항', 
    question: '검사 준비사항이 뭔가요?',
    category: 'preparation'
  },
  { 
    icon: '💊', 
    text: '약국 위치', 
    question: '약은 어디서 받나요?',
    category: 'pharmacy'
  },
  { 
    icon: '🚗', 
    text: '주차 안내', 
    question: '주차는 어디에 하나요?',
    category: 'parking'
  },
  { 
    icon: '🚻', 
    text: '화장실', 
    question: '화장실이 어디에 있나요?',
    category: 'restroom'
  }
];

export const CHATBOT_CONFIG = {
  DEFAULT_POSITION: { x: 20, y: 20 },
  PULSE_DURATION: 5000,
  TYPING_DELAY: 1500,
  ANIMATION_DURATION: 300,
  MAX_MESSAGE_LENGTH: 500,
  VOICE_RECOGNITION_LANG: 'ko-KR'
};

export const RESPONSE_TEMPLATES = {
  GREETING: '안녕하세요! 병원 안내 도우미입니다. 무엇을 도와드릴까요?',
  LOCATION_HELP: '병원 내 위치 안내를 도와드리겠습니다.',
  WAITING_TIME: '대기 시간을 확인해드리겠습니다.',
  ERROR: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해 주세요.',
  DEVELOPMENT: '죄송합니다. 현재 개발 중인 기능입니다. 곧 더 나은 서비스로 찾아뵙겠습니다!',
  NO_UNDERSTAND: '죄송합니다. 질문을 이해하지 못했습니다. 다시 한 번 말씀해 주시겠어요?'
};

export const ACCESSIBILITY = {
  ARIA_LABELS: {
    FLOATING_BUTTON: '챗봇 열기',
    CLOSE_BUTTON: '닫기',
    BACK_BUTTON: '뒤로 가기',
    SEND_MESSAGE: '메시지 전송',
    VOICE_INPUT: '음성 입력',
    TEXT_INPUT: '메시지 입력'
  }
};