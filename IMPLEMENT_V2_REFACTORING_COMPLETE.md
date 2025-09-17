# 🔴 긴급: STATE_REFACTORING_PLAN_V2 완전 구현 지침

## 📌 현재 상황 (2025-01-09)

### 문제의 핵심
백엔드는 `'ongoing'`을 반환하는데 프론트엔드는 `'in_progress'`를 찾아서 **진행 중 상태를 전혀 인식하지 못하는 치명적 버그**가 있습니다.

### V2 계획서 구현 현황
- 📁 `STATE_REFACTORING_PLAN_V2.txt` (1197줄)
- 📁 `STATE_REFACTORING_PLAN_V2_COMPLETE.txt` (443줄)

**구현 상태:**
- ✅ Phase 1의 10%만 완료 (파일 생성만 됨)
- ❌ Phase 2-6 전혀 시작 안됨
- ❌ 실제 코드에 전혀 적용 안됨

## 🎯 구현 지침: V2 계획서 완전 실행

### 📋 필수 전제 조건
```bash
# 1. 현재 브랜치 확인 및 백업
git status
git checkout -b feature/complete-state-refactoring-v2
git add -A && git commit -m "backup: before implementing V2 refactoring"

# 2. V2 계획서 확인
cat STATE_REFACTORING_PLAN_V2.txt | head -100
cat STATE_REFACTORING_PLAN_V2_COMPLETE.txt | head -100
```

## 📝 Phase 1: Backend 상태 정의 완성 [V2 Plan 라인 40-178]

### 1.1 ✅ 이미 생성된 파일 확인
```bash
# 이미 존재함 - 확인만
ls -la backend/nfc_hospital_system/common/state_definitions.py
ls -la backend/nfc_hospital_system/p_queue/services.py
```

### 1.2 ❌ 모델 파일 정리 필요 [V2 Complete 라인 49-68]

**작업 1: Queue 모델 정리**
```python
# backend/nfc_hospital_system/p_queue/models.py
# 라인 9-22 완전 교체

from common.state_definitions import QueueDetailState, PatientJourneyState

class Queue(models.Model):
    """대기열 모델 - V2 리팩토링 적용"""
    
    # 기존 STATE_CHOICES 완전 삭제하고 아래로 교체
    STATE_CHOICES = [(state.value, state.value) for state in QueueDetailState]
    
    # state 필드는 그대로 유지
    state = models.CharField(
        max_length=20,
        choices=STATE_CHOICES,
        default=QueueDetailState.WAITING.value,  # 'waiting'
        verbose_name='대기열 상태'
    )
```

**작업 2: PatientState 모델 정리**
```python
# backend/nfc_hospital_system/p_queue/models.py
# 라인 360-380 근처

class PatientState(models.Model):
    """환자 상태 모델 - V2 리팩토링 적용"""
    
    # 기존 STATE_CHOICES 완전 삭제하고 아래로 교체
    STATE_CHOICES = [(state.value, state.value) for state in PatientJourneyState]
    
    current_state = models.CharField(
        max_length=20,
        choices=STATE_CHOICES,
        default=PatientJourneyState.UNREGISTERED.value,
        verbose_name='현재 상태'
    )
```

**작업 3: Appointment 모델 정리**
```python
# backend/nfc_hospital_system/appointments/models.py
# 라인 136-141 교체

STATUS_CHOICES = [
    ('scheduled', '예정'),
    ('waiting', '대기중'),
    ('in_progress', '진행중'),  # ❌ 'ongoing' 완전 제거
    ('completed', '완료'),
    ('cancelled', '취소'),
    ('delayed', '지연'),
]
```

## 📝 Phase 2: Service Layer 활용 [V2 Plan 라인 214-529]

### 2.1 기존 View 리팩토링 [V2 Complete 라인 118-148]

