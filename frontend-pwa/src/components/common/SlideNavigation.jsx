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
    <div className="relative h-full">
      {/* 슬라이드 도트 인디케이터 */}
      {showDots && totalSlides > 1 && (
        <div className="absolute top-4 left-0 right-0 z-10">
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
        </div>
      )}

      {/* 슬라이드 콘텐츠 - 좌우 버튼을 위한 여백 확보 */}
      <div className="h-full overflow-hidden">
        <div className="h-full flex transition-transform duration-500 ease-in-out"
             style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {React.Children.map(children, (child, index) => (
            <div key={index} className="w-full h-full flex-shrink-0 px-12">
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* 좌우 네비게이션 버튼 - 화면 중간에 배치, 컨텐츠 가리지 않게 여백 확보 */}
      {totalSlides > 1 && (
        <>
          <button 
            onClick={goToPrevSlide}
            disabled={!canGoPrev}
            className={`absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full shadow-lg 
                     transition-all duration-300 z-20
                     ${canGoPrev 
                       ? 'bg-white/90 backdrop-blur-sm hover:bg-white hover:shadow-xl transform hover:scale-110' 
                       : 'bg-gray-200/70 opacity-50 cursor-not-allowed'}`}
            style={{ marginLeft: '8px' }}
            aria-label="이전 슬라이드">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                    d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={goToNextSlide}
            disabled={!canGoNext}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full shadow-lg 
                     transition-all duration-300 z-20
                     ${canGoNext 
                       ? 'bg-blue-600/90 backdrop-blur-sm hover:bg-blue-700 hover:shadow-xl transform hover:scale-110' 
                       : 'bg-gray-200/70 opacity-50 cursor-not-allowed'}`}
            style={{ marginRight: '8px' }}
            aria-label="다음 슬라이드">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                    d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* 하단 페이지 표시 */}
      {totalSlides > 1 && (
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="text-lg font-medium text-gray-600">
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>
      )}
    </div>
  );
}