import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon, ClipboardDocumentListIcon, CalendarIcon, ChartBarIcon, ExclamationTriangleIcon, CheckCircleIcon, SparklesIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import MapNavigator from '../MapNavigator';
import useJourneyStore from '../../store/journeyStore';
import useMapStore from '../../store/mapStore';

const FormatBTemplate = ({
  screenType, // 'unregistered' | 'completed'
  status,
  nextSchedule,
  summaryCards,
  todaySchedule,
  preparationItems,
  completionStats,
  precautions,
  children,
  customPreparationContent, // 준비사항 탭에 추가할 커스텀 콘텐츠
  showPaymentInfo = false, // 수납 정보 표시 여부
  paymentAmount = 0, // 수납 금액
  completedAppointments = [], // 완료된 진료 목록
  totalDuration = 0, // 총 소요시간
  completedCount = 0, // 완료된 검사 수
  showQuickNavigation = true, // 빠른 길찾기 표시 여부
  // FormatATemplate 스타일 속성들
  currentStep,
  totalSteps,
  nextAction,
  locationInfo,
  patientState,
  taggedLocation,
  progressBar, // ✅ ProgressBar 컴포넌트 prop 추가
  header, // ✅ UnifiedHeader 컴포넌트 prop 추가
  mainContent // ✅ Content 컴포넌트 prop 추가
}) => {
  const navigate = useNavigate();
  const taggedLocationInfo = useJourneyStore(state => state.currentLocation);
  const actualCurrentLocation = taggedLocationInfo || taggedLocation;
  const [activeTab, setActiveTab] = useState(
    screenType === 'unregistered' ? 'preparation' : 
    screenType === 'arrived' ? 'location' : 
    'completion'
  );
  const [expandedItems, setExpandedItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [showDemoMap, setShowDemoMap] = useState(false);

  // 배경 색상 설정 - 더 부드럽고 모던한 그라데이션
  const getBackgroundColor = () => {
    switch (screenType) {
      case 'unregistered':
        return 'from-slate-600 via-slate-700 to-slate-800';
      case 'completed':
      case 'finished':
        return 'from-emerald-500 via-emerald-600 to-green-700';
      default:
        return 'from-blue-500 via-blue-600 to-indigo-700';
    }
  };

  // 상태 점 색상 - 더 생동감 있게
  const getStatusDotColor = () => {
    switch (screenType) {
      case 'unregistered':
        return 'bg-amber-400';
      case 'completed':
      case 'finished':
        return 'bg-emerald-400';
      default:
        return 'bg-blue-400';
    }
  };

  const toggleExpanded = (index) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleChecked = (categoryIndex, itemIndex) => {
    const key = `${categoryIndex}-${itemIndex}`;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 진행 상태바 렌더링 (FormatATemplate에서 가져옴)
  const renderProgressSteps = () => {
    if (!todaySchedule || currentStep === undefined) return null;
    
    // 간단한 3단계만 표시 (도착 - 접수 - 검사)
    const steps = [
      { label: '도착', isCompleted: true, isCurrent: currentStep === 0 },
      { label: '접수', isCompleted: currentStep > 0, isCurrent: currentStep === 1 },
      { label: '검사', isCompleted: currentStep > 1, isCurrent: currentStep >= 2 }
    ];
    
    return steps.map((step, index) => {
      const { isCompleted, isCurrent } = step;
      
      return (
        <div key={index} className="flex flex-col items-center relative" style={{ flex: '1 1 0%' }}>
          {/* 연결선 */}
          {index > 0 && (
            <div className="absolute top-3 sm:top-4 h-0.5" style={{
              left: '-50%',
              right: '50%',
              background: isCompleted || isCurrent
                ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.7) 20%, rgba(255,255,255,0.7) 80%, transparent)'
                : 'linear-gradient(to right, transparent, rgba(255,255,255,0.25) 20%, rgba(255,255,255,0.25) 80%, transparent)'
            }} />
          )}
          
          <div className="relative">
            <div className={`
              relative w-5 h-5 sm:w-6 sm:h-6 rounded-full 
              flex items-center justify-center transition-all duration-500 
              ${isCompleted 
                ? 'bg-white shadow-md' 
                : isCurrent 
                ? 'bg-amber-400 shadow-lg ring-2 ring-white/30 scale-110' 
                : 'bg-white/15 backdrop-blur-sm border border-white/25'
              }
            `}>
              {isCompleted ? (
                <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600" />
              ) : isCurrent ? (
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              ) : (
                <div className="w-1 h-1 bg-white/50 rounded-full" />
              )}
            </div>
          </div>
          
          <div className="mt-1">
            <div className={`text-[11px] sm:text-xs font-medium transition-all duration-300 whitespace-nowrap text-center ${
              isCurrent ? 'text-white' : isCompleted ? 'text-white/90' : 'text-white/60'
            }`}>
              {step.label}
            </div>
          </div>
        </div>
      );
    });
  };

  // 준비사항 체크리스트 렌더링 - 더 깔끔하고 현대적으로
  const renderPreparationTab = () => {
    // 안전한 데이터 사용
    const safePreparationItems = preparationItems || [];

    if (safePreparationItems.length === 0) {
      // 기본 준비사항 제공
      const defaultPreparationItems = [
        {
          title: "병원 방문 시 준비사항",
          description: "원활한 진료를 위해 준비해 주세요",
          icon: "🏥",
          items: [
            { title: "신분증 지참", description: "본인 확인을 위해 신분증을 꼭 지참해 주세요" },
            { title: "보험증 준비", description: "건강보험증 또는 의료보험 관련 서류를 준비해 주세요" },
            { title: "이전 검사 결과", description: "관련된 이전 검사 결과가 있다면 가져와 주세요" }
          ]
        },
        {
          title: "검사 전 주의사항",
          description: "정확한 검사를 위해 지켜주세요",
          icon: "⚠️",
          items: [
            { title: "복용 중인 약물 확인", description: "현재 복용 중인 모든 약물을 의료진에게 알려주세요" },
            { title: "알레르기 정보 확인", description: "약물이나 음식 알레르기가 있다면 미리 알려주세요" }
          ]
        }
      ];

      return (
        <div className="space-y-4">
          {defaultPreparationItems.map((category, categoryIndex) => {
            const isExpanded = expandedItems.includes(categoryIndex);
            const categoryCheckedCount = category.items?.filter((_, itemIndex) =>
              checkedItems[`${categoryIndex}-${itemIndex}`]
            ).length || 0;
            const totalItems = category.items?.length || 0;
            const isAllChecked = categoryCheckedCount === totalItems && totalItems > 0;

            return (
              <div
                key={categoryIndex}
                className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 ${
                  isAllChecked ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white'
                } shadow-sm hover:shadow-md`}
              >
                <button
                  onClick={() => toggleExpanded(categoryIndex)}
                  className={`w-full p-5 flex items-center gap-4 transition-all duration-300 ${
                    isAllChecked ? 'bg-green-50/50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* 카테고리 아이콘 - 더 크고 배경 추가 */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                    isAllChecked ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">{category.icon}</span>
                  </div>

                  {/* 카테고리 정보 */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-gray-900">{category.title}</h4>
                      {categoryCheckedCount > 0 && (
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                          isAllChecked ? 'bg-green-200 text-green-800' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {categoryCheckedCount}/{totalItems}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  </div>

                  {/* 펼침/접힘 화살표 - 더 부드럽게 */}
                  <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon className="w-6 h-6 text-gray-400" />
                  </div>
                </button>

                {/* 체크리스트 상세 내용 - 애니메이션 추가 */}
                <div className={`transition-all duration-300 ease-in-out ${
                  isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                } overflow-hidden`}>
                  <div className="px-5 pb-5 space-y-2 border-t border-gray-100">
                    {category.items?.map((item, itemIndex) => {
                      const key = `${categoryIndex}-${itemIndex}`;
                      const isChecked = checkedItems[key];

                      return (
                        <div
                          key={itemIndex}
                          className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                            isChecked
                              ? 'bg-gray-100/70 scale-[0.98]'
                              : 'hover:bg-blue-50/50 hover:scale-[1.01]'
                          }`}
                        >
                          {/* 항목 텍스트 - 더 읽기 쉽게 */}
                          <div className="flex-1">
                            <h5 className={`text-lg font-bold mb-1.5 transition-all duration-300 ${
                              isChecked
                                ? 'text-gray-400 line-through'
                                : 'text-gray-900'
                            }`}>
                              {item.title || item.text}
                            </h5>
                            {item.description && (
                              <p className={`text-sm text-gray-600 leading-relaxed transition-all duration-300 ${
                                isChecked ? 'line-through' : ''
                              }`}>
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* 체크박스 - 오른쪽으로 이동 */}
                          <button
                            onClick={() => toggleChecked(categoryIndex, itemIndex)}
                            className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-300 transform flex-shrink-0 ${
                              isChecked
                                ? 'bg-blue-600 border-blue-600 scale-110 shadow-lg'
                                : 'bg-gray-50 border-gray-500 hover:bg-gray-100 hover:border-gray-700 hover:scale-105 shadow-sm'
                            }`}
                          >
                            {isChecked && (
                              <CheckIconSolid className="w-5 h-5 text-white animate-[scale-in_0.3s_ease-out]" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 커스텀 준비사항 콘텐츠 추가 */}
          {customPreparationContent && customPreparationContent}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {safePreparationItems.map((category, categoryIndex) => {
          // customContent가 있는 경우 직접 렌더링
          if (category.customContent) {
            return (
              <div key={categoryIndex}>
                {category.customContent}
              </div>
            );
          }

          const isExpanded = expandedItems.includes(categoryIndex);
          const categoryCheckedCount = category.items?.filter((_, itemIndex) =>
            checkedItems[`${categoryIndex}-${itemIndex}`]
          ).length || 0;
          const totalItems = category.items?.length || 0;
          const isAllChecked = categoryCheckedCount === totalItems && totalItems > 0;

          return (
            <div
              key={categoryIndex}
              className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 ${
                isAllChecked ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white'
              } shadow-sm hover:shadow-md`}
            >
              <button
                onClick={() => toggleExpanded(categoryIndex)}
                className={`w-full p-5 flex items-center gap-4 transition-all duration-300 ${
                  isAllChecked ? 'bg-green-50/50' : 'hover:bg-gray-50'
                }`}
              >
                {/* 카테고리 아이콘 - 더 크고 배경 추가 */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                  isAllChecked ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <span className="text-2xl">{category.icon}</span>
                </div>

                {/* 카테고리 정보 */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-gray-900">{category.title}</h4>
                    {categoryCheckedCount > 0 && (
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        isAllChecked ? 'bg-green-200 text-green-800' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {categoryCheckedCount}/{totalItems}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                </div>

                {/* 펼침/접힘 화살표 - 더 부드럽게 */}
                <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDownIcon className="w-6 h-6 text-gray-400" />
                </div>
              </button>

              {/* 체크리스트 상세 내용 - 애니메이션 추가 */}
              <div className={`transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              } overflow-hidden`}>
                <div className="px-5 pb-5 space-y-2 border-t border-gray-100">
                  {category.items?.map((item, itemIndex) => {
                    const key = `${categoryIndex}-${itemIndex}`;
                    const isChecked = checkedItems[key];

                    return (
                      <div
                        key={itemIndex}
                        className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                          isChecked
                            ? 'bg-gray-100/70 scale-[0.98]'
                            : 'hover:bg-blue-50/50 hover:scale-[1.01]'
                        }`}
                      >
                        {/* 항목 텍스트 - 더 읽기 쉽게 */}
                        <div className="flex-1">
                          <h5 className={`text-lg font-bold mb-1.5 transition-all duration-300 ${
                            isChecked
                              ? 'text-gray-400 line-through'
                              : 'text-gray-900'
                          }`}>
                            {item.title || item.text}
                          </h5>
                          {item.description && (
                            <p className={`text-sm text-gray-600 leading-relaxed transition-all duration-300 ${
                              isChecked ? 'line-through' : ''
                            }`}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* 체크박스 - 오른쪽으로 이동 */}
                        <button
                          onClick={() => toggleChecked(categoryIndex, itemIndex)}
                          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-300 transform flex-shrink-0 ${
                            isChecked
                              ? 'bg-blue-600 border-blue-600 scale-110 shadow-lg'
                              : 'bg-gray-50 border-gray-500 hover:bg-gray-100 hover:border-gray-700 hover:scale-105 shadow-sm'
                          }`}
                        >
                          {isChecked && (
                            <CheckIconSolid className="w-5 h-5 text-white animate-[scale-in_0.3s_ease-out]" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* 커스텀 준비사항 콘텐츠 추가 */}
        {customPreparationContent && customPreparationContent}
      </div>
    );
  };

  // 위치 안내 탭 렌더링 (arrived 화면 전용)
  const renderLocationTab = () => (
    <div className="space-y-4">
      {/* 목적지 정보 */}
      {locationInfo && (
        <div className="mb-4">
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center justify-center text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">현재:</span>
                <span className="font-medium text-gray-800">
                  {actualCurrentLocation?.description || actualCurrentLocation?.building && actualCurrentLocation?.floor 
                    ? `${actualCurrentLocation.building} ${actualCurrentLocation.floor}층${actualCurrentLocation.room ? ` ${actualCurrentLocation.room}` : ''}`
                    : '병원 입구'}
                </span>
              </div>
              <span className="text-gray-400 mx-4">→</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">목적지:</span>
                <span className="font-semibold text-blue-700">
                  {locationInfo.name || locationInfo.room || '원무과 접수처'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 지도 표시 영역 */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden relative">
        <div className="p-6">
          <MapNavigator 
            mapId={locationInfo?.mapFile?.replace('.svg', '') || 'main_1f'}
            highlightRoom={locationInfo?.name || '원무과 접수처'}
            facilityName={locationInfo?.name || '원무과 접수처'}
            multiFloor={false}
            startFloor="main_1f"
            endFloor={locationInfo?.mapFile?.replace('.svg', '') || 'main_1f'}
          />
        </div>
      </div>

      {/* 접수하는 방법 안내 */}
      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
        <h4 className="text-lg font-bold text-blue-900 mb-4">접수하는 방법</h4>
        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full 
                         flex items-center justify-center font-bold">1</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">접수처로 이동</p>
              <p className="text-sm text-gray-600 mt-1">정문 들어오셔서 좌측 접수창구</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full 
                         flex items-center justify-center font-bold">2</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">신분증 제시</p>
              <p className="text-sm text-gray-600 mt-1">본인 확인을 위해 신분증을 준비해주세요</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full 
                         flex items-center justify-center font-bold">3</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900">접수 완료</p>
              <p className="text-sm text-gray-600 mt-1">오늘의 검사 일정을 확인받으세요</p>
            </div>
          </li>
        </ol>
      </div>

      {/* 다른 장소 찾기 버튼 */}
      <button
        onClick={() => navigate('/')}
        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl p-3 font-medium transition-all duration-300"
      >
        다른 장소 찾기 →
      </button>
    </div>
  );

  // 완료내역 탭 렌더링 - 더 세련되게
  const renderCompletionTab = () => {
    // 안전한 데이터 사용
    const safeCompletedAppointments = completedAppointments || [];
    const safeTotalDuration = totalDuration || 0;
    const safeCompletedCount = completedCount || 0;
    const safeTodaySchedule = todaySchedule || [];

    return (
      <div className="space-y-4">
        {/* 완료 통계 카드 - 항상 표시 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-200">
            <p className="text-sm text-emerald-600 font-medium mb-1">소요시간</p>
            <p className="text-2xl font-bold text-emerald-700">
              {completionStats?.totalDurationText ||
               (safeTotalDuration >= 60 ?
                `${Math.floor(safeTotalDuration / 60)}시간 ${safeTotalDuration % 60}분` :
                `${safeTotalDuration}분`)
              }
            </p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-200">
            <p className="text-sm text-emerald-600 font-medium mb-1">완료 검사</p>
            <p className="text-2xl font-bold text-emerald-700">
              {completionStats?.completedCount !== undefined ?
                `${completionStats.completedCount}/${completionStats.totalCount}` :
                `${safeCompletedCount}개`
              }
            </p>
          </div>
        </div>

        {/* 수납 완료 영수증 - FINISHED 상태이거나 showPaymentInfo가 true일 때 표시 */}
        {(screenType === 'finished' || (screenType === 'completed' && showPaymentInfo)) && (
          <div>

          {/* 영수증 */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
            {/* 영수증 헤더 */}
            <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">수납 완료</h3>
                <p className="text-green-100">
                  {new Date().toLocaleDateString('ko-KR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-100 mb-1">총 수납액</p>
                <p className="text-3xl font-bold">{paymentAmount.toLocaleString()}원</p>
              </div>
            </div>
          </div>
          
          {/* 영수증 본문 */}
          <div className="p-6">
            {/* 진료 내역 */}
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                진료 내역
              </h4>
              
              <div className="space-y-3">
                {safeCompletedAppointments.length > 0 ? safeCompletedAppointments.map((apt, index) => {
                  const cost = apt.cost || apt.exam?.cost || '25000';
                  const numericCost = typeof cost === 'string' ? 
                    parseInt(cost.replace(/[^0-9]/g, '')) : cost;
                  
                  return (
                    <div 
                      key={apt.appointment_id} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl
                               hover:bg-gray-100 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center
                                      group-hover:scale-110 transition-transform duration-300">
                          <span className="text-emerald-700 font-bold text-lg">{index + 1}</span>
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900">{apt.exam?.title || '검사'}</h5>
                          <p className="text-sm text-gray-600">
                            {apt.exam?.department} · {apt.completedAt || '완료'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">
                          {numericCost.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  );
                }) : (
                  // 완료된 검사가 없을 때
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📋</span>
                    </div>
                    <p className="text-gray-500 text-lg mb-2">완료된 검사가 없습니다</p>
                    <p className="text-gray-400 text-sm">백엔드 데이터를 확인하거나 검사를 완료해주세요</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* 구분선 */}
            <div className="border-t-2 border-dashed border-gray-300 my-6"></div>
            
            {/* 결제 정보 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-gray-600">
                <span>진료비 합계</span>
                <span>{paymentAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>공단부담금</span>
                <span>{Math.floor(paymentAmount * 0.7).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-lg font-bold text-gray-900">본인부담금</span>
                <span className="text-xl font-bold text-emerald-600">
                  {Math.floor(paymentAmount * 0.3).toLocaleString()}원
                </span>
              </div>
            </div>
            
            {/* 결제 방법 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">결제 완료</p>
                    <p className="text-sm text-gray-600">신용카드</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
            
            {/* 영수증 아이콘 애니메이션 */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>영수증을 캡처하여 보관하세요</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}
      
      {/* 처방전 안내 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 hover:shadow-md transition-all duration-300">
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-200/20 rounded-full blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl shadow-sm">
            💊
          </div>
          <div className="flex-1">
            <h5 className="font-bold text-blue-900 mb-1.5 text-lg">처방전 안내</h5>
            <p className="text-base text-blue-800 leading-relaxed">1층 원무과에서 처방전을 받아 약국에서 약을 받으세요.</p>
          </div>
        </div>
      </div>
      
      {/* 통계 카드들 - 더 현대적으로 */}
      {completionStats && completionStats.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {completionStats.map((stat, index) => (
            <div 
              key={index}
              className={`group relative overflow-hidden rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg ${stat.bgColor} shadow-md`}
            >
              {/* 장식 요소 */}
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
              
              <div className="relative">
                <div className="mb-3 filter drop-shadow-sm flex justify-center">{stat.icon}</div>
                <div className="font-bold text-xl mb-1">{stat.value}</div>
                <div className="text-sm font-medium opacity-80">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

  // 주의사항 탭 렌더링 - 더 직관적이고 깔끔하게
  const renderPrecautionsTab = () => {
    // 안전한 데이터 사용
    const safePrecautions = precautions || [];

    if (safePrecautions.length === 0) {
      // 기본 주의사항 제공
      const defaultPrecautions = [
        {
          title: "결과 확인",
          icon: "🔍",
          priority: "medium",
          bgColor: "bg-blue-50",
          items: [
            "검사 결과는 담당의와 상담을 통해 확인하세요",
            "추가 검사가 필요한 경우 안내를 받으세요",
            "궁금한 점은 담당 의료진에게 문의하세요"
          ]
        },
        {
          title: "처방전 및 수납",
          icon: "💊",
          priority: "high",
          bgColor: "bg-green-50",
          items: [
            "처방전이 있는 경우 1층 원무과에서 받으세요",
            "수납이 필요한 경우 원무과에서 진행하세요",
            "영수증을 보관하여 보험 청구에 활용하세요"
          ]
        },
        {
          title: "다음 방문 안내",
          icon: "📅",
          priority: "medium",
          bgColor: "bg-amber-50",
          items: [
            "다음 진료 예약이 있는 경우 확인하세요",
            "정기 검진 일정을 미리 계획하세요",
            "응급상황 시 연락처를 확인하세요"
          ]
        }
      ];

      return (
        <div className="space-y-4">
          {defaultPrecautions.map((precaution, index) => {
            const isHighPriority = precaution.priority === 'high';

            return (
              <div
                key={index}
                className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                  isHighPriority
                    ? 'border-red-200 shadow-md'
                    : precaution.priority === 'medium'
                    ? 'border-orange-200'
                    : 'border-gray-200'
                }`}
              >
                {/* 우선순위별 배경 그라데이션 */}
                <div className={`absolute inset-0 opacity-30 bg-gradient-to-r ${
                  isHighPriority
                    ? 'from-red-50 to-pink-50'
                    : precaution.priority === 'medium'
                    ? 'from-orange-50 to-amber-50'
                    : 'from-blue-50 to-indigo-50'
                }`} />

                <div className="relative p-5">
                  <div className="flex items-start gap-4">
                    {/* 아이콘 박스 */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0 ${
                      isHighPriority
                        ? 'bg-red-100'
                        : precaution.priority === 'medium'
                        ? 'bg-orange-100'
                        : 'bg-blue-100'
                    }`}>
                      {precaution.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h5 className="font-bold text-lg text-gray-900">{precaution.title}</h5>
                        {isHighPriority && (
                          <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full font-bold shadow-sm animate-pulse">
                            중요
                          </span>
                        )}
                      </div>

                      <ul className="space-y-2">
                        {precaution.items?.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-3 group">
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              isHighPriority ? 'bg-red-400' : 'bg-gray-400'
                            }`} />
                            <span className="text-base text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {safePrecautions.map((precaution, index) => {
          const isHighPriority = precaution.priority === 'high';
          const baseColor = precaution.bgColor?.split(' ')[0]?.replace('bg-', '')?.replace('-50', '') || 'blue';

          return (
            <div
              key={index}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                isHighPriority
                  ? 'border-red-200 shadow-md'
                  : precaution.priority === 'medium'
                  ? 'border-orange-200'
                  : 'border-gray-200'
              }`}
            >
              {/* 우선순위별 배경 그라데이션 */}
              <div className={`absolute inset-0 opacity-30 bg-gradient-to-r ${
                isHighPriority
                  ? 'from-red-50 to-pink-50'
                  : precaution.priority === 'medium'
                  ? 'from-orange-50 to-amber-50'
                  : 'from-blue-50 to-indigo-50'
              }`} />

              <div className="relative p-5">
                <div className="flex items-start gap-4">
                  {/* 아이콘 박스 */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0 ${
                    isHighPriority
                      ? 'bg-red-100'
                      : precaution.priority === 'medium'
                      ? 'bg-orange-100'
                      : 'bg-blue-100'
                  }`}>
                    {precaution.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h5 className="font-bold text-lg text-gray-900">{precaution.title}</h5>
                      {isHighPriority && (
                        <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full font-bold shadow-sm animate-pulse">
                          중요
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {precaution.items?.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-3 group">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isHighPriority ? 'bg-red-400' : 'bg-gray-400'
                          }`} />
                          <span className="text-base text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 오늘의 일정 탭 렌더링 (FormatA와 동일)
  const renderScheduleTab = () => {
    // 안전한 데이터 사용
    const safeTodaySchedule = todaySchedule || [];

    if (safeTodaySchedule.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-gray-500 text-lg">오늘 예정된 검사가 없습니다</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {safeTodaySchedule.map((schedule, index) => {
          const isExpanded = expandedItems.includes(`schedule-${index}`);
          const isCompleted = schedule.status === 'completed' || schedule.status === 'done';

          return (
            <div
              key={index}
              className="border rounded-xl overflow-hidden transition-all duration-300 border-gray-200"
            >
              <button
                onClick={() => toggleExpanded(`schedule-${index}`)}
                className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                {/* 번호 원형 */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? <CheckIcon className="w-5 h-5" /> : index + 1}
                </div>

                {/* 일정 정보 */}
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900">{schedule.examName || schedule.name || '검사'}</h4>
                  <p className="text-sm text-gray-600">{schedule.location || schedule.room || '위치 미정'}</p>
                </div>

                {/* 펼침/접힘 화살표 */}
                {isExpanded ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* 상세 정보 */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-3 hover:bg-blue-50/90 transition-colors duration-300">
                    <h5 className="text-sm font-medium text-blue-900 mb-1">검사 목적</h5>
                    <p className="text-sm text-blue-700">{schedule.purpose || schedule.description || '건강 상태 확인 및 진단'}</p>
                  </div>

                  {schedule.preparation && (
                    <div className="bg-amber-50/80 backdrop-blur-sm rounded-lg p-3 hover:bg-amber-50/90 transition-colors duration-300">
                      <h5 className="text-sm font-medium text-amber-900 mb-1">준비사항</h5>
                      <p className="text-sm text-amber-700">{schedule.preparation}</p>
                    </div>
                  )}

                  <div className="bg-gray-50/80 backdrop-blur-sm rounded-lg p-3 hover:bg-gray-50/90 transition-colors duration-300">
                    <h5 className="text-sm font-medium text-gray-900 mb-1">소요시간</h5>
                    <p className="text-sm text-gray-700">약 {schedule.duration || 30}분</p>
                  </div>

                  {isCompleted && schedule.completedAt && (
                    <div className="bg-green-50/80 backdrop-blur-sm rounded-lg p-3">
                      <h5 className="text-sm font-medium text-green-900 mb-1">완료 정보</h5>
                      <p className="text-sm text-green-700">완료 시간: {schedule.completedAt}</p>
                      {schedule.cost && (
                        <p className="text-sm text-green-700">진료비: {schedule.cost}원</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 탭 구성 결정
  const getTabs = () => {
    if (screenType === 'unregistered') {
      return [
        { key: 'preparation', icon: ClipboardDocumentListIcon, label: '준비사항' },
        { key: 'schedule', icon: CalendarIcon, label: '당일 일정' }
      ];
    } else if (screenType === 'arrived') {
      return [
        { key: 'location', icon: MapPinIcon, label: '위치 안내' },
        { key: 'preparation', icon: ClipboardDocumentListIcon, label: '준비사항' },
        { key: 'schedule', icon: CalendarIcon, label: '오늘 일정' }
      ];
    } else if (screenType === 'completed' || screenType === 'finished') {
      return [
        { key: 'completion', icon: ChartBarIcon, label: '완료내역' },
        { key: 'precautions', icon: ExclamationTriangleIcon, label: '주의사항' },
        { key: 'schedule', icon: CheckCircleIcon, label: '끝난 검사/진료' }
      ];
    }
    return [];
  };

  const tabs = getTabs();

  return (
    <div className="w-full">
      {/* ✅ UnifiedHeader 렌더링 */}
      {header && header}

      {/* 상단 영역 - 배경색 동적 변경 - 컴팩트하게 */}
      <div className={`relative bg-gradient-to-br ${getBackgroundColor()}`}>
        {/* 장식 요소 제거 - 더 깔끔하게 */}
        
        <div className="relative px-4 sm:px-6 lg:px-8 py-3 sm:py-4 pb-12 sm:pb-16">
          {/* arrived 타입일 때만 진행 상태바 표시 (header가 없을 때만) */}
          {screenType === 'arrived' && currentStep !== undefined && !header && (
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center flex-1">
                  {renderProgressSteps()}
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <div className="text-white/70 text-xs sm:text-sm">진행</div>
                  <div className="text-white flex items-baseline gap-0.5">
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{currentStep}</span>
                    <span className="text-sm sm:text-base lg:text-xl text-white/70">/{totalSteps}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 기본 상태 표시 (arrived가 아니고 header가 없을 때만) */}
          {screenType !== 'arrived' && !header && (
            <div className="mb-3 sm:mb-4">
              <div className="inline-flex items-center gap-2 sm:gap-3">
                <div className={`w-3 h-3 ${getStatusDotColor()} rounded-full`} />
                <span className="text-white text-lg sm:text-xl font-semibold">{status}</span>
              </div>
            </div>
          )}

          {/* 다음 행동 안내 (arrived일 때) 또는 다음 일정 안내 */}
          {screenType === 'arrived' && nextAction ? (
            <div className="bg-white/20 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 border border-white/30 hover:bg-white/25 transition-all duration-300">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-amber-400 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-amber-400 rounded-full animate-ping" />
                </div>
                <span className="text-amber-400 text-sm sm:text-base font-medium">다음</span>
                <span className="text-white text-base sm:text-lg lg:text-xl font-bold flex-1">{nextAction}</span>
              </div>
            </div>
          ) : nextSchedule && (
            <div className="bg-white/15 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 border border-white/20">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-0.5">
                  <CalendarIcon className="w-4 h-4 text-white/80" />
                  <p className="text-white/90 text-sm font-medium">다음 일정</p>
                </div>
                <p className="text-white text-lg sm:text-xl font-semibold">{nextSchedule}</p>
              </div>
            </div>
          )}

          {/* 요약 카드 - 높이 축소 */}
          {summaryCards && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {summaryCards.map((card, index) => (
                <div 
                  key={index}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl px-4 py-2 sm:py-2.5 border border-white/25"
                >
                  <div className="text-center">
                    <p className="text-white/80 text-xs sm:text-sm">{card.label}</p>
                    <p className="text-white text-lg sm:text-xl font-semibold">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 영역 - 흰색 배경 */}
      <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 -mt-8 rounded-t-[2.5rem] relative shadow-xl">
        {/* 탭 네비게이션 - 심플한 밑줄 스타일 */}
        <div className="mb-6">
          <div className="flex gap-0 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 pb-3 pt-2 flex items-center justify-center gap-2 transition-all duration-300 relative ${
                  activeTab === tab.key 
                    ? 'text-blue-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className={`font-medium ${tabs.length > 2 ? 'text-sm' : 'text-base'}`}>
                  {tab.label}
                </span>
                
                {/* 활성 탭 밑줄 */}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 내용 */}
        <div className="min-h-[400px]">
          {/* 모든 상태에서 탭별 내용 렌더링 */}
          {activeTab === 'location' && renderLocationTab()}
          {activeTab === 'preparation' && renderPreparationTab()}
          {activeTab === 'completion' && renderCompletionTab()}
          {activeTab === 'precautions' && renderPrecautionsTab()}
          {activeTab === 'schedule' && renderScheduleTab()}

          {/* FINISHED 상태가 아닐 때만 추가로 Content 컴포넌트 표시 */}
          {screenType !== 'finished' && (
            <div className="mt-6">
              {mainContent || children}
            </div>
          )}
        </div>

        {/* 공통 빠른 길찾기 섹션 - 고정 위치 (NFC 안내 바로 위) */}
        {showQuickNavigation && (
          <section className="mt-12 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              빠른 길찾기
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <button 
                onClick={() => navigate('/public', { state: { selectedFacility: { name: '약국', building: '본관', floor: '1층' } } })}
                className="group bg-white border-2 border-green-200 rounded-2xl p-4 transition-all duration-300 hover:border-green-300 hover:shadow-lg hover:bg-green-50">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    💊
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900">약국</h4>
                    <p className="text-xs text-gray-600">본관 1층</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/public', { state: { selectedFacility: { name: '주차장', building: '지하', floor: 'B1' } } })}
                className="group bg-white border-2 border-purple-200 rounded-2xl p-4 transition-all duration-300 hover:border-purple-300 hover:shadow-lg hover:bg-purple-50">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-16 h-16 bg-purple-50 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    🚗
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900">주차장</h4>
                    <p className="text-xs text-gray-600">지하/야외</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/public', { state: { selectedFacility: { name: '병원 전체 지도', building: '전체', floor: '전체' } } })}
                className="group bg-white border-2 border-blue-200 rounded-2xl p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:bg-blue-50">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    🗺️
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900">지도</h4>
                    <p className="text-xs text-gray-600">전체 안내</p>
                  </div>
                </div>
              </button>
            </div>
            
            {/* 다른 장소 찾기 (처음으로 돌아가기 버튼) */}
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
              <button 
                onClick={() => navigate('/public')}
                className="w-full group bg-white text-slate-900 rounded-xl py-4 px-6 font-bold text-lg border-2 border-gray-200
                         hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md 
                         flex items-center justify-center gap-2">
                다른 장소 찾기
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          </section>
        )}
        
        {/* NFC 안내 - 최하단 - 세련되게 */}
        <div className="mt-auto pt-6 pb-8">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} 
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  <circle cx="12" cy="12" r="3" strokeWidth={2} className="animate-pulse" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  벽의 <span className="text-blue-600">파란 NFC 스티커</span>에 핸드폰을 대 주세요
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  현재 위치에서 목적지까지 안내해 드립니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormatBTemplate;