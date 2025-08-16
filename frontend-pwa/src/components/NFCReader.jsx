import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import toast from 'react-hot-toast';
import useJourneyStore from '../store/journeyStore';

export default function NFCReader({ onTagScanned, autoStart = true }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [lastScannedTag, setLastScannedTag] = useState(null);
  const navigate = useNavigate();
  const fetchJourneyData = useJourneyStore((state) => state.fetchJourneyData);

  // NFC 스캔 시작 함수
  const startNFCScanning = useCallback(async () => {
    if (!('NDEFReader' in window)) {
      setError('이 브라우저는 NFC를 지원하지 않습니다.');
      setNfcSupported(false);
      return;
    }
    
    setNfcSupported(true);

    try {
      setScanning(true);
      setError(null);
      const ndef = new window.NDEFReader();
      await ndef.scan();

      ndef.addEventListener("reading", async ({ message, serialNumber }) => {
        console.log("🏷️ NFC 태그 인식:", serialNumber);
        
        // 중복 스캔 방지 (3초 이내 같은 태그 무시)
        if (lastScannedTag?.id === serialNumber && 
            Date.now() - lastScannedTag.timestamp < 3000) {
          console.log("🔄 중복 스캔 무시");
          return;
        }
        
        setLastScannedTag({ id: serialNumber, timestamp: Date.now() });
        
        try {
          // 진동 피드백
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
          
          // 1. journeyStore를 통해 모든 최신 정보 로드 (NFC 정보 포함)
          await fetchJourneyData(serialNumber);
          
          // 2. 태그 인식 후 처리 (예: 스캔 중 UI 숨기기)
          if (onTagScanned) {
            onTagScanned(serialNumber);
          }
          
          // 3. Home 페이지로 이동하여 상태에 맞는 화면을 보여주도록 위임
          navigate('/');
          
          toast.success('태그가 인식되었습니다!');
        } catch (error) {
          console.error("데이터 로딩 실패:", error);
          toast.error('환자 정보를 불러오는 데 실패했습니다.');
        }
      });

      ndef.addEventListener("error", (error) => {
        setError('NFC 태그 읽기에 실패했습니다.');
        console.error("NFC 오류:", error);
      });

    } catch (error) {
      console.error("NFC 스캔 시작 실패:", error);
      
      // 권한 오류 처리
      if (error.name === 'NotAllowedError') {
        setError('NFC 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.');
      } else if (error.name === 'NotSupportedError') {
        setError('이 기기는 NFC를 지원하지 않습니다.');
      } else {
        setError('NFC 스캔을 시작할 수 없습니다.');
      }
      
      setScanning(false);
    }
  }, [navigate, onTagScanned, lastScannedTag, fetchJourneyData]);

  // 컴포넌트 마운트 시 자동 스캔
  useEffect(() => {
    if (autoStart) {
      startNFCScanning();
    }

    return () => {
      setScanning(false);
    };
  }, [autoStart, startNFCScanning]);

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            {error.includes('권한') && (
              <button 
                onClick={startNFCScanning}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 text-center">
      {nfcSupported && !scanning && (
        <button
          onClick={startNFCScanning}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium 
                   hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
          </svg>
          NFC 스캔 시작
        </button>
      )}
      
      {scanning && (
        <div className="space-y-4">
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
            <div className="absolute inset-4 bg-blue-200 rounded-full animate-ping opacity-50 animation-delay-200"></div>
            <div className="relative flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-lg">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              NFC 태그를 스캔하고 있습니다...
            </p>
            <p className="text-gray-600">
              휴대폰을 태그에 가까이 대어주세요
            </p>
          </div>
          
          <button
            onClick={() => setScanning(false)}
            className="text-gray-500 underline hover:text-gray-700 text-sm"
          >
            스캔 취소
          </button>
        </div>
      )}
      
      {!nfcSupported && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-left">
              <p className="font-medium text-amber-900">NFC를 사용할 수 없습니다</p>
              <p className="text-sm text-amber-700 mt-1">
                QR 코드를 대신 스캔하거나 수동으로 위치를 선택해주세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}