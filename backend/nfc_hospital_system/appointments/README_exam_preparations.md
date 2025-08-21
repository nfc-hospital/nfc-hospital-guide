# 검사 준비사항 데이터 생성 가이드

## 개요
이 문서는 각 검사별 준비사항 데이터를 생성하는 방법을 설명합니다.

## 검사 준비사항 데이터 생성

### 1. Django 관리 명령어 실행
```bash
cd backend/nfc_hospital_system
python manage.py create_exam_preparations
```

### 2. 생성되는 준비사항 유형

#### 준비사항 타입 (type)
- `fasting` - 금식 관련
- `medication` - 약물 관련  
- `bladder` - 방광 관련
- `clothing` - 복장
- `documents` - 서류
- `arrival` - 도착
- `general` - 일반 준비
- `other` - 기타

### 3. 검사별 준비사항 목록

#### 혈액검사 (blood_test, blood-test, exam_001, BLOOD01)
- **금식**: 8-12시간 금식 필수
- **복장**: 팔 노출이 쉬운 옷
- **약물**: 복용 중인 약물 목록 준비

#### CT 검사 (ct_scan, CT001)
- **금식**: 4-6시간 금식 필수
- **약물**: 당뇨약(메트포르민) 48시간 전 중단
- **복장**: 금속 제거 필수
- **서류**: 이전 CT/MRI 결과지

#### MRI 검사 (mri_scan, MRI001)
- **복장**: 모든 금속 제거 필수 (액세서리, 시계, 헤어핀 등)
- **일반**: 심장박동기/인공와우 확인 필수
- **서류**: 수술 이력 확인서

#### 위내시경 (GASTRO01)
- **금식**: 전날 저녁 7시 이후 금식 필수
- **약물**: 아스피린 등 항혈전제 중단
- **일반**: 수면내시경 시 보호자 동반 필수

#### 초음파 검사 (ultrasound, USG001)
- **금식**: 6-8시간 금식 필수
- **방광**: 골반 초음파 시 방광 충만 필요

#### X-ray 검사 (xray, exam_002, XRAY001)
- **복장**: 상의 탈의 필수
- **일반**: 임신 가능성 확인

#### 심전도 검사 (exam_003, EKG001)
- **일반**: 카페인 섭취 제한 (2시간 전)
- **복장**: 상의 탈의 가능한 복장

#### 골밀도 검사 (BONEDEXA)
- **복장**: 금속 제거
- **약물**: 칼슘제 24시간 전 중단

#### 소변검사 (URINE01)
- **일반**: 중간뇨 채취, 아침 첫 소변 권장

#### 코로나 PCR (COVIDPCR)
- **일반**: 검사 30분 전 양치 금지, 마스크 착용

## 데이터 확인

### Django Admin에서 확인
1. Django Admin 접속: http://localhost:8000/admin/
2. Appointments > Exam preparations 메뉴
3. 각 검사별 준비사항 확인

### API로 확인
```bash
# 특정 예약의 준비사항 조회
GET /api/v1/appointments/{appointment_id}/preparation

# 응답 예시
{
  "preparations": [
    {
      "prep_id": 1,
      "type": "fasting",
      "title": "검사 8시간 전부터 금식",
      "description": "정확한 검사를 위해...",
      "is_required": true,
      "icon": null
    }
  ]
}
```

## 준비사항 추가/수정

### 새로운 검사 준비사항 추가
1. `create_exam_preparations.py` 파일 수정
2. `preparations_data` 딕셔너리에 새 검사 ID 추가
3. 관리 명령어 재실행

### 기존 준비사항 수정
- Django Admin에서 직접 수정 가능
- 또는 관리 명령어 수정 후 재실행 (기존 데이터 삭제됨)

## 프론트엔드 연동

### 준비사항 체크리스트 표시
- `ExamPreparationChecklist` 컴포넌트가 자동으로 API 호출
- 환자별 예약 정보에 따라 준비사항 표시
- 필수/선택 항목 구분 표시
- 금식 시간 자동 계산 및 경고

### 타입별 아이콘
- fasting: 🚫
- medication: 💊  
- documents: 📄
- bladder: 💧
- clothing: 👔
- arrival: ⏰
- general: 📋
- other: ✔️