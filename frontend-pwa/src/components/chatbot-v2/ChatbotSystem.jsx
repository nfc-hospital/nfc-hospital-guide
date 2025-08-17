import React, { useState, useEffect } from 'react';
import Stage1_FloatingButton from './stages/Stage1_FloatingButton';
import Stage2_QuickSelect from './stages/Stage2_QuickSelect';
import Stage3_FullChat from './stages/Stage3_FullChat';
import './ChatbotSystem.css';
import apiService from '../../api/apiService';

const ChatbotSystem = ({ elderlyMode = false }) => {
  const [currentStage, setCurrentStage] = useState(1);
  const [messages, setMessages] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isTyping, setIsTyping] = useState(false);

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
      // apiService.sendChatbotQuery 사용
      const response = await apiService.sendChatbotQuery(question);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.response || response.data?.response?.content || '죄송합니다, 답변을 가져올 수 없습니다.',
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
      const response = await apiService.sendChatbotQuery(text);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.response || response.data?.response?.content || '죄송합니다, 답변을 가져올 수 없습니다.',
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