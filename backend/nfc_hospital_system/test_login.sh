#!/bin/bash

echo "==================================="
echo "로그인 API 테스트"
echo "==================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API 엔드포인트
API_URL="http://localhost:8000/api/v1/auth/simple-login"

echo "📋 테스트 1: 간편 로그인 (김환자)"
echo "-----------------------------------"
echo "전화번호: 010-1234-5678"
echo "생년월일: 900101"
echo ""

# curl 요청
response=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "010-1234-5678",
    "birthDate": "900101"
  }')

echo "응답:"
echo "$response" | python3 -m json.tool

# 토큰 추출
if echo "$response" | grep -q "access"; then
    echo -e "\n${GREEN}✅ 로그인 성공!${NC}"
    
    # 토큰 추출
    access_token=$(echo "$response" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('tokens', {}).get('access', 'N/A'))")
    
    if [ "$access_token" != "N/A" ]; then
        echo -e "${GREEN}Access Token (첫 50자): ${access_token:0:50}...${NC}"
    fi
else
    echo -e "\n${RED}❌ 로그인 실패${NC}"
fi

echo ""
echo "==================================="
echo "📋 테스트 2: 잘못된 정보로 로그인"
echo "-----------------------------------"
echo "전화번호: 010-0000-1111"
echo "생년월일: 111111"
echo ""

response=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "010-0000-1111",
    "birthDate": "111111"
  }')

echo "응답:"
echo "$response" | python3 -m json.tool

if echo "$response" | grep -q "error"; then
    echo -e "\n${GREEN}✅ 예상대로 에러 발생${NC}"
else
    echo -e "\n${RED}❌ 예상치 못한 결과${NC}"
fi

echo ""
echo "==================================="
echo "📋 테스트 3: 형식 오류 테스트"
echo "-----------------------------------"
echo "전화번호: 01012345678 (하이픈 없음)"
echo "생년월일: 900101"
echo ""

response=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "01012345678",
    "birthDate": "900101"
  }')

echo "응답:"
echo "$response" | python3 -m json.tool

if echo "$response" | grep -q "형식"; then
    echo -e "\n${GREEN}✅ 형식 검증 정상 작동${NC}"
else
    echo -e "\n${YELLOW}⚠️ 형식 검증 확인 필요${NC}"
fi

echo ""
echo "==================================="
echo "테스트 완료"
echo "===================================