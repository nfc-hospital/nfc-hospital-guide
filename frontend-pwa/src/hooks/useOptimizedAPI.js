import { useState, useEffect, useCallback, useRef } from 'react';

// 글로벌 캐시 스토리지
const apiCache = new Map();
const pendingRequests = new Map();

// 캐시 키 생성 헬퍼
const createCacheKey = (url, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});
  
  return `${url}:${JSON.stringify(sortedParams)}`;
};

// 캐시 항목 생성
const createCacheItem = (data, ttl = 300000) => ({ // 기본 5분
  data,
  timestamp: Date.now(),
  ttl,
  expired: function() {
    return Date.now() - this.timestamp > this.ttl;
  }
});

/**
 * 최적화된 API Hook - 캐싱, 중복 방지, 배치 처리 지원
 * @param {string} key - 캐시 키 (고유 식별자)
 * @param {Function} apiFunction - API 호출 함수
 * @param {Object} options - 옵션
 */
export function useOptimizedAPI(key, apiFunction, options = {}) {
  const {
    immediate = true,
    dependencies = [],
    cache = true,
    ttl = 300000, // 5분
    onSuccess,
    onError,
    dedupe = true, // 중복 요청 방지
    retries = 2
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const retryCountRef = useRef(0);

  const execute = useCallback(
    async (...args) => {
      const cacheKey = typeof key === 'function' ? key(...args) : key;
      
      // 캐시 확인
      if (cache && apiCache.has(cacheKey)) {
        const cachedItem = apiCache.get(cacheKey);
        if (!cachedItem.expired()) {
          setData(cachedItem.data);
          setLoading(false);
          return cachedItem.data;
        } else {
          apiCache.delete(cacheKey);
        }
      }

      // 중복 요청 방지
      if (dedupe && pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
      }

      setLoading(true);
      setError(null);

      const requestPromise = (async () => {
        try {
          const result = await apiFunction(...args);
          
          // 캐시 저장
          if (cache) {
            apiCache.set(cacheKey, createCacheItem(result, ttl));
          }
          
          setData(result);
          retryCountRef.current = 0;
          
          if (onSuccess) {
            onSuccess(result);
          }
          
          return result;
        } catch (err) {
          // 재시도 로직
          if (retryCountRef.current < retries) {
            retryCountRef.current += 1;
            console.warn(`API 재시도 ${retryCountRef.current}/${retries}:`, err.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCountRef.current));
            return execute(...args);
          }
          
          setError(err);
          if (onError) {
            onError(err);
          }
          throw err;
        } finally {
          setLoading(false);
          pendingRequests.delete(cacheKey);
        }
      })();

      if (dedupe) {
        pendingRequests.set(cacheKey, requestPromise);
      }

      return requestPromise;
    },
    [key, apiFunction, cache, ttl, onSuccess, onError, dedupe, retries]
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies);

  return {
    data,
    loading,
    error,
    execute,
    invalidate: () => {
      const cacheKey = typeof key === 'function' ? key() : key;
      apiCache.delete(cacheKey);
    },
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    },
  };
}

/**
 * 배치 API Hook - 여러 API를 한번에 호출
 * @param {Array} requests - [{ key, apiFunction, options }] 형태의 요청 배열
 * @param {Object} options - 배치 옵션
 */
