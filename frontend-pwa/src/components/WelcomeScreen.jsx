import React, { useState } from 'react';
import Typography from './common/Typography';
import Button from './common/Button';

const LanguageCard = ({ icon, text, subtitle, onClick, selected }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center p-6 rounded-xl transition-all duration-200
      ${selected ? 'bg-primary-blue-light/20 border-2 border-primary-blue shadow-soft' : 'bg-surface border-2 border-border hover:border-primary-blue'}
      hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
      min-w-[180px] min-h-[180px]
    `}
    aria-selected={selected}
    role="option"
  >
    <span className="text-5xl mb-4" role="img" aria-label={`${text} 국기`}>
      {icon}
    </span>
    <Typography variant="h4" className="mb-2 text-text-primary font-bold">
      {text}
    </Typography>
    <Typography variant="body2" className="text-text-secondary">
      {subtitle}
    </Typography>
  </button>
);

const NFCGuideAnimation = () => (
  <div className="relative w-56 h-56 mx-auto my-8">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-40 h-40 bg-primary-blue-light/30 rounded-full animate-pulse-slow" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-20 h-28 bg-text-primary rounded-2xl flex items-center justify-center shadow-soft transform -translate-y-6 animate-bounce duration-1000">
        <span className="text-4xl">📱</span>
      </div>
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-16 h-16 bg-primary-blue rounded-xl flex items-center justify-center shadow-soft transform translate-y-10">
        <span className="text-3xl text-white">📶</span>
      </div>
    </div>
    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-10">
      <p className="text-lg font-bold text-primary-blue text-center whitespace-nowrap bg-primary-blue-light/20 px-4 py-2 rounded-lg">
        휴대폰을 태그에 대세요
      </p>
    </div>
  </div>
);

const WelcomeScreen = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('ko');
  
  const languages = [
    { icon: '🇰🇷', text: '한국어', subtitle: 'Korean', code: 'ko' },
    { icon: '🇺🇸', text: 'English', subtitle: '영어', code: 'en' },
    { icon: '🇨🇳', text: '中文', subtitle: '중국어', code: 'zh' },
    { icon: '🇯🇵', text: '日本語', subtitle: '일본어', code: 'ja' },
  ];

  return (
    <div className="mobile-container">
      <div className="text-center mb-12">
        <div className="w-24 h-24 bg-primary-blue rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-soft">
          <span className="text-4xl">🏥</span>
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-3">병원 안내 시스템</h1>
        <p className="text-lg text-text-secondary">안전하고 편리한 진료 안내를 도와드립니다</p>
      </div>

      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-center text-text-primary mb-6">
          NFC 태그에 휴대폰을 가까이 대어주세요
        </h2>
        
        <NFCGuideAnimation />
        
        <div className="bg-primary-blue-light/20 rounded-xl p-6 mt-8">
          <p className="text-center text-primary-blue font-semibold text-lg flex items-center justify-center gap-2">
            <span className="text-2xl">📢</span>
            삐 소리가 나면 성공!
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <button className="btn btn-primary w-full text-lg font-semibold">
          <span className="text-2xl mr-2">🚀</span>
          수동으로 진행하기
        </button>
        
        <button className="btn btn-secondary w-full text-lg">
          <span className="text-2xl mr-2">📷</span>
          QR 코드 스캔
        </button>
        
        <button className="btn btn-secondary w-full text-lg">
          <span className="text-2xl mr-2">👥</span>
          보호자 모드
        </button>
      </div>

      <div className="mt-12 text-center space-y-6">
        <div>
          <p className="text-text-secondary text-lg mb-3">처음 방문하시나요?</p>
          <button className="text-primary-blue font-semibold text-lg hover:underline focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 rounded-lg px-4 py-2">
            <span className="text-2xl mr-2">📞</span>
            사용 방법 보기
          </button>
        </div>
        
        <button 
          className="fixed bottom-8 right-8 w-16 h-16 bg-primary-blue rounded-full shadow-soft flex items-center justify-center text-white hover:bg-primary-blue-hover transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2" 
          aria-label="음성 안내 듣기"
        >
          <span className="text-2xl">🔊</span>
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen; 