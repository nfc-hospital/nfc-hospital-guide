// frontend-pwa/src/components/ExamInfo.jsx
import React from 'react';

const ExamInfo = ({ examInfo }) => {
  if (!examInfo) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">검사 정보</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {examInfo.name || examInfo.exam_name || '검사명'}
          </h3>
          <p className="text-gray-600 mb-4">
            {examInfo.description || examInfo.exam_description || '검사에 대한 설명입니다.'}
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">검사 코드:</span>
            <span className="font-medium">{examInfo.code || examInfo.exam_code || 'N/A'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">예상 소요시간:</span>
            <span className="font-medium">
              {examInfo.duration || examInfo.estimated_duration || '30'}분
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">검사실:</span>
            <span className="font-medium">
              {examInfo.room || examInfo.exam_room || '1번 검사실'}
            </span>
          </div>
        </div>
      </div>

      {/* 준비사항이 있다면 표시 */}
      {(examInfo.preparation || examInfo.preparations) && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">검사 전 준비사항</h4>
          <p className="text-blue-700 text-sm">
            {examInfo.preparation || examInfo.preparations}
          </p>
        </div>
      )}
    </div>
  );
};

export default ExamInfo;