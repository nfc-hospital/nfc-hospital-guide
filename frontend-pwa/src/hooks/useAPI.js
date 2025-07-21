import { useState, useEffect, useCallback } from 'react';

/**
 * 범용 API Hook
 * @param {Function} apiFunction - API 호출 함수
 * @param {Object} options - 옵션
 * @param {boolean} options.immediate - 컴포넌트 마운트 시 즉시 실행 여부
 * @param {Array} options.dependencies - useEffect 의존성 배열
 * @param {Function} options.onSuccess - 성공 시 콜백
 * @param {Function} options.onError - 에러 시 콜백
 */
export function useAPI(apiFunction, options = {}) {
  const { immediate = true, dependencies = [], onSuccess, onError } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(...args);
        setData(result);
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (err) {
        setError(err);
        if (onError) {
          onError(err);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, onSuccess, onError]
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
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    },
  };
}

/**
 * Mutation Hook (POST, PUT, DELETE 요청용)
 * @param {Function} apiFunction - API 호출 함수
 * @param {Object} options - 옵션
 */
export function useMutation(apiFunction, options = {}) {
  const { onSuccess, onError } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(...args);
        setData(result);
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (err) {
        setError(err);
        if (onError) {
          onError(err);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, onSuccess, onError]
  );

  return {
    mutate,
    data,
    loading,
    error,
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    },
  };
}

// 특화된 Hooks

/**
 * 인증 상태 관리 Hook
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        // TODO: 토큰 유효성 검증 API 호출
        setIsAuthenticated(true);
        // TODO: 사용자 정보 가져오기
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback((tokens, userData) => {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    setIsAuthenticated(true);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
  };
}

/**
 * 페이지네이션 Hook
 */
export function usePagination(apiFunction, pageSize = 10) {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const { data, loading, error, execute } = useAPI(
    () => apiFunction({ page, page_size: pageSize }),
    {
      immediate: true,
      dependencies: [page, pageSize],
    }
  );

  useEffect(() => {
    if (data) {
      setTotalCount(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / pageSize));
    }
  }, [data, pageSize]);

  return {
    data: data?.results || [],
    page,
    totalPages,
    totalCount,
    loading,
    error,
    setPage,
    refresh: execute,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    previousPage: () => setPage((p) => Math.max(p - 1, 1)),
  };
}

/**
 * 실시간 데이터 Hook (WebSocket 연동용)
 */
export function useRealtime(url, options = {}) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000${url}`);

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setData(message);
        if (options.onMessage) {
          options.onMessage(message);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      setError(err);
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { data, connected, error };
}

export default useAPI;