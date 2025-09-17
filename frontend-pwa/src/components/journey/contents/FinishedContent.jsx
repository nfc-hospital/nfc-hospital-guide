import React from 'react';
import { CheckBadgeIcon, HomeIcon, CalendarIcon } from '@heroicons/react/24/outline';

/**
 * FinishedContent - 완료 상태의 순수 컨텐츠 컴포넌트
 * 템플릿 래핑 없이 순수 컨텐츠만 제공
 */
export default function FinishedContent({ 
  // 필요한 데이터만 props로 받음
  user,
  patientState,
  completionStats,
  todaySchedule
}) {
  return (
    <div className="space-y-6">
      {/* 완료 축하 메시지 */}
      <div className="bg-green-50 rounded-2xl p-6 text-center">
        <div className="flex justify-center mb-3">
          <CheckBadgeIcon className="w-16 h-16 text-green-600" />
        </div>
        <p className="text-lg text-green-800 font-medium">
          {user?.name}님, 모든 검사가 완료되었습니다!
        </p>
        <p className="text-sm text-green-600 mt-2">
          오늘 하루 수고 많으셨습니다. 안전하게 귀가하세요.
        </p>
      </div>

      {/* 완료 통계 */}
      {completionStats && (
        <div className="bg-blue-50 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-blue-800 mb-3">
            오늘의 검사 현황
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {completionStats.completedCount || 0}
              </p>
              <p className="text-sm text-blue-500">완료된 검사</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {completionStats.totalCount || 0}
              </p>
              <p className="text-sm text-blue-500">총 검사</p>
            </div>
          </div>
        </div>
      )}

      {/* 완료된 검사 목록 */}
      {todaySchedule && todaySchedule.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            완료된 검사 목록
          </h3>
          <div className="space-y-3">
            {todaySchedule.map((exam, index) => (
              <div 
                key={exam.id || index}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl"
              >
                <CheckBadgeIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {exam.examName || exam.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {exam.location}
                  </p>
                </div>
                <span className="text-xs text-green-600 font-medium">
                  완료
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 다음 단계 안내 */}
      <div className="bg-amber-50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-amber-800 mb-3">
          📋 다음 단계 안내
        </h3>
        <ul className="space-y-2 text-sm text-amber-700">
          <li className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
            <span>검사 결과는 담당 의료진이 검토 후 안내드립니다</span>
          </li>
          <li className="flex items-center space-x-2">
            <HomeIcon className="w-4 h-4 flex-shrink-0" />
            <span>귀가 전 수납이 완료되었는지 확인해주세요</span>
          </li>
          <li>• 추가 검사나 진료가 필요한 경우 별도 연락드립니다</li>
        </ul>
      </div>

      {/* 감사 인사 */}
      <div className="bg-gray-50 rounded-2xl p-6 text-center">
        <p className="text-gray-700 font-medium">
          저희 병원을 이용해 주셔서 감사합니다
        </p>
        <p className="text-sm text-gray-500 mt-2">
          더 나은 서비스로 보답하겠습니다
        </p>
      </div>
    </div>
  );
}