**작업 1: p_queue/views.py 대대적 수정**
```python
# backend/nfc_hospital_system/p_queue/views.py

# 1. Import 추가 (파일 상단)
from .services import PatientJourneyService, InvalidActionError
from common.state_definitions import *

# 2. 기존 PatientCurrentStateView 교체 (라인 약 100-200)
class PatientCurrentStateView(APIView):
    """V2: 서비스 계층 사용"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        service = PatientJourneyService(request.user)
        return Response(service.get_current_state())

# 3. 새로운 통합 ViewSet 추가
class PatientJourneyViewSet(viewsets.ViewSet):
    """V2: 액션 기반 상태 관리"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['GET'])
    def current_state(self, request):
        service = PatientJourneyService(request.user)
        return Response(service.get_current_state())
    
    @action(detail=False, methods=['POST'])
    def perform_action(self, request):
        action_type = request.data.get('action_type')
        payload = request.data.get('payload', {})
        
        if not action_type:
            return Response(
                {'error': 'action_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        service = PatientJourneyService(request.user)
        try:
            result = service.perform_action(action_type, payload)
            return Response(result)
        except InvalidActionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

# 4. 기존 중복 함수들 삭제
# 삭제 대상:
# - update_patient_state() 
# - manual_state_change()
# - queue_state_update()
# - 기타 직접 상태 변경 함수들
```

### 2.2 Signals 리팩토링 [V2 Complete 라인 152-168]

**작업 1: p_queue/signals.py 간소화**
```python
# backend/nfc_hospital_system/p_queue/signals.py
# 파일 전체를 아래로 교체

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Queue, PatientState
from .services import PatientJourneyService

@receiver(post_save, sender=Queue)
def sync_queue_to_patient_state(sender, instance, created, **kwargs):
    """V2: Queue 변경 시 PatientState 동기화"""
    if not created:  # 업데이트일 때만
        try:
            service = PatientJourneyService(user=instance.user)
            service.sync_from_queue_update(instance)
        except Exception as e:
            # 로그만 남기고 에러는 무시
            print(f"Signal sync error: {e}")

@receiver(post_save, sender=PatientState)
def sync_patient_state_to_queue(sender, instance, created, **kwargs):
    """V2: PatientState 변경 시 Queue 동기화"""
    if not created:  # 업데이트일 때만
        try:
            service = PatientJourneyService(user=instance.user)
            service.sync_from_patient_state(instance)
        except Exception as e:
            print(f"Signal sync error: {e}")

# 기존의 복잡한 시그널들 모두 삭제
```

## 📝 Phase 3: 데이터 마이그레이션 [V2 Plan 라인 819-861]

### 3.1 마이그레이션 파일 생성

**작업 1: 마이그레이션 생성**
```bash
cd backend/nfc_hospital_system
python manage.py makemigrations --empty p_queue -n unify_state_to_in_progress
```

**작업 2: 마이그레이션 코드 작성**
```python
# backend/nfc_hospital_system/p_queue/migrations/00XX_unify_state_to_in_progress.py

from django.db import migrations

def unify_state_names(apps, schema_editor):
    """ongoing → in_progress 일괄 변환"""
    
    # Queue 모델
    Queue = apps.get_model('p_queue', 'Queue')
    updated = Queue.objects.filter(state='ongoing').update(state='in_progress')
    print(f"✅ Queue: {updated}개 레코드 변환 (ongoing → in_progress)")
    
    # PatientState 모델
    PatientState = apps.get_model('p_queue', 'PatientState')
    updated = PatientState.objects.filter(current_state='ONGOING').update(
        current_state='IN_PROGRESS'
    )
    print(f"✅ PatientState: {updated}개 레코드 변환 (ONGOING → IN_PROGRESS)")
    
    # Appointment 모델
    Appointment = apps.get_model('appointments', 'Appointment')
    updated = Appointment.objects.filter(status='ongoing').update(status='in_progress')
    print(f"✅ Appointment: {updated}개 레코드 변환 (ongoing → in_progress)")
    
    # QueueStatusLog
    QueueStatusLog = apps.get_model('p_queue', 'QueueStatusLog')
    QueueStatusLog.objects.filter(previous_state='ongoing').update(
        previous_state='in_progress'
    )
    QueueStatusLog.objects.filter(new_state='ongoing').update(
        new_state='in_progress'
    )

def reverse_unify_state_names(apps, schema_editor):
    """롤백: in_progress → ongoing"""
    Queue = apps.get_model('p_queue', 'Queue')
    Queue.objects.filter(state='in_progress').update(state='ongoing')
    
    PatientState = apps.get_model('p_queue', 'PatientState')
    PatientState.objects.filter(current_state='IN_PROGRESS').update(
        current_state='ONGOING'
    )
    
    Appointment = apps.get_model('appointments', 'Appointment')
    Appointment.objects.filter(status='in_progress').update(status='ongoing')

class Migration(migrations.Migration):
    dependencies = [
        ('p_queue', 'XXXX_previous_migration'),  # 실제 마이그레이션 번호로 교체
    ]
    
    operations = [
        migrations.RunPython(unify_state_names, reverse_unify_state_names),
    ]
```

