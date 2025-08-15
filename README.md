# NFC + AI 기반 병원 검사·진료 안내 시스템

## 프로젝트 개요

NFC 태그와 AI 챗봇을 활용하여 병원 내 검사/진료 안내를 제공하는 시스템입니다.

## 시작하기

### 필수 요구사항

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- MySQL >= 8.0

### 설치

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 적절히 수정하세요

# 개발 서버 실행
pnpm dev        # 모든 서비스 실행
pnpm dev:frontend  # 프론트엔드만 실행
pnpm dev:admin     # 관리자 대시보드만 실행
pnpm dev:backend   # 백엔드만 실행
pnpm dev:chatbot   # 챗봇 서버만 실행
```

## 프로젝트 구조

```
nfc-hospital-guide/
├── frontend-pwa/       # 환자용 PWA
├── admin-dashboard/    # 관리자 대시보드
├── backend/           # 메인 백엔드 서버
├── chatbot-server/    # AI 챗봇 서버
├── scripts/          # 유틸리티 스크립트
└── docs/            # 문서
```

## 기술 스택

### 프론트엔드
- React + Vite
- React Router
- Tailwind CSS

### 백엔드
- Node.js (Express)
- MySQL
- JWT 인증

### 챗봇
- Node.js
- NLP.js

### 인프라
- AWS (EC2, RDS, S3)
- PM2
- NGINX

## 배포

```bash
# 프로덕션 빌드
pnpm build

# 서버 배포
pnpm deploy
```

## 개발 가이드

자세한 개발 가이드는 [docs/guides/development.md](docs/guides/development.md)를 참조하세요.

## API 문서

API 문서는 [docs/api/swagger.yaml](docs/api/swagger.yaml)에서 확인할 수 있습니다.

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
# CI/CD 자동 배포 테스트
