import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, PhoneIcon, MapIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import apiService from '../api/apiService';
import './ExamPreparationChecklist.css';

const ExamPreparationChecklist = ({ appointments, onRescheduleRequest, onCompletionChange }) => {
  const [checkedItems, setCheckedItems] = useState({});
  const [expandedExams, setExpandedExams] = useState([]); // 기본적으로 모든 검사를 열어둠
  const [preparations, setPreparations] = useState({});
  const [loading, setLoading] = useState(false);
  const [allRequiredChecked, setAllRequiredChecked] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleStep, setRescheduleStep] = useState(1);

  // 검사별 준비사항 아이콘 매핑
  const getPreparationIcon = (type) => {
    switch (type) {
      case 'fasting': return '🚫';
      case 'medication': return '💊';
      case 'documents': return '📄';
      case 'bladder': return '💧';
      case 'clothing': return '👔';
      case 'arrival': return '⏰';
      case 'general': return '📋';
      default: return '✔️';
    }
  };

  // 검사별 준비사항 데이터 로드
  useEffect(() => {
    const loadPreparations = async () => {
      if (!appointments || appointments.length === 0) return;
      
      setLoading(true);
      try {
        const prepData = {};
        for (const apt of appointments) {
          if (apt.appointment_id) {
            // 개발 환경의 테스트 데이터인 경우 exam 객체에서 직접 가져오기
            if (apt.appointment_id.startsWith('dev-')) {
              console.log(`📋 테스트 데이터 준비사항 (${apt.appointment_id}):`, apt.exam?.preparations);
              prepData[apt.appointment_id] = apt.exam?.preparations || [];
            } else {
              // 실제 API 호출
              try {
                const response = await apiService.getExamPreparation(apt.appointment_id);
                console.log(`📋 준비사항 API 응답 (${apt.appointment_id}):`, response);
                // API 응답 구조에 맞게 데이터 추출
                prepData[apt.appointment_id] = response.data?.preparations || response.preparations || [];
              } catch (error) {
                console.error(`Failed to load preparations for ${apt.appointment_id}:`, error);
                // 실패 시 exam 객체에서 preparations 사용
                prepData[apt.appointment_id] = apt.exam?.preparations || [];
              }
            }
          }
        }
        setPreparations(prepData);
        
        // 모든 검사를 기본적으로 열어둠
        const appointmentIds = appointments.map(apt => apt.appointment_id).filter(id => id);
        setExpandedExams(appointmentIds);
      } catch (error) {
        console.error('Failed to load exam preparations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreparations();
  }, [appointments]);

  // 필수 준비사항 체크 여부 확인
  useEffect(() => {
    let allRequired = true;
    
    for (const apt of appointments) {
      const examPreps = preparations[apt.appointment_id] || [];
      const requiredPreps = examPreps.filter(prep => prep.is_required);
      
      for (const prep of requiredPreps) {
        const key = `${apt.appointment_id}-${prep.prep_id || prep.title}`;
        if (!checkedItems[key]) {
          allRequired = false;
          break;
        }
      }
      
      if (!allRequired) break;
    }
    
    setAllRequiredChecked(allRequired);
    
    // 상위 컴포넌트에 완료 상태 알림
    if (onCompletionChange) {
      onCompletionChange(allRequired);
    }
  }, [checkedItems, preparations, appointments, onCompletionChange]);

  const toggleExpanded = (appointmentId) => {
    setExpandedExams(prev => 
      prev.includes(appointmentId) 
        ? prev.filter(id => id !== appointmentId)
        : [...prev, appointmentId]
    );
  };

  const toggleChecked = (appointmentId, prepId) => {
    const key = `${appointmentId}-${prepId}`;
    setCheckedItems(prev => {
      const newCheckedItems = {
        ...prev,
        [key]: !prev[key]
      };
      
      // 해당 검사의 모든 필수 준비사항이 체크되었는지 확인
      const examPreps = preparations[appointmentId] || [];
      const requiredPreps = examPreps.filter(prep => prep.is_required);
      const allRequiredChecked = requiredPreps.every(prep => 
        newCheckedItems[`${appointmentId}-${prep.prep_id || prep.title}`]
      );
      
      // 모든 필수 준비사항이 체크되었으면 검사를 닫음
      if (allRequiredChecked && requiredPreps.length > 0) {
        setTimeout(() => {
          setExpandedExams(prev => prev.filter(id => id !== appointmentId));
        }, 500); // 약간의 딜레이로 애니메이션 효과
      }
      
      return newCheckedItems;
    });
  };

  const formatTime = (dateTime) => {
    return new Date(dateTime).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRequiredItemsStatus = (appointmentId) => {
    const examPreps = preparations[appointmentId] || [];
    const requiredPreps = examPreps.filter(prep => prep.is_required);
    const checkedCount = requiredPreps.filter(prep => 
      checkedItems[`${appointmentId}-${prep.prep_id || prep.title}`]
    ).length;
    
    return {
      checked: checkedCount,
      total: requiredPreps.length,
      isComplete: checkedCount === requiredPreps.length && requiredPreps.length > 0
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // 예약 변경 모달 컴포넌트
  const RescheduleModal = ({ onClose, step, setStep }) => {
    const [isToday, setIsToday] = useState(false);

    const isScheduledToday = () => {
      if (!appointments || appointments.length === 0) return false;
      const today = new Date().toDateString();
      return appointments.some(apt => new Date(apt.scheduled_at).toDateString() === today);
    };

    React.useEffect(() => {
      setIsToday(isScheduledToday());
    }, [appointments]);

    const renderStep1 = () => (
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002-2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          준비사항을 지키지 못했거나 일정 변경이 필요하신가요?
        </h3>
        <p className="text-gray-600 mb-6">
          아래 방법으로 예약 변경을 도와드리겠습니다
        </p>
        <div className="space-y-3">
          <button
            onClick={() => setStep(2)}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            전화로 변경하기
          </button>
          <button
            onClick={() => setStep(3)}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            병원 앱으로 변경하기
          </button>
        </div>
      </div>
    );

    const renderStep2 = () => (
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PhoneIcon className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          전화로 예약 변경하기
        </h3>
        <div className="bg-blue-50 rounded-xl p-4 mb-4">
          <p className="text-2xl font-bold text-blue-800 mb-1">02-1234-5678</p>
          <p className="text-sm text-blue-600">평일 08:00~17:00</p>
          {isToday && (
            <p className="text-xs text-amber-700 mt-2 font-medium">
              ⚠️ 검사 당일 변경은 제한될 수 있습니다
            </p>
          )}
        </div>
        <button
          onClick={() => window.location.href = 'tel:02-1234-5678'}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          전화하기
        </button>
      </div>
    );

    const renderStep3 = () => (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          병원 앱으로 변경하기
        </h3>
        <p className="text-gray-600 mb-4">
          병원 공식 앱에서 직접 예약을 변경하실 수 있습니다
        </p>
        {isToday && (
          <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
            <p className="text-xs text-amber-700 font-medium">
              ⚠️ 검사 당일 변경은 제한될 수 있습니다
            </p>
          </div>
        )}
        <button
          onClick={() => alert('병원 앱으로 이동합니다')}
          className="w-full py-4 rounded-xl font-semibold transition-colors bg-green-600 text-white hover:bg-green-700"
        >
          병원 앱 열기
        </button>
      </div>
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full h-[500px] shadow-2xl overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-6 pb-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-2 rounded-full transition-colors duration-300 ${
                    s <= step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          
          {/* 슬라이드 컨테이너 */}
          <div className="relative overflow-hidden flex-1">
            <div 
              className="flex h-full"
              style={{ 
                transform: `translateX(-${(step - 1) * 100}%)`,
                transition: 'transform 0.5s ease-in-out'
              }}
            >
              {/* Step 1 */}
              <div className="w-full flex-shrink-0 p-6 pt-0 flex flex-col justify-center">
                {renderStep1()}
              </div>
              
              {/* Step 2 */}
              <div className="w-full flex-shrink-0 p-6 pt-0 flex flex-col justify-center">
                {renderStep2()}
              </div>
              
              {/* Step 3 */}
              <div className="w-full flex-shrink-0 p-6 pt-0 flex flex-col justify-center">
                {renderStep3()}
              </div>
            </div>
          </div>
          
          {step > 1 && (
            <div className="p-6 pt-0">
              <button
                onClick={() => setStep(step - 1)}
                className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← 이전으로
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">

      {/* 검사별 준비사항 */}
      {appointments.map((apt) => {
        const isExpanded = expandedExams.includes(apt.appointment_id);
        const examPreps = preparations[apt.appointment_id] || [];
        const status = getRequiredItemsStatus(apt.appointment_id);
        const hasFasting = examPreps.some(prep => prep.type === 'fasting' && prep.is_required);
        
        return (
          <div 
            key={apt.appointment_id}
            className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 exam-card ${
              status.isComplete 
                ? 'border-green-300 bg-green-50/30 completion-transition' 
                : hasFasting
                  ? 'border-red-300 bg-red-50/30'
                  : 'border-gray-200 bg-white'
            } shadow-sm hover:shadow-md`}
          >
            <button
              onClick={() => toggleExpanded(apt.appointment_id)}
              className={`w-full p-5 flex items-center gap-4 transition-all duration-300 ${
                status.isComplete ? 'bg-green-50/50' : 'hover:bg-gray-50'
              }`}
            >
              
              {/* 검사 정보 */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-lg font-bold text-gray-900">{apt.exam?.title || '검사'}</h4>
                  {hasFasting && (
                    <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full font-bold animate-pulse">
                      금식 필요
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {apt.exam?.department || ''} · {apt.exam?.building || '본관'} {apt.exam?.floor || ''}층
                </p>
                {status.total > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 progress-bar ${
                          status.isComplete ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${(status.checked / status.total) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${
                      status.isComplete ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {status.checked}/{status.total}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 펼침/접힘 화살표 */}
              <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {/* 준비사항 상세 */}
            <div className={`transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            } overflow-hidden`}>
              <div className="px-5 pb-5 space-y-3 border-t border-gray-100">
                {examPreps.length === 0 ? (
                  <div className="py-4 text-center text-gray-500">
                    특별한 준비사항이 없습니다.
                  </div>
                ) : (
                  examPreps.map((prep) => {
                    const key = `${apt.appointment_id}-${prep.prep_id || prep.title}`;
                    const isChecked = checkedItems[key];
                    
                    return (
                      <div
                        key={prep.prep_id || prep.title}
                        className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                          isChecked 
                            ? 'bg-gray-100/70 scale-[0.98]' 
                            : 'hover:bg-blue-50/50 hover:scale-[1.01]'
                        }`}
                      >
                        {/* 체크박스 */}
                        <button
                          onClick={() => toggleChecked(apt.appointment_id, prep.prep_id || prep.title)}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 transform mt-0.5 touch-target focus-visible ${
                            isChecked 
                              ? 'bg-blue-600 border-blue-600 scale-110 shadow-lg check-complete' 
                              : 'bg-white border-gray-400 hover:border-blue-500 hover:scale-105'
                          }`}
                        >
                          {isChecked && (
                            <CheckIconSolid className="w-5 h-5 text-white animate-[scale-in_0.3s_ease-out]" />
                          )}
                        </button>
                        
                        {/* 준비사항 내용 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{getPreparationIcon(prep.type)}</span>
                            <h5 className={`font-semibold ${
                              isChecked ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}>
                              {prep.title}
                              {prep.is_required && (
                                <span className="ml-2 text-xs text-red-600 font-bold">(필수)</span>
                              )}
                            </h5>
                          </div>
                          <p className={`text-sm leading-relaxed ${
                            isChecked ? 'text-gray-400' : 'text-gray-700'
                          }`}>
                            {prep.description}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                
              </div>
            </div>
          </div>
        );
      })}
      
      {/* 예약 변경 버튼 */}
      {appointments.length > 0 && (
        <div className="mt-6">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <button
              onClick={() => setShowRescheduleModal(true)}
              className="w-full py-4 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-3 font-bold text-lg shadow-md hover:shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002-2z" />
              </svg>
              예약 변경이 필요하신가요?
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              준비사항을 지키지 못했거나 일정 변경이 필요한 경우
            </p>
          </div>
        </div>
      )}

      {/* 예약 변경 팝업 모달 */}
      {showRescheduleModal && (
        <RescheduleModal 
          onClose={() => {
            setShowRescheduleModal(false);
            setRescheduleStep(1);
          }} 
          step={rescheduleStep}
          setStep={setRescheduleStep}
        />
      )}
    </div>
  );
};

export default ExamPreparationChecklist;