**작업 3: 마이그레이션 실행**
```bash
python manage.py migrate
```

## 📝 Phase 4: Frontend 정리 [V2 Complete 라인 173-236]

### 4.1 새 API 서비스 생성

**작업 1: patientJourneyService.js 생성**
```javascript
// frontend-pwa/src/api/patientJourneyService.js (새 파일)

import { api } from './client';

export const PatientJourneyAPI = {
    // 현재 상태 조회
    getCurrentState: async () => {
        const response = await api.get('/api/v1/patient-journey/current-state/');
        return response.data;
    },
    
    // 액션 수행
    performAction: async (actionType, payload = {}) => {
        const response = await api.post('/api/v1/patient-journey/perform-action/', {
            action_type: actionType,
            payload
        });
        return response.data;
    },
    
    // 상태 정의 가져오기
    getStateDefinitions: async () => {
        const response = await api.get('/api/v1/state-definitions/');
        return response.data;
    }
};
```

### 4.2 journeyStore.js 정리 [V2 Complete 라인 175-200]

**작업 1: 상태 정의 import**
```javascript
// frontend-pwa/src/store/journeyStore.js
// 라인 1-10 수정

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { PatientJourneyAPI } from '../api/patientJourneyService';  // 새 API
import apiService from '../api/apiService';
import { api, nfcAPI } from '../api/client';

// 상태 정의를 백엔드에서 가져오기
let stateDefinitions = null;

const loadStateDefinitions = async () => {
    if (!stateDefinitions) {
        stateDefinitions = await PatientJourneyAPI.getStateDefinitions();
    }
    return stateDefinitions;
};
```

**작업 2: 하드코딩된 상태 체크 제거**
```javascript
// frontend-pwa/src/store/journeyStore.js
// 라인 533 근처 - 매핑 함수 사용

// BEFORE (하드코딩):
const inProgressQueue = currentQueues.find(q => q.state === 'in_progress');

// AFTER (매핑 사용):
const normalizeQueueState = (state) => {
    // 백엔드가 'ongoing'을 보내더라도 'in_progress'로 정규화
    if (state === 'ongoing') return 'in_progress';
    return state;
};

// 큐 데이터 정규화
currentQueues = currentQueues.map(q => ({
    ...q,
    state: normalizeQueueState(q.state)
}));

// 이제 안전하게 검색 가능
const inProgressQueue = currentQueues.find(q => q.state === 'in_progress');
```

**작업 3: fetchJourneyData 간소화**
```javascript
// frontend-pwa/src/store/journeyStore.js
// 라인 280-851 대폭 간소화

fetchJourneyData: async (tagId = null) => {
    set({ isLoading: true, error: null });
    
    try {
        // V2: 새로운 통합 API 사용
        const stateData = await PatientJourneyAPI.getCurrentState();
        
        set({
            user: stateData.user,
            patientState: stateData.journey_state,  // 백엔드에서 계산된 상태
            currentQueues: stateData.queue_details,  // 이미 정규화됨
            todaysAppointments: stateData.appointments,
            availableActions: stateData.available_actions,
            isLoading: false
        });
        
        return stateData;
    } catch (error) {
        set({ error: error.message, isLoading: false });
        throw error;
    }
}
```

### 4.3 JourneyContainer 정리

**작업 1: 상태 상수 import**
```javascript
// frontend-pwa/src/components/JourneyContainer.jsx
// 라인 1-10

import React, { useEffect, useMemo } from 'react';
import useJourneyStore from '../store/journeyStore';
// constants/states.js 생성 필요
import { PatientJourneyState, QueueDetailState } from '../constants/states';
```

**작업 2: constants/states.js 생성**
```javascript
// frontend-pwa/src/constants/states.js (새 파일 또는 기존 파일 수정)

// V2: 백엔드와 동기화된 상태 정의
export const PatientJourneyState = {
    UNREGISTERED: 'UNREGISTERED',
    ARRIVED: 'ARRIVED',
    REGISTERED: 'REGISTERED',
    WAITING: 'WAITING',
    CALLED: 'CALLED',
    IN_PROGRESS: 'IN_PROGRESS',  // ✅ ONGOING 제거
    COMPLETED: 'COMPLETED',
    PAYMENT: 'PAYMENT',
    FINISHED: 'FINISHED'
};

export const QueueDetailState = {
    WAITING: 'waiting',
    CALLED: 'called',
    IN_PROGRESS: 'in_progress',  // ✅ ongoing 제거
    COMPLETED: 'completed',
    DELAYED: 'delayed',
    NO_SHOW: 'no_show',
    CANCELLED: 'cancelled'
};
```

## 📝 Phase 5: 통합 테스트 [V2 Plan 라인 869-981]

### 5.1 백엔드 테스트

```bash
# Django Shell 테스트
cd backend/nfc_hospital_system
python manage.py shell

>>> from p_queue.models import Queue, PatientState
>>> from p_queue.services import PatientJourneyService

# 1. 데이터 확인
>>> Queue.objects.filter(state='ongoing').count()  # 0이어야 함
>>> Queue.objects.filter(state='in_progress').count()

# 2. 서비스 테스트
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> user = User.objects.first()
>>> service = PatientJourneyService(user)
>>> service.get_current_state()
```

### 5.2 프론트엔드 테스트

```javascript
// 브라우저 콘솔에서 테스트
// 1. Store 상태 확인
const store = useJourneyStore.getState();
console.log('Patient State:', store.patientState);
console.log('Current Queues:', store.currentQueues);

// 2. 진행 중 큐 확인
const inProgressQueue = store.currentQueues.find(q => q.state === 'in_progress');
console.log('In Progress Queue:', inProgressQueue);
```

## 📝 Phase 6: 모니터링 [V2 Plan 라인 995-1107]

### 6.1 상태 일관성 체크 명령어 생성

```python
# backend/nfc_hospital_system/p_queue/management/commands/check_state_health.py
# V2 Plan 라인 989-1107의 코드 그대로 구현
```

## ⚠️ 실행 순서 (중요!)

```bash
# 1. 백엔드 모델 정리
# Phase 1.2의 모든 작업 완료

# 2. 마이그레이션 실행
cd backend/nfc_hospital_system
python manage.py makemigrations
python manage.py migrate

# 3. 백엔드 서버 재시작
python manage.py runserver

# 4. 프론트엔드 수정
# Phase 4의 모든 작업 완료

# 5. 프론트엔드 재시작
cd frontend-pwa
pnpm dev

# 6. 통합 테스트
# 브라우저에서 진행 중 상태 확인
```

## 🔥 절대 건너뛰면 안 되는 작업들

1. **Queue 모델의 STATE_CHOICES 교체** - 하지 않으면 여전히 'ongoing' 사용
2. **데이터베이스 마이그레이션** - 하지 않으면 기존 데이터가 'ongoing'으로 남음
3. **journeyStore의 정규화 함수 추가** - 하지 않으면 여전히 상태 못 찾음
4. **signals.py 리팩토링** - 하지 않으면 무한 루프 발생 가능

## 📊 검증 체크리스트

- [ ] Backend: `Queue.objects.filter(state='ongoing').count()` = 0
- [ ] Backend: `PatientState.objects.filter(current_state='ONGOING').count()` = 0
- [ ] Frontend: Console에서 `store.currentQueues`의 state가 모두 'in_progress'
- [ ] UI: 진행 중 상태가 화면에 정상 표시
- [ ] API: `/api/v1/patient-journey/current-state/` 응답에 'IN_PROGRESS' 포함

## 🚨 이 작업을 완료하지 않으면

**현재 상태를 유지하면:**
- 진행 중인 검사를 전혀 표시하지 못함
- 환자가 현재 무엇을 하는지 알 수 없음
- 대기 시간 계산 오류
- 상태 전환 로직 실패

**V2 계획서를 완전히 구현하면:**
- 모든 상태가 정확히 표시됨
- 중복 코드 80% 제거
- 새로운 상태 추가 시 한 곳만 수정
- 버그 발생률 90% 감소

---

# 실행 명령어

이 문서를 AI에게 전달할 때:

```
"IMPLEMENT_V2_REFACTORING_COMPLETE.md 파일을 읽고,
STATE_REFACTORING_PLAN_V2.txt와 STATE_REFACTORING_PLAN_V2_COMPLETE.txt를 참조하여
Phase 1부터 Phase 6까지 순서대로 빠짐없이 구현해주세요.
각 Phase를 완료할 때마다 검증 결과를 보여주세요."
```

**절대 임시 패치로 끝내지 말고 V2 계획서를 완전히 구현하세요!**