export function useBatchAPI(requests, options = {}) {
  const { immediate = true, parallel = true } = options;
  
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(immediate);
  const [errors, setErrors] = useState({});

  const execute = useCallback(async () => {
    setLoading(true);
    setErrors({});

    try {
      const results = {};
      const errorMap = {};

      if (parallel) {
        // 병렬 실행
        const promises = requests.map(async ({ key, apiFunction, options = {} }) => {
          try {
            const result = await apiFunction();
            return { key, result, success: true };
          } catch (error) {
            return { key, error, success: false };
          }
        });

        const responses = await Promise.allSettled(promises);
        
        responses.forEach((response) => {
          if (response.status === 'fulfilled') {
            const { key, result, error, success } = response.value;
            if (success) {
              results[key] = result;
            } else {
              errorMap[key] = error;
            }
          }
        });
      } else {
        // 순차 실행
        for (const { key, apiFunction, options = {} } of requests) {
          try {
            const result = await apiFunction();
            results[key] = result;
          } catch (error) {
            errorMap[key] = error;
          }
        }
      }

      setData(results);
      setErrors(errorMap);
      
      return results;
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 실행만 하고 의존성에서 execute 제거
  useEffect(() => {
    if (immediate && requests.length > 0) {
      execute();
    }
  }, [immediate]);

  return {
    data,
    loading,
    errors,
    execute,
    hasErrors: Object.keys(errors).length > 0,
  };
}

/**
 * 통합 환자 데이터 Hook - 환자 관련 모든 데이터를 한번에 관리
 */
export function usePatientData(options = {}) {
  const { immediate = true, includeQueues = true, includeSchedule = true } = options;

  return useBatchAPI([
    {
      key: 'profile',
      apiFunction: async () => {
        const { default: apiService } = await import('../api/apiService');
        return apiService.auth.getProfile();
      }
    },
    ...(includeSchedule ? [{
      key: 'schedule',
      apiFunction: async () => {
        const { default: apiService } = await import('../api/apiService');
        return apiService.getTodaySchedule();
      }
    }] : []),
    ...(includeQueues ? [{
      key: 'queues',
      apiFunction: async () => {
        const { queueAPI } = await import('../api/client');
        return queueAPI.getMyQueue();
      }
    }] : [])
  ], { immediate });
}

/**
 * 스마트 폴링 Hook - 조건부/적응형 폴링
 * @param {string} key - 캐시 키
 * @param {Function} apiFunction - API 함수
 * @param {Object} options - 폴링 옵션
 */
export function useSmartPolling(key, apiFunction, options = {}) {
  const {
    interval = 30000, // 기본 30초
    immediate = true,
    enabled = true,
    adaptive = true, // 적응형 폴링 (오류시 간격 증가)
    maxInterval = 300000, // 최대 5분
    backoffFactor = 1.5
  } = options;

  const [currentInterval, setCurrentInterval] = useState(interval);
  const intervalRef = useRef(null);
  const errorCountRef = useRef(0);

  const { data, loading, error, execute } = useOptimizedAPI(key, apiFunction, {
    immediate,
    cache: true,
    ttl: interval * 0.8, // 폴링 간격의 80% 캐시
    onSuccess: () => {
      errorCountRef.current = 0;
      if (adaptive && currentInterval !== interval) {
        setCurrentInterval(interval);
      }
    },
    onError: () => {
      if (adaptive) {
        errorCountRef.current += 1;
        const newInterval = Math.min(
          interval * Math.pow(backoffFactor, errorCountRef.current),
          maxInterval
        );
        setCurrentInterval(newInterval);
      }
    }
  });

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (enabled) {
      intervalRef.current = setInterval(() => {
        execute();
      }, currentInterval);
    }
  }, [execute, currentInterval, enabled]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startPolling();
    }
    return stopPolling;
  }, [enabled, currentInterval]);

  useEffect(() => {
    // 탭이 비활성화되면 폴링 중지, 활성화되면 재시작
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        execute(); // 즉시 한번 실행
        startPolling();
      }
    };

    if (enabled) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [enabled]);

  return {
    data,
    loading,
    error,
    execute,
    startPolling,
    stopPolling,
    currentInterval,
    isPolling: intervalRef.current !== null,
  };
}

// 캐시 관리 유틸리티
export const cacheUtils = {
  clear: () => {
    apiCache.clear();
  },
  
  clearExpired: () => {
    for (const [key, item] of apiCache.entries()) {
      if (item.expired()) {
        apiCache.delete(key);
      }
    }
  },
  
  invalidate: (pattern) => {
    const regex = new RegExp(pattern);
    for (const key of apiCache.keys()) {
      if (regex.test(key)) {
        apiCache.delete(key);
      }
    }
  },
  
  size: () => apiCache.size,
  
  keys: () => Array.from(apiCache.keys()),
};

// 자동 캐시 정리 (10분마다)
if (typeof window !== 'undefined') {
  setInterval(cacheUtils.clearExpired, 600000);
}

export default useOptimizedAPI;