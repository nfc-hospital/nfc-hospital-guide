import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon, ClipboardDocumentListIcon, CalendarIcon, ChartBarIcon, ExclamationTriangleIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';

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
  paymentAmount = 0 // 수납 금액
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(screenType === 'unregistered' ? 'preparation' : 'completion');
  const [expandedItems, setExpandedItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});

  // 배경 색상 설정 - 더 부드럽고 모던한 그라데이션
  const getBackgroundColor = () => {
    switch (screenType) {
      case 'unregistered':
        return 'from-slate-600 via-slate-700 to-slate-800';
      case 'completed':
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

  // 준비사항 체크리스트 렌더링 - 더 깔끔하고 현대적으로
  const renderPreparationTab = () => (
    <div className="space-y-4">
      {preparationItems?.map((category, categoryIndex) => {
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
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                isAllChecked ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {category.icon}
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
                      {/* 체크박스 - 더 큼직하고 부드럽게 */}
                      <button
                        onClick={() => toggleChecked(categoryIndex, itemIndex)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 transform ${
                          isChecked 
                            ? 'bg-blue-600 border-blue-600 scale-110 shadow-lg' 
                            : 'bg-white border-gray-300 hover:border-blue-500 hover:scale-105'
                        }`}
                      >
                        {isChecked && (
                          <CheckIconSolid className="w-5 h-5 text-white animate-[scale-in_0.3s_ease-out]" />
                        )}
                      </button>
                      
                      {/* 항목 텍스트 - 더 읽기 쉽게 */}
                      <span className={`flex-1 text-base leading-relaxed transition-all duration-300 ${
                        isChecked 
                          ? 'text-gray-400 line-through' 
                          : 'text-gray-700'
                      }`}>
                        {item.text}
                      </span>
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

  // 완료내역 탭 렌더링 - 더 세련되게
  const renderCompletionTab = () => (
    <div className="space-y-4">
      {/* 수납 완료 정보 - screenType이 completed이고 showPaymentInfo가 true일 때만 */}
      {screenType === 'completed' && showPaymentInfo && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-6 text-center border border-green-200">
          <div className="mb-2">
            <svg className="w-12 h-12 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-green-800 mb-2">
            {paymentAmount.toLocaleString()}원
          </div>
          <div className="text-base text-green-700 font-medium">
            수납 완료
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

  // 주의사항 탭 렌더링 - 더 직관적이고 깔끔하게
  const renderPrecautionsTab = () => (
    <div className="space-y-4">
      {precautions?.map((precaution, index) => {
        const isHighPriority = precaution.priority === 'high';
        const baseColor = precaution.bgColor.split(' ')[0].replace('bg-', '').replace('-50', '');
        
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

  // 오늘의 일정 탭 렌더링 (FormatA와 동일)
  const renderScheduleTab = () => (
    <div className="space-y-3">
      {todaySchedule && todaySchedule.map((schedule, index) => {
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
                <h4 className="font-semibold text-gray-900">{schedule.examName}</h4>
                <p className="text-sm text-gray-600">{schedule.location}</p>
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
                  <p className="text-sm text-gray-700">약 {schedule.duration}분</p>
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

  // 탭 구성 결정
  const getTabs = () => {
    if (screenType === 'unregistered') {
      return [
        { key: 'preparation', icon: ClipboardDocumentListIcon, label: '준비사항' },
        { key: 'schedule', icon: CalendarIcon, label: '당일 일정' }
      ];
    } else if (screenType === 'completed') {
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
      {/* 상단 영역 - 배경색 동적 변경 - 컴팩트하게 */}
      <div className={`relative bg-gradient-to-br ${getBackgroundColor()}`}>
        {/* 장식 요소 제거 - 더 깔끔하게 */}
        
        <div className="relative px-4 sm:px-6 lg:px-8 py-3 sm:py-4 pb-12 sm:pb-16">
          {/* 상태 표시 - 심플하게 */}
          <div className="mb-3 sm:mb-4">
            <div className="inline-flex items-center gap-2 sm:gap-3">
              <div className={`w-3 h-3 ${getStatusDotColor()} rounded-full`} />
              <span className="text-white text-lg sm:text-xl font-semibold">{status}</span>
            </div>
          </div>

          {/* 다음 일정 안내 - 컴팩트하게 */}
          {nextSchedule && (
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
        <div>
          {activeTab === 'preparation' && renderPreparationTab()}
          {activeTab === 'completion' && renderCompletionTab()}
          {activeTab === 'precautions' && renderPrecautionsTab()}
          {activeTab === 'schedule' && renderScheduleTab()}
        </div>

        {/* 추가 컨텐츠 영역 */}
        {children && (
          <div className="mt-6">
            {children}
          </div>
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