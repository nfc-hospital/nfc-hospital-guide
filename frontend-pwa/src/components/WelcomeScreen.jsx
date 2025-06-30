import React, { useState } from 'react';
import Typography from './common/Typography';
import Button from './common/Button';

const LanguageCard = ({ icon, text, subtitle, onClick, selected }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center p-6 rounded-xl transition-all duration-200
      ${selected ? 'bg-primary-blue-light border-2 border-primary-blue' : 'bg-white border border-gray-200'}
      hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2
      min-w-[160px] min-h-[160px]
    `}
    aria-selected={selected}
    role="option"
  >
    <span className="text-4xl mb-3" role="img" aria-label={`${text} 국기`}>
      {icon}
    </span>
    <Typography variant="h4" className="mb-1">
      {text}
    </Typography>
    <Typography variant="caption" color="secondary">
      {subtitle}
    </Typography>
  </button>
);

const NFCGuideAnimation = () => (
  <div className="relative w-48 h-48 mx-auto my-8">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-32 h-32 bg-primary-blue-light rounded-full animate-pulse" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-5xl transform -translate-y-8 animate-bounce">📱</span>
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-3xl transform translate-y-8">📶</span>
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
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Typography variant="h1" align="center" className="mb-8">
          병원 안내 시스템
        </Typography>

        <section aria-labelledby="language-selection" className="mb-12">
          <Typography variant="h2" align="center" id="language-selection" className="mb-6">
            언어를 선택해주세요
          </Typography>
          
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8" role="listbox" aria-label="언어 선택">
            {languages.map((lang) => (
              <LanguageCard
                key={lang.code}
                {...lang}
                selected={selectedLanguage === lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="nfc-guide" className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <Typography variant="h2" align="center" id="nfc-guide" className="mb-4">
            NFC 태그 인식 방법
          </Typography>

          <NFCGuideAnimation />

          <div className="space-y-4 text-center">
            <Typography variant="body2">
              휴대폰을 NFC 태그에 가까이 대어주세요
            </Typography>
            <Typography variant="caption" color="secondary">
              삐 소리가 나면 성공!
            </Typography>
          </div>
        </section>

        <section aria-labelledby="alternative-options" className="space-y-4">
          <Typography variant="h3" align="center" id="alternative-options" className="mb-6">
            다른 방법으로 시작하기
          </Typography>

          <Button
            variant="secondary"
            icon="📷"
            fullWidth
            size="large"
            onClick={() => {}}
            ariaLabel="QR 코드로 시작하기"
          >
            QR 코드로 시작하기
          </Button>

          <Button
            variant="secondary"
            icon="👥"
            fullWidth
            size="large"
            onClick={() => {}}
            ariaLabel="보호자 모드로 시작하기"
          >
            보호자 모드로 시작하기
          </Button>
        </section>

        <div className="fixed bottom-4 right-4">
          <Button
            variant="primary"
            icon="🔊"
            size="large"
            onClick={() => {}}
            ariaLabel="음성 안내 듣기"
          >
            음성 안내
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen; 