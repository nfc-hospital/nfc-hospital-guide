#!/bin/bash

# 개발 환경 초기 설정 스크립트

echo "🚀 NFC Hospital Guide 개발 환경 설정 시작..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Python 가상환경 확인 및 생성
echo -e "${YELLOW}1. Python 가상환경 설정...${NC}"
if [ ! -d "backend/venv" ]; then
    cd backend
    python -m venv venv
    cd ..
    echo -e "${GREEN}✅ Python 가상환경 생성 완료${NC}"
else
    echo -e "${GREEN}✅ Python 가상환경이 이미 존재합니다${NC}"
fi

# 2. Python 패키지 설치
echo -e "${YELLOW}2. Python 패키지 설치...${NC}"
cd backend
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || . venv/bin/activate
pip install -r requirements.txt
cd ..
echo -e "${GREEN}✅ Python 패키지 설치 완료${NC}"

# 3. Node.js 패키지 설치
echo -e "${YELLOW}3. Node.js 패키지 설치...${NC}"
pnpm install
echo -e "${GREEN}✅ Node.js 패키지 설치 완료${NC}"

# 4. 환경 변수 파일 생성
echo -e "${YELLOW}4. 환경 변수 파일 설정...${NC}"
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✅ .env 파일 생성 완료 (backend/.env를 확인하여 설정하세요)${NC}"
else
    echo -e "${GREEN}✅ .env 파일이 이미 존재합니다${NC}"
fi

# 5. Django 디렉토리 생성
echo -e "${YELLOW}5. Django 필수 디렉토리 생성...${NC}"
cd backend/nfc_hospital_system
python create_dirs.py
cd ../..
echo -e "${GREEN}✅ 디렉토리 생성 완료${NC}"

# 6. 데이터베이스 마이그레이션
echo -e "${YELLOW}6. 데이터베이스 마이그레이션...${NC}"
cd backend/nfc_hospital_system
python manage.py makemigrations
python manage.py migrate
cd ../..
echo -e "${GREEN}✅ 데이터베이스 마이그레이션 완료${NC}"

# 7. Django 슈퍼유저 생성 안내
echo -e "${YELLOW}7. Django 관리자 계정${NC}"
echo "Django 관리자 계정을 생성하려면 다음 명령어를 실행하세요:"
echo "cd backend/nfc_hospital_system && python manage.py createsuperuser"

echo -e "\n${GREEN}✨ 개발 환경 설정 완료!${NC}"
echo -e "\n${YELLOW}개발 서버 실행:${NC}"
echo "npm run dev          # Django + React + Admin 실행"
echo "npm run dev:all      # 모든 서버 실행 (챗봇 포함)"
echo "npm run dev:frontend # React만 실행"
echo "npm run dev:backend  # Django만 실행"

echo -e "\n${YELLOW}접속 URL:${NC}"
echo "React PWA:    http://localhost:3000"
echo "Django API:   http://localhost:8000/api/"
echo "Django Admin: http://localhost:8000/admin/"