import React, { useState, useEffect, useCallback } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { StopIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const VoiceInput = ({ onResult, onError, isListening, setIsListening }) => {
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Web Speech API 지원 확인
    //if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    //  onError('이 브라우저는 음성 인식을 지원하지 않습니다.');
    //  return;
    //}

    // SpeechRecognition 객체 생성
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.lang = 'ko-KR';
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;

    recognitionInstance.onstart = () => {
      setIsListening(true);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    recognitionInstance.onresult = (event) => {
      const current = event.resultIndex;
      const transcriptResult = event.results[current][0].transcript;
      setTranscript(transcriptResult);
      
      if (event.results[current].isFinal) {
        onResult(transcriptResult);
      }
    };

    recognitionInstance.onerror = (event) => {
      onError('음성 인식 중 오류가 발생했습니다: ' + event.error);
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.abort();
      }
    };
  }, [onResult, onError, setIsListening]);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      try {
        recognition.start();
      } catch (error) {
        console.error('음성 인식 시작 오류:', error);
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  const handleTextSubmit = useCallback((e) => {
    e.preventDefault();
    if (textInput.trim()) {
      onResult(textInput.trim());
      setTextInput('');
    }
  }, [textInput, onResult]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit(e);
    }
  }, [handleTextSubmit]);

  return (
    <div className="w-full">
      <div className="relative">
        {isListening ? (
          // 듣고 있을 때 UI
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/30 backdrop-blur-sm rounded-full animate-pulse">
                <MicrophoneIcon className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <div className="mb-4 flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-white rounded-full animate-pulse delay-100"></div>
              <div className="w-3 h-3 bg-white rounded-full animate-pulse delay-200"></div>
            </div>
            
            <p className="text-white text-xl font-medium mb-4">듣고 있습니다...</p>
            
            {transcript && (
              <div className="mb-4 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white text-lg">{transcript}</p>
              </div>
            )}
            
            <button
              onClick={stopListening}
              className="bg-white/30 hover:bg-white/40 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
            >
              <StopIcon className="w-5 h-5" />
              중단하기
            </button>
          </div>
        ) : (
          // 메신저 스타일 입력창
          <form onSubmit={handleTextSubmit} className="w-full max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-3 flex items-center gap-3">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="어디로 가시나요? (예: 응급실, 약국, 내과)"
                className="flex-1 px-5 py-4 text-lg sm:text-xl outline-none placeholder-gray-400"
              />
              
              {/* 텍스트 전송 버튼 (텍스트가 있을 때만 표시) */}
              {textInput.trim() && (
                <button
                  type="submit"
                  className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200"
                >
                  <PaperAirplaneIcon className="w-7 h-7" />
                </button>
              )}
              
              {/* 마이크 버튼 - 크기 증가 */}
              <button
                type="button"
                onClick={startListening}
                className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-600 rounded-xl transition-all duration-200 group"
              >
                <MicrophoneIcon className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </button>
            </div>
            
            <p className="text-white/80 text-sm text-center mt-3">
              텍스트로 입력하거나 마이크 버튼을 눌러 말씀해주세요
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default VoiceInput;