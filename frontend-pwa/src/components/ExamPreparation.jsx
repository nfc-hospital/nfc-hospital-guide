import { useState, useEffect } from 'react';

export default function ExamPreparation({ preparations }) {
  if (!preparations?.length) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        검사 전 준비사항
      </h2>
      
      <ul className="space-y-3">
        {preparations.map((prep, index) => (
          <li key={index} className="flex items-start">
            <svg
              className="h-5 w-5 text-primary-600 mt-0.5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-gray-700">{prep}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}