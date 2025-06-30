import React, { useState, useEffect, useCallback } from 'react';

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
    <div className="voice-input-container">
      <div className={`voice-status ${isListening ? 'voice-speaking' : ''}`}>
        <div className="voice-indicator">
          {isListening ? (
            <div className="flex items-center justify-center gap-2">
              <span className="animate-pulse">🎤</span>
              <span className="text-lg text-primary-blue">듣고 있어요...</span>
            </div>
          ) : (
            <button
              onClick={startListening}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <span className="text-2xl">🎤</span>
              <span>음성으로 말하기</span>
            </button>
          )}
        </div>
      </div>
      
      {transcript && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <p className="text-lg text-text-primary">{transcript}</p>
        </div>
      )}
      
      {isListening && (
        <button
          onClick={stopListening}
          className="mt-4 btn btn-secondary w-full"
        >
          입력 중단하기
        </button>
      )}
    </div>
  );
};

export default VoiceInput; 