import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api/apiService';
import { scanNFCTag, checkInWithTag } from '../api/nfc';
import toast from 'react-hot-toast';
import useJourneyStore from '../store/journeyStore';
import useLocationStore from '../store/locationStore';
import { useAuth } from '../context/AuthContext';
import { 
  calculateNFCDistance, 
  getDestinationByState,
  getInitialSlideIndex 
} from '../utils/nfcLocation';

export default function NFCReader({ onTagScanned, autoStart = true }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [lastScannedTag, setLastScannedTag] = useState(null);
  const [processingTag, setProcessingTag] = useState(false);
  const navigate = useNavigate();
  const fetchJourneyData = useJourneyStore((state) => state.fetchJourneyData);
  const { isAuthenticated } = useAuth();

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
        console.log("📝 NDEF 메시지:", message);
        
        // 중복 스캔 방지 (3초 이내 같은 태그 무시)
        if (lastScannedTag?.id === serialNumber && 
            Date.now() - lastScannedTag.timestamp < 3000) {
          console.log("🔄 중복 스캔 무시");
          return;
        }
        
        // 처리 중 플래그 확인
        if (processingTag) {
          console.log("⏳ 이전 태그 처리 중...");
          return;
        }
        
        setLastScannedTag({ id: serialNumber, timestamp: Date.now() });
        setProcessingTag(true);
        
        try {
          // 진동 피드백
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
          
          // 1. 백엔드 API로 NFC 스캔 데이터 전송
          const scanResult = await scanNFCTag(serialNumber, message);
          console.log("📡 API 응답:", scanResult);
          
          // 2. 응답에 따른 처리
          if (scanResult.success) {
            const responseData = scanResult.data;
            
            // 위치 안내 정보 표시
            if (responseData.location_info) {
              toast.success(`현재 위치: ${responseData.location_info.current_location}`);
              
              // nfcLocation.js 거리 계산 로직 추가
              const currentLocation = {
                building: responseData.location_info.building,
                floor: responseData.location_info.floor,
                room: responseData.location_info.room,
                x_coord: responseData.location_info.x_coord,
                y_coord: responseData.location_info.y_coord
              };
              
              // 환자 상태와 현재 검사 정보 가져오기
              const patientState = responseData.patient_state || 'REGISTERED';
              const currentExam = responseData.exam_info;
              
              // 목적지 결정
              const destination = getDestinationByState(patientState, currentExam);
              
              if (destination) {
                // 거리 계산
                const distanceInfo = calculateNFCDistance(currentLocation, destination);
                
                // 거리에 따른 안내 메시지
                if (distanceInfo.isNearby) {
                  toast.success(`목적지가 가까이 있습니다! (${distanceInfo.distance === 'same_room' ? '같은 위치' : '같은 층'})`, {
                    icon: '📍',
                    duration: 3000
                  });
                } else {
                  toast(`목적지: ${destination.description} (${destination.building} ${destination.floor}층)`, {
                    icon: '🗺️',
                    duration: 4000
                  });
                }
                
                // 슬라이드 초기 인덱스 결정 (근거리면 준비사항, 원거리면 지도)
                const initialSlide = getInitialSlideIndex(distanceInfo.isNearby);
                responseData.initialSlideIndex = initialSlide;
              }
            }
            
            // 검사 준비사항 안내
            if (responseData.exam_info?.preparations) {
              const prepCount = responseData.exam_info.preparations.length;
              toast(
                `검사 준비사항 ${prepCount}개가 있습니다.`,
                { icon: '📋', duration: 4000 }
              );
            }
            
            // 대기열 정보 업데이트
            if (responseData.queue_info) {
              const { queue_number, estimated_wait_time, state } = responseData.queue_info;
              if (state === 'called') {
                toast.error('호출되었습니다! 검사실로 이동해주세요.', {
                  duration: 5000,
                  icon: '🔔'
                });
              } else if (queue_number) {
                toast(`대기번호: ${queue_number}번 (예상 ${estimated_wait_time}분)`, {
                  icon: '⏰'
                });
              }
            }
            
            // 체크인 처리 (로그인 상태이고 예약이 있을 때)
            if (isAuthenticated && responseData.appointment_info?.appointment_id) {
              try {
                await checkInWithTag(serialNumber, responseData.appointment_info.appointment_id);
                toast.success('체크인 완료!', { icon: '✅' });
              } catch (checkInError) {
                console.warn('체크인 실패:', checkInError);
              }
            }
            
            // 3. 로그인 여부와 상관없이 위치 정보를 locationStore에 저장
            useLocationStore.getState().setCurrentLocation(responseData.location_info);
            
            // 4. 로그인된 환자일 경우에만 journeyStore 업데이트 및 경로 탐색
            if (isAuthenticated) {
              await fetchJourneyData(serialNumber);
              // 자동 경로 탐색 트리거
              await useJourneyStore.getState().navigateToDestination();
            }
            
            // 5. 태그 인식 콜백
            if (onTagScanned) {
              onTagScanned(serialNumber, scanResult);
            }
            
            // 6. 적절한 페이지로 이동
            if (responseData.next_action?.route) {
              navigate(responseData.next_action.route);
            } else if (responseData.exam_info) {
              // 검사 정보가 있으면 검사 페이지로
              navigate(`/exam/${responseData.exam_info.exam_id}`);
            } else {
              // 기본적으로 홈으로
              navigate('/');
            }
            
          } else if (scanResult.offline) {
            // 오프라인 모드
            toast.warning('오프라인 모드로 작동 중입니다.', {
              icon: '📡',
              duration: 3000
            });
            
            // 오프라인에서도 기본 동작 수행
            if (onTagScanned) {
              onTagScanned(serialNumber, scanResult);
            }
            navigate('/');
          } else {
            throw new Error(scanResult.error || '알 수 없는 오류');
          }
          
        } catch (error) {
          console.error("데이터 처리 실패:", error);
          toast.error(error.message || '태그 처리 중 오류가 발생했습니다.');
          
          // 에러 발생시에도 기본 동작
          if (onTagScanned) {
            onTagScanned(serialNumber, null);
          }
        } finally {
          // 처리 완료 플래그 해제
          setProcessingTag(false);
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
  }, [navigate, onTagScanned, lastScannedTag, fetchJourneyData, isAuthenticated, processingTag]);

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