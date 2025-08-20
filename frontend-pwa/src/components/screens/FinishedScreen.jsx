import React from 'react';
import useJourneyStore from '../../store/journeyStore';
import { useNavigate } from 'react-router-dom';
import FormatBTemplate from '../templates/FormatBTemplate';

export default function FinishedScreen({ taggedLocation }) {
  const { user, todaysAppointments = [] } = useJourneyStore();
  const navigate = useNavigate();

  // 다음 일정 정보
  const upcomingAppointments = todaysAppointments.filter(apt => 
    ['scheduled', 'pending'].includes(apt.status)
  );
  const nextSchedule = upcomingAppointments.length > 0 
    ? `${new Date(upcomingAppointments[0].scheduled_at).toLocaleDateString('ko-KR')} ${new Date(upcomingAppointments[0].scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
    : '예정된 일정 없음';

  // 완료 통계
  const completedAppointments = todaysAppointments.filter(apt => 
    ['completed', 'done'].includes(apt.status)
  );
  const completedCount = completedAppointments.length;
  const totalDuration = completedAppointments
    .reduce((sum, apt) => sum + (apt.exam?.average_duration || 30), 0);
  const totalCost = 80000; // 예시 비용

  const completionStats = [
    { icon: '⏱️', value: `${Math.floor(totalDuration / 60)}시간 ${totalDuration % 60}분`, label: '총 소요시간', bgColor: 'bg-blue-100 text-blue-800' },
    { icon: '✅', value: `${completedCount}개`, label: '완료 항목', bgColor: 'bg-green-100 text-green-800' },
    { icon: '💳', value: `${totalCost.toLocaleString()}원`, label: '총 진료비', bgColor: 'bg-purple-100 text-purple-800' }
  ];

  // 주의사항
  const precautions = [
    {
      icon: '💊',
      title: '처방 약물 복용법',
      priority: 'high',
      bgColor: 'bg-red-50 text-red-800',
      items: [
        '처방받은 약물을 정해진 시간에 정확히 복용하세요',
        '임의로 복용량을 늘리거나 줄이지 마세요',
        '부작용이 나타나면 즉시 병원에 연락하세요'
      ]
    },
    {
      icon: '📸',
      title: 'X-ray 관련 주의사항',
      priority: 'medium',
      bgColor: 'bg-orange-50 text-orange-800',
      items: [
        '임신 가능성이 있는 경우 의료진에게 알려주세요',
        '방사선 노출량은 안전 기준 이내입니다',
        '다음 X-ray 검사까지 최소 1주일 간격을 두세요'
      ]
    },
    {
      icon: '🩸',
      title: '채혈검사 관련 안내',
      priority: 'low',
      bgColor: 'bg-blue-50 text-blue-800',
      items: [
        '검사 후 2-3일 후 결과를 확인하세요',
        '채혈 부위는 24시간 동안 물이 닿지 않게 하세요',
        '결과 이상 시 추가 검사가 필요할 수 있습니다'
      ]
    }
  ];

  // 오늘의 일정 (완료된 것들)
  const todaySchedule = todaysAppointments?.map((apt, index) => ({
    id: apt.appointment_id,
    examName: apt.exam?.title || `검사 ${index + 1}`,
    location: `${apt.exam?.building || '본관'} ${apt.exam?.floor || ''}층 ${apt.exam?.room || ''}`,
    status: apt.status,
    description: apt.exam?.description,
    purpose: apt.exam?.description || '건강 상태 확인 및 진단',
    preparation: null,
    duration: apt.exam?.average_duration || 30,
    scheduled_at: apt.scheduled_at,
    department: apt.exam?.department,
    completedAt: apt.status === 'completed' || apt.status === 'done' 
      ? new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      : null,
    cost: apt.status === 'completed' || apt.status === 'done' ? '25,000' : null
  })) || [];

  return (
    <FormatBTemplate
      screenType="completed"
      status="완료"
      nextSchedule={nextSchedule}
      summaryCards={[
        { label: '총 소요시간', value: `${Math.floor(totalDuration / 60)}시간 ${totalDuration % 60}분` },
        { label: '완료 항목', value: `${completedCount}개` }
      ]}
      todaySchedule={todaySchedule}
      completionStats={completionStats}
      precautions={precautions}
    >
      {/* 완료 축하 메시지 - 더 크고 화려하게 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-3xl p-8 text-center mb-8 shadow-lg border border-green-200">
        {/* 장식 요소 */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-200/30 rounded-full blur-3xl" />
        
        <div className="relative">
          {/* 축하 아이콘 - 애니메이션 추가 */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-green-300 to-emerald-300 rounded-full blur-lg opacity-50 animate-pulse" />
            <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-xl">
              <span className="text-6xl animate-bounce">🎉</span>
            </div>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-green-900 mb-3">
            모든 검사가 성공적으로 완료되었습니다
          </h2>
          <p className="text-lg sm:text-xl text-green-800 leading-relaxed">
            <span className="font-semibold text-green-900">{user?.name}</span>님, 수고하셨습니다.<br />
            안전히 귀가하세요.
          </p>
        </div>
      </div>

      {/* 귀가 안내 - 더 크고 직관적으로 */}
      <div className="space-y-5">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-blue-600">!</span>
          </div>
          귀가 전 들르실 곳
        </h3>
        
        {/* 원무과 버튼 */}
        <button 
          onClick={() => navigate('/map?destination=원무과')}
          className="w-full bg-white rounded-3xl shadow-lg border border-gray-200 p-6 
                   hover:shadow-xl transition-all duration-300 text-left group
                   hover:border-blue-300 hover:scale-[1.02] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-0 
                        group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
                <span className="text-3xl">💳</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">원무과</h4>
                <p className="text-base text-gray-600">
                  <span className="font-medium">본관 1층</span> - 수납이 필요한 경우
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">길찾기</span>
              <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
        
        {/* 약국 버튼 */}
        <button 
          onClick={() => navigate('/map?destination=약국')}
          className="w-full bg-white rounded-3xl shadow-lg border border-gray-200 p-6 
                   hover:shadow-xl transition-all duration-300 text-left group
                   hover:border-green-300 hover:scale-[1.02] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-transparent opacity-0 
                        group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center shadow-sm">
                <span className="text-3xl">💊</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">약국</h4>
                <p className="text-base text-gray-600">
                  <span className="font-medium">본관 1층</span> - 처방전이 있는 경우
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">길찾기</span>
              <svg className="w-6 h-6 text-gray-400 group-hover:text-green-600 transition-colors" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
        
        {/* 주차장 버튼 */}
        <button 
          onClick={() => navigate('/map?destination=주차장')}
          className="w-full bg-white rounded-3xl shadow-lg border border-gray-200 p-6 
                   hover:shadow-xl transition-all duration-300 text-left group
                   hover:border-purple-300 hover:scale-[1.02] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-transparent opacity-0 
                        group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center shadow-sm">
                <span className="text-3xl">🚗</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">주차장</h4>
                <p className="text-base text-gray-600">
                  <span className="font-medium">지하 1-3층</span> / 야외 주차장
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">길찾기</span>
              <svg className="w-6 h-6 text-gray-400 group-hover:text-purple-600 transition-colors" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      {/* 추가 액션 버튼들 - 더 눈에 띄게 */}
      <div className="mt-8 space-y-4">
        {/* 만족도 조사 버튼 */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl blur opacity-20 animate-pulse" />
          <button 
            onClick={() => navigate('/feedback')}
            className="relative w-full bg-gradient-to-r from-amber-50 to-orange-50 text-orange-700 rounded-2xl py-5 px-6 text-lg 
                     font-bold hover:from-amber-100 hover:to-orange-100 transition-all duration-300
                     shadow-md hover:shadow-lg border border-orange-200
                     flex items-center justify-center gap-3">
            <span className="text-2xl">⭐</span>
            <span>오늘 진료는 어떠셨나요?</span>
          </button>
        </div>
        
        {/* 처음 화면으로 버튼 */}
        <button 
          onClick={() => navigate('/')}
          className="w-full bg-gray-100 text-gray-700 rounded-2xl py-4 px-6 text-lg 
                   font-semibold hover:bg-gray-200 transition-all duration-300
                   shadow-sm hover:shadow-md">
          처음 화면으로
        </button>
      </div>
    </FormatBTemplate>
  );
}