import React, { useState, useEffect } from 'react';
import useJourneyStore from '../../store/journeyStore';
import Stage1_FloatingButton from './stages/Stage1_FloatingButton';
import Stage2_QuickSelect from './stages/Stage2_QuickSelect';
import Stage3_FullChat from './stages/Stage3_FullChat';
import './ChatbotSystem.css';

const ChatbotSystem = ({ elderlyMode = false }) => {
  const [currentStage, setCurrentStage] = useState(1);
  const [messages, setMessages] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isTyping, setIsTyping] = useState(false);

  // CalledModal 최소화 상태 구독
  const calledModalMinimized = useJourneyStore(state => state.calledModalMinimized);

  // CalledModal이 최소화되면 챗봇을 위로 이동
  useEffect(() => {
    if (calledModalMinimized) {
      // 알림바(bottom: 16px, 높이: ~60px) + 여유 공간(24px) = 100px 위로 이동
      setPosition({ x: 20, y: 100 });
    } else {
      // 원래 위치로 복원
      setPosition({ x: 20, y: 20 });
    }
  }, [calledModalMinimized]);

  // 서버 중심 아키텍처: 프론트엔드는 컨텍스트 생성하지 않음
  // 모든 환자 정보는 서버가 직접 Django에서 가져옴

  const handleStageTransition = (newStage, data = null) => {
    setCurrentStage(newStage);
    if (data) {
      if (data.question) {
        setSelectedQuestion(data.question);
        if (newStage === 3) {
          initializeChat(data.question);
        }
      }
    }
  };

  const initializeChat = async (question) => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: question,
      timestamp: new Date()
    };
    
    setMessages([userMessage]);
    setIsTyping(true);

    try {
      // 서버 중심: 컨텍스트 전송 제거, JWT로 인증
      const { chatbotAPI: chatbot } = await import('./utils/chatbotAPI');
      const response = await chatbot.sendMessage(question);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.message || '죄송합니다, 답변을 가져올 수 없습니다.',
        structuredData: response.structuredData || null,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: '죄송합니다, 챗봇 서버와 통신 중 오류가 발생했습니다.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };


  const handleSendMessage = async (text) => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // 프론트엔드는 단순히 질문만 전송
      // 서버가 JWT 토큰으로 사용자를 식별하고 컨텍스트를 조회함
      const { chatbotAPI: chatbot } = await import('./utils/chatbotAPI');
      
      // 컨텍스트 전송 제거 - 서버가 직접 조회
      const response = await chatbot.sendMessage(text);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.message || '죄송합니다, 답변을 가져올 수 없습니다.',
        structuredData: response.structuredData || null,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: '죄송합니다, 답변을 가져오는 데 실패했습니다.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chatbot-system">
      {currentStage >= 1 && (
        <Stage1_FloatingButton
          isActive={currentStage === 1}
          elderlyMode={elderlyMode}
          onClick={() => handleStageTransition(2)}
          position={position}
        />
      )}

      {currentStage === 2 && (
        <Stage2_QuickSelect
          elderlyMode={elderlyMode}
          onClose={() => handleStageTransition(1)}
          onSelectQuestion={(question) => 
            handleStageTransition(3, { question })
          }
          position={position}
        />
      )}

      {currentStage === 3 && (
        <Stage3_FullChat
          elderlyMode={elderlyMode}
          messages={messages}
          isTyping={isTyping}
          onBack={() => handleStageTransition(2)}
          onClose={() => handleStageTransition(1)}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
};

export default ChatbotSystem;