import { useState } from 'react';

export default function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      type: 'bot', 
      text: '안녕하세요! 무엇을 도와드릴까요?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };
  
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // 사용자 메시지 추가
    const userMessage = {
      type: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    try {
      // 실제 챗봇 서버 API 호출
      const { chatbotAPI } = await import('../api/client');
      const response = await chatbotAPI.query(input, {
        currentLocation: localStorage.getItem('lastNFCLocation') || '',
        userId: localStorage.getItem('userId') || 'anonymous'
      });
      
      if (response.success) {
        const botMessage = {
          type: 'bot',
          text: response.data.response.content,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(response.error?.message || '챗봇 응답 실패');
      }
    } catch (error) {
      console.error('챗봇 응답 오류:', error);
      
      setTimeout(() => {
        const errorMessage = {
          type: 'bot',
          text: '죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
      }, 1000);
    }
  };
  
  const handleVoiceInput = () => {
    // 음성 인식 기능
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.start();
    
    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      setInput(speechResult);
    };
    
    recognition.onerror = (event) => {
      console.error('음성 인식 오류:', event.error);
      alert('음성 인식에 실패했습니다. 다시 시도해주세요.');
    };
  };
  
  return (
    <>
      {/* 챗봇 버튼 */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* 챗봇 창 */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-xl">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              AI 도우미
            </h3>
          </div>
          
          <div className="h-96 p-4 overflow-y-auto">
            {/* 챗봇 메시지들 */}
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex justify-${msg.type === 'user' ? 'end' : 'start'}`}
                >
                  <div className={`bg-${msg.type === 'user' ? 'primary' : 'gray'}-100 rounded-lg px-4 py-2 max-w-xs`}>
                    <p className="text-sm text-gray-900">{msg.text}</p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-end">
                  <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-xs">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <form className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                disabled={isTyping}
              />
              <button
                type="button"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={handleVoiceInput}
              >
                🎤
              </button>
              <button
                type="submit"
                onClick={handleSendMessage}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={isTyping || !input.trim()}
              >
                전송
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}