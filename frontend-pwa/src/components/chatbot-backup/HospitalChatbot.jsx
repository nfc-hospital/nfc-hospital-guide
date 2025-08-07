import { useState, useEffect } from 'react';
import ChatbotPopup from './layouts/ChatbotPopup';
import ElderlyMode from './ElderlyMode';

const HospitalChatbot = ({ 
  isOpen = false, 
  onToggle,
  elderlyMode = false,
  nfcLocation = null,
  queueStatus = null 
}) => {
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // 초기 환영 메시지
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        type: 'bot',
        content: {
          type: 'text',
          data: '안녕하세요! 병원 안내 도우미입니다. 무엇을 도와드릴까요?'
        },
        timestamp: new Date(),
        isBot: true
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = async (input) => {
    if (!input?.trim()) return;

    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: {
        type: 'text',
        data: input
      },
      timestamp: new Date(),
      isBot: false
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsTyping(true);

    // 간단한 응답 로직 (실제로는 API 호출)
    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: {
          type: 'text',
          data: `"${input}"에 대한 답변을 준비 중입니다. 곧 도와드리겠습니다.`
        },
        timestamp: new Date(),
        isBot: true
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const chatbotProps = {
    isOpen,
    onToggle,
    messages,
    onSendMessage: handleSendMessage,
    currentInput,
    onInputChange: setCurrentInput,
    isTyping,
    nfcLocation,
    queueStatus
  };

  if (elderlyMode) {
    return <ElderlyMode {...chatbotProps} />;
  }

  return <ChatbotPopup {...chatbotProps} />;
};

export default HospitalChatbot;