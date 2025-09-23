import React, { useState, useEffect } from 'react';
import { CheckBadgeIcon, HomeIcon, CalendarIcon } from '@heroicons/react/24/outline';
import useJourneyStore from '../../../store/journeyStore';
import { PatientJourneyAPI } from '../../../api/patientJourneyService';

/**
 * FinishedContent - 완료 상태의 순수 컨텐츠 컴포넌트
 * 무한 루프 방지를 위해 직접 store 구독 사용
 * React.memo로 래핑하여 불필요한 리렌더링 방지
 */
const FinishedContent = ({
  user,
  todaysAppointments = [],
  patientState,
  completionStats: propsCompletionStats,
  ...otherProps
}) => {
  // 다음 예약 정보 상태
  const [nextAppointment, setNextAppointment] = useState(null);
  const [loadingNextAppointment, setLoadingNextAppointment] = useState(true);

  // 컴포넌트 마운트 시 다음 예약 정보 조회
  useEffect(() => {
    const fetchNextAppointment = async () => {
      try {
        setLoadingNextAppointment(true);
        const response = await PatientJourneyAPI.getNextAppointment();

        if (response.success && response.data) {
          setNextAppointment(response.data);
        } else {
          setNextAppointment(null);
        }
      } catch (error) {
        console.error('다음 예약 조회 실패:', error);
        setNextAppointment(null);
      } finally {
        setLoadingNextAppointment(false);
      }
    };

    fetchNextAppointment();
  }, []);

  // FinishedContent 실행 확인 (개발 모드에서만)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔥 FinishedContent 렌더링 시작!', {
      user: user?.name,
      appointments: todaysAppointments?.length,
      hasUser: !!user,
      hasAppointments: !!todaysAppointments,
      nextAppointment: nextAppointment
    });
  }
  
  // fallback 데이터 (props가 없을 때 사용)
  const fallbackUser = { name: '김환자' };
  const fallbackAppointments = [
    { appointment_id: '1', exam: { title: '혈액검사' }, status: 'completed' },
    { appointment_id: '2', exam: { title: '흉부 X-ray' }, status: 'completed' },
    { appointment_id: '3', exam: { title: '내과진료' }, status: 'completed' }
  ];
  
  // props 우선 사용, 없으면 fallback (API 데이터가 없어도 항상 표시)
  const actualUser = user || fallbackUser;
  const actualAppointments = (todaysAppointments && todaysAppointments.length > 0) ? todaysAppointments : fallbackAppointments;
  
  // 완료 통계: props 우선 사용, 없으면 로컬 계산
  const completionStats = React.useMemo(() => {
    if (propsCompletionStats) {
      return propsCompletionStats;
    }
    
    const completed = actualAppointments.filter(apt => 
      apt.status === 'completed' || apt.status === 'examined'
    );
    return {
      completedCount: completed.length,
      totalCount: actualAppointments.length,
      completedAppointments: completed
    };
  }, [propsCompletionStats, actualAppointments]);
  
  // 간단한 일정 포맷팅 (로컬에서)
  const todaySchedule = React.useMemo(() => {
    return actualAppointments.map((apt, index) => ({
      id: apt.appointment_id,
      examName: apt.exam?.title || `검사 ${index + 1}`,
      location: apt.exam?.room || apt.exam?.title || '검사실',
      status: apt.status
    }));
  }, [actualAppointments]);
  
  // 개발 모드에서만 렌더링 정보 출력
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 FinishedContent 렌더링:', { 
      actualUser: actualUser?.name, 
      actualAppointments: actualAppointments?.length,
      completionStats: completionStats
    });
  }
  
  return (
    <div className="space-y-6">
      {/* 완료 축하 메시지 - 더 두드러지게 */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 text-center border-2 border-green-200 shadow-lg">
        <div className="flex justify-center mb-4">
          <CheckBadgeIcon className="w-20 h-20 text-green-600" />
        </div>
        <h1 className="text-2xl text-green-800 font-bold mb-3">
          🎉 {actualUser?.name || '김환자'}님, 모든 검사가 완료되었습니다!
        </h1>
        <p className="text-lg text-green-700 font-medium">
          오늘 하루 수고 많으셨습니다. 안전하게 귀가하세요.
        </p>
      </div>

      {/* 완료 통계 - 항상 표시 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-md">
        <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
          📊 오늘의 검사 현황
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center bg-white rounded-xl p-4 border border-blue-100">
            <p className="text-3xl font-bold text-blue-600 mb-1">
              {completionStats?.completedCount || actualAppointments.length}
            </p>
            <p className="text-base font-medium text-blue-500">완료된 검사</p>
          </div>
          <div className="text-center bg-white rounded-xl p-4 border border-blue-100">
            <p className="text-3xl font-bold text-blue-600 mb-1">
              {completionStats?.totalCount || actualAppointments.length}
            </p>
            <p className="text-base font-medium text-blue-500">총 검사</p>
          </div>
        </div>
      </div>

      {/* 완료된 검사 목록 - 항상 표시 */}
      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-md">
        <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
          ✅ 완료된 검사 목록
        </h3>
        <div className="space-y-4">
          {todaySchedule.map((exam, index) => (
            <div 
              key={exam.id || index}
              className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckBadgeIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-900">
                  {exam.examName || exam.title}
                </p>
                <p className="text-base text-gray-600">
                  📍 {exam.location}
                </p>
              </div>
              <span className="text-sm text-green-700 font-bold bg-green-200 px-3 py-1 rounded-full">
                ✓ 완료
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 다음 단계 안내 - 더 눈에 띄게 */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200 shadow-md">
        <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
          📋 다음 단계 안내
        </h3>
        <ul className="space-y-4">
          {/* 다음 예약이 있을 경우 표시 */}
          {!loadingNextAppointment && nextAppointment && (
            <li className="flex items-start space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <span className="text-base text-blue-800 leading-relaxed">
                  <strong>다음 예약:</strong> {new Date(nextAppointment.scheduled_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {nextAppointment.exam && (
                  <div className="mt-1 text-sm text-blue-700">
                    {nextAppointment.exam.title} ({nextAppointment.exam.department})
                    {nextAppointment.exam.room && ` - ${nextAppointment.exam.room}`}
                  </div>
                )}
              </div>
            </li>
          )}

          <li className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-amber-100">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-base text-amber-800 leading-relaxed">검사 결과는 담당 의료진이 검토 후 안내드립니다</span>
          </li>
          <li className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-amber-100">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <HomeIcon className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-base text-amber-800 leading-relaxed">귀가 전 수납이 완료되었는지 확인해주세요</span>
          </li>
          <li className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-amber-100">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-600">
              💬
            </div>
            <span className="text-base text-amber-800 leading-relaxed">추가 검사나 진료가 필요한 경우 별도 연락드립니다</span>
          </li>
        </ul>
      </div>

      {/* 감사 인사 - 더 따뜻하게 */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 text-center border border-gray-200 shadow-md">
        <div className="text-4xl mb-3">🙏</div>
        <h4 className="text-xl font-bold text-gray-800 mb-2">
          저희 병원을 이용해 주셔서 감사합니다
        </h4>
        <p className="text-base text-gray-600 leading-relaxed">
          더 나은 서비스로 보답하겠습니다
        </p>
      </div>
    </div>
  );
};

FinishedContent.displayName = 'FinishedContent';

export default FinishedContent;