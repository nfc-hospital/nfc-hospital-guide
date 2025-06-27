import React from 'react';
import { useEffect } from 'react';

/**
 * @typedef {Object} PageTitleProps
 * @property {string} title - 페이지의 제목
 */

/**
 * 페이지 제목을 표시하는 컴포넌트
 * @param {PageTitleProps} props
 * @returns {JSX.Element}
 */
export default function PageTitle({ title }) {
  useEffect(() => {
    // 페이지 제목 업데이트
    document.title = `${title} - 서울 대학 병원`;
  }, [title]);

  return (
    <h1 className="text-2xl font-bold text-gray-900 mb-6">
      {title}
    </h1>
  );
}