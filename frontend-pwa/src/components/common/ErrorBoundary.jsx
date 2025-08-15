import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트 합니다.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅 서비스에 에러를 기록할 수 있습니다
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // 개발 환경에서만 상세 에러 표시
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', {
        message: error.toString(),
        stack: errorInfo.componentStack
      });
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    // 페이지 새로고침 대신 상태만 리셋
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // 에러가 3번 이상 발생하면 더 강력한 복구 메시지 표시
      const isCritical = this.state.errorCount >= 3;

      return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              {/* 에러 아이콘 */}
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg 
                  className="w-10 h-10 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>

              {/* 에러 메시지 */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                앗! 문제가 발생했습니다
              </h1>
              
              <p className="text-lg text-gray-600 mb-6">
                {isCritical 
                  ? "계속해서 문제가 발생하고 있습니다. 페이지를 새로고침해 주세요."
                  : "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
                }
              </p>

              {/* 개발 환경에서만 에러 상세 정보 표시 */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    개발자용 에러 정보
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* 액션 버튼들 */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200 min-h-[48px]"
                >
                  다시 시도
                </button>
                
                {isCritical && (
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors duration-200 min-h-[48px]"
                  >
                    페이지 새로고침
                  </button>
                )}
              </div>

              {/* 도움말 링크 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  계속 문제가 발생하면{' '}
                  <a href="/help" className="text-blue-600 hover:text-blue-700 font-medium">
                    도움말 센터
                  </a>
                  를 방문하거나{' '}
                  <a href="tel:1234-5678" className="text-blue-600 hover:text-blue-700 font-medium">
                    고객센터(1234-5678)
                  </a>
                  로 연락주세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;