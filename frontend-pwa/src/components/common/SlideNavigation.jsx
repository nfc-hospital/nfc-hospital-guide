import React, { useState, useEffect } from 'react';

export default function SlideNavigation({ 
  children, 
  defaultSlide = 0,
  onSlideChange = () => {},
  showDots = true,
  autoSlide = false,
  autoSlideInterval = 5000
}) {
  const [currentSlide, setCurrentSlide] = useState(defaultSlide);
  const totalSlides = React.Children.count(children);
  
  const canGoPrev = currentSlide > 0;
  const canGoNext = currentSlide < totalSlides - 1;

  useEffect(() => {
    if (autoSlide && canGoNext) {
      const timer = setTimeout(() => {
        goToNextSlide();
      }, autoSlideInterval);
      return () => clearTimeout(timer);
    }
  }, [currentSlide, autoSlide, autoSlideInterval, canGoNext]);

  const goToPrevSlide = () => {
    if (canGoPrev) {
      const newSlide = currentSlide - 1;
      setCurrentSlide(newSlide);
      onSlideChange(newSlide);
    }
  };

  const goToNextSlide = () => {
    if (canGoNext) {
      const newSlide = currentSlide + 1;
      setCurrentSlide(newSlide);
      onSlideChange(newSlide);
    }
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
    onSlideChange(index);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 상단 네비게이션 - 좌우 버튼과 도트 인디케이터 */}
      {totalSlides > 1 && (
        <div className="py-4 px-4">
          <div className="flex justify-between items-center">
            {/* 왼쪽 버튼 */}
            <button 
              onClick={goToPrevSlide}
              disabled={!canGoPrev}
              className={`p-3 rounded-full shadow-lg 
                       transition-all duration-300
                       ${canGoPrev 
                         ? 'bg-white hover:bg-gray-50 hover:shadow-xl transform hover:scale-110' 
                         : 'bg-gray-200/70 opacity-50 cursor-not-allowed'}`}
              aria-label="이전 슬라이드">
              <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                      d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* 중앙 도트 인디케이터 */}
            {showDots && (
              <div className="flex justify-center items-center gap-3">
                {React.Children.map(children, (_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`h-3 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'w-12 bg-blue-600' 
                        : 'w-3 bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`슬라이드 ${index + 1}로 이동`}
                  />
                ))}
              </div>
            )}

            {/* 오른쪽 버튼 */}
            <button 
              onClick={goToNextSlide}
              disabled={!canGoNext}
              className={`p-3 rounded-full shadow-lg 
                       transition-all duration-300
                       ${canGoNext 
                         ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl transform hover:scale-110' 
                         : 'bg-gray-200/70 opacity-50 cursor-not-allowed'}`}
              aria-label="다음 슬라이드">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                      d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 슬라이드 콘텐츠 영역 */}
      <div className="flex-1 relative overflow-hidden">
        <div className="h-full flex transition-transform duration-500 ease-in-out"
             style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {React.Children.map(children, (child, index) => (
            <div key={index} className="w-full h-full flex-shrink-0 px-8">
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* 하단 페이지 표시 - 고정된 공간 차지 */}
      {totalSlides > 1 && (
        <div className="py-4 text-center">
          <span className="text-lg font-medium text-gray-600">
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>
      )}
    </div>
  );
}