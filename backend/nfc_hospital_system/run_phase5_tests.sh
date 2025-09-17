#!/bin/bash

# Phase 5 테스트 실행 스크립트
# V2 리팩토링 - 백엔드 테스트

echo "==================================="
echo "Phase 5: Backend Tests Execution"
echo "==================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 테스트 결과 카운터
PASSED=0
FAILED=0

# 함수: 테스트 실행 및 결과 표시
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    echo "Command: $test_command"
    echo "-----------------------------------"
    
    if eval $test_command; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}\n"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}\n"
        ((FAILED++))
    fi
}

# Python 경로 설정
cd /mnt/d/2025/nfc-hospital-guide/backend/nfc_hospital_system

echo "📋 Test Suite: PatientJourneyService"
echo "====================================="
run_test "PatientJourneyService Unit Tests" \
    "python3 manage.py test p_queue.tests.test_patient_journey_service --verbosity=2"

echo ""
echo "📋 Test Suite: State Normalization"
echo "====================================="
run_test "State Normalization Tests" \
    "python3 manage.py test p_queue.tests.test_state_normalization --verbosity=2"

echo ""
echo "📋 Test Suite: Integration Tests"
echo "====================================="
run_test "Integration Tests" \
    "python3 manage.py test p_queue.tests.test_integration --verbosity=2"

echo ""
echo "📋 Test Suite: All P_Queue Tests"
echo "====================================="
run_test "All P_Queue Tests" \
    "python3 manage.py test p_queue.tests --verbosity=1"

echo ""
echo "🔍 Health Check: State Consistency"
echo "====================================="
run_test "State Health Check" \
    "python3 manage.py check_state_health --verbose"

echo ""
echo "🔍 Health Check: JSON Output"
echo "====================================="
run_test "State Health Check (JSON)" \
    "python3 manage.py check_state_health --json"

echo ""
echo "==================================="
echo "📊 Test Results Summary"
echo "==================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✨ All tests passed successfully!${NC}"
    echo -e "${GREEN}Phase 5 implementation is complete.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️ Some tests failed. Please review the output above.${NC}"
    exit 1
fi