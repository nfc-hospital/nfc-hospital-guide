import React, { useState, useEffect, useCallback } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { StopIcon } from '@heroicons/react/24/outline';

const VoiceInput = ({ onResult, onError, isListening, setIsListening }) => {
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Web Speech API 지원 확인
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      onError('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }

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
          // 대기 상태 버튼
          <button
            onClick={startListening}
            className="w-full bg-white hover:bg-gray-50 text-blue-600 px-8 py-6 rounded-2xl font-semibold text-lg sm:text-xl transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-[1.02] flex items-center justify-center gap-4 group"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <MicrophoneIcon className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <span className="text-lg sm:text-xl font-bold">버튼을 누르고 말씀해주세요</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceInput;