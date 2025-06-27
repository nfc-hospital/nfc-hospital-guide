import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NFCReader({ onTagScanned }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const startScanning = async () => {
      if (!('NDEFReader' in window)) {
        setError('이 브라우저는 NFC를 지원하지 않습니다.');
        return;
      }

      try {
        setScanning(true);
        const ndef = new window.NDEFReader();
        await ndef.scan();

        ndef.addEventListener("reading", ({ message, serialNumber }) => {
          console.log("NFC 태그가 인식되었습니다:", serialNumber);
          
          // 테스트용 examId
          const examId = "xray-123";
          
          // 태그 인식 후 처리
          if (onTagScanned) {
            onTagScanned();
          }
          
          // 검사 페이지로 이동
          navigate(`/exam/${examId}`);
        });

        ndef.addEventListener("error", (error) => {
          setError('NFC 태그 읽기에 실패했습니다.');
          console.error("NFC 오류:", error);
        });

      } catch (error) {
        console.error("NFC 스캔 시작 실패:", error);
        setError('NFC 스캔을 시작할 수 없습니다.');
        setScanning(false);
      }
    };

    startScanning();

    return () => {
      setScanning(false);
    };
  }, [navigate, onTagScanned]);

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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 text-center">
      {scanning && (
        <div className="space-y-4">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-75"></div>
            <div className="relative flex items-center justify-center w-24 h-24 bg-primary-100 rounded-full">
              <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            NFC 태그를 스캔하고 있습니다...<br />
            휴대폰을 태그에 가까이 대어주세요
          </p>
        </div>
      )}
    </div>
  );
}