// CSRF 토큰 관련 유틸리티 함수들
import Cookies from 'js-cookie';

/**
 * CSRF 토큰을 쿠키에서 가져오는 함수
 * @returns {string|undefined} CSRF 토큰 값
 */
export const getCSRFToken = () => {
  return Cookies.get('csrftoken');
};

/**
 * CSRF 토큰이 유효한지 확인하는 함수
 * @returns {boolean} 토큰 유효성 여부
 */
export const isCSRFTokenValid = () => {
  const token = getCSRFToken();
  return token && token.length > 0;
};

/**
 * CSRF 토큰을 헤더 객체로 반환하는 함수
 * @returns {object} CSRF 헤더 객체
 */
export const getCSRFHeaders = () => {
  const token = getCSRFToken();
  return token ? { 'X-CSRFToken': token } : {};
};

/**
 * CSRF 토큰 상태를 로그로 출력하는 디버깅 함수
 */
export const debugCSRFToken = () => {
  const token = getCSRFToken();
  if (token) {
    console.log('✅ CSRF Token found:', token.substring(0, 10) + '...');
  } else {
    console.warn('❌ CSRF Token not found');
  }
};

/**
 * 폼 데이터에 CSRF 토큰을 추가하는 함수
 * @param {FormData} formData - 폼 데이터 객체
 * @returns {FormData} CSRF 토큰이 추가된 폼 데이터
 */
export const addCSRFToFormData = (formData) => {
  const token = getCSRFToken();
  if (token) {
    formData.append('csrfmiddlewaretoken', token);
  }
  return formData;
};

/**
 * 일반 객체에 CSRF 토큰을 추가하는 함수
 * @param {object} data - 데이터 객체
 * @returns {object} CSRF 토큰이 추가된 데이터 객체
 */
export const addCSRFToData = (data) => {
  const token = getCSRFToken();
  if (token) {
    return {
      ...data,
      csrfmiddlewaretoken: token
    };
  }
  return data;
};