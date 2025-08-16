export default function LoadingSpinner({ 
  fullScreen = true, 
  size = 'lg', 
  message = '잠시만 기다려 주세요...' 
}) {
  // 크기별 스타일 설정
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-16 h-16 border-4',
    xl: 'w-20 h-20 border-4'
  };

  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  const containerClasses = fullScreen 
    ? 'flex items-center justify-center min-h-screen bg-white'
    : 'flex items-center justify-center p-4';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-4">
        {/* 부드러운 스피너 */}
        <div className="relative">
          <div className={`${sizeClasses[size]} rounded-full border-gray-200 animate-spin`}>
            <div className="absolute inset-0 rounded-full border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
        </div>
        
        {/* 메시지 */}
        {message && (
          <p className={`${textSizeClasses[size]} text-gray-700 font-medium animate-pulse`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
