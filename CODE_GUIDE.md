# NFC + AI 기반 스마트 병원 안내 시스템

**팀명**: [팀명]
**개발 기간**: 2025년
**주요 기술**: NFC, LSTM, GPT-4o, Django REST Framework, React PWA

---

## 1. 주제

본 시스템은 NFC 태그 기반 위치 추적과 LSTM 딥러닝을 활용하여 병원 방문 환자의 원활한 동선 안내 및 대기 시간 예측을 제공하는 스마트 병원 안내 솔루션입니다. 고령 환자도 쉽게 사용할 수 있는 직관적인 UI와 GPT-4o 기반 대화형 챗봇을 통해 24시간 상담이 가능하며, 9단계 환자 여정(Patient Journey)을 자동으로 관리하여 검사실 이동부터 수납까지 전 과정을 실시간으로 안내합니다.

---

## 2. 주요 특징

1. **NFC 태그 기반 자동 위치 추적 및 맞춤형 안내**
2. **LSTM 딥러닝 기반 대기 시간 예측 (6개 부서 전용 학습)**
3. **GPT-4o 챗봇 '차비서' - 인증 상태별 동적 프롬프트 생성**
4. **9단계 환자 여정 자동 관리 (UNREGISTERED → FINISHED)**
5. **WebSocket 실시간 대기열 업데이트 및 호출 알림**
6. **Django REST + React PWA 마이크로서비스 아키텍처**

---

## 3. 코드의 전체적인 흐름

1. **환자 병원 도착** → NFC 태그 스캔으로 위치 인식 및 공개 정보 제공
2. **로그인 (전화번호 + 생년월일)** → JWT 토큰 발급 및 PatientState 초기화 (ARRIVED)
3. **접수 완료** → REGISTERED 상태 전이 + 첫 번째 검사 Queue 자동 생성
4. **대기 중** → LSTM 모델로 예상 대기시간 예측 (30분/1시간/2시간 단위)
5. **환자 호출** → 관리자 대시보드에서 호출 시 WebSocket으로 실시간 알림 전송
6. **검사 진행 → 완료** → IN_PROGRESS → COMPLETED 자동 전이, 다음 검사 확인
7. **수납 완료 → 귀가 안내** → PAYMENT → FINISHED 전이, 다음 예약 정보 제공

---

## 4. 각 파일의 역할 소개

| 파일명 | 역할 소개 |
|--------|-----------|
| **common/state_definitions.py** | 9단계 환자 여정 상태 enum 정의. Frontend/Backend 간 상태 동기화의 단일 진실 원천. |
| **p_queue/services.py** | PatientJourneyService 클래스로 상태 전이 중앙 관리. transition_state() 메서드로 검증 및 로그 기록. |
| **p_queue/views.py** | 대기열 조회/생성/수정 API. 실시간 대기열 현황 제공 및 환자 호출 기능. |
| **nfc/views.py** | NFC 태그 스캔 처리. 비로그인(공개 정보)/로그인(맞춤 안내) 이중 모드 지원. TagLog 자동 기록. |
| **integrations/services/prediction_service.py** | LSTM 예측 서비스. TensorFlow Lite 모델로 6개 부서별 대기 시간 예측. |
| **integrations/management/commands/generate_realistic_emr_data.py** | EMR 데이터 생성 스크립트. 부서별 패턴(peak_multiplier, seasonal_factor) 반영한 학습 데이터 생성. |
| **frontend-pwa/src/components/JourneyContainer.jsx** | 환자 여정 UI 조립 컨테이너. 상태별 Template/Content 자동 렌더링 및 완료 통계 계산. |
| **frontend-pwa/src/api/patientJourneyService.js** | Frontend ↔ Backend API 통신 서비스. 상태 조회 및 액션 전송. |
| **frontend-pwa/src/components/admin/dashboard/LSTMPrediction.jsx** | 관리자용 LSTM 예측 대시보드. 실시간 예측 결과 시각화 및 정확도 검증. |
| **chatbot-server/app.py** | Flask 기반 GPT-4o 챗봇. JWT 검증 → Django API 조회 → 동적 프롬프트 생성 → OpenAI API 호출. |

---

## 5. 핵심 코드 분석

### 5-1. LSTM 예측 알고리즘

6개 부서별 전용 학습 모델을 사용하여 30분/1시간/2시간 단위로 대기 시간을 예측합니다.

```python
# integrations/services/prediction_service.py
class PredictionService:
    # 학습된 6개 부서 (EMRBots 데이터셋 기반)
    DEPARTMENT_LIST = ['내과', '정형외과', '진단검사의학과', 'X-ray실', 'CT실', 'MRI실']

    @staticmethod
    def get_predictions(timeframe='30min'):
        """부서별 대기시간 예측 (다중 시간대 지원)"""
        # 시간대별 분 단위 변환
        timeframe_minutes = {'30min': 30, '1hour': 60, '2hour': 120}
        target_minutes = timeframe_minutes.get(timeframe, 30)

        predictions = {}
        for dept in departments:
            # LSTM 예측
            input_data = PredictionService.get_recent_data_for_prediction(dept)
            future = predictor.predict(input_data)

            predicted_wait_30min = future.get('predicted_wait_time')

            # 시간대별 예측값 계산 (선형 보간)
            if target_minutes == 30:
                predicted_wait = predicted_wait_30min
            elif target_minutes == 60:
                predicted_wait = round(predicted_wait_30min * 1.5)  # 1시간 후
            elif target_minutes == 120:
                predicted_wait = round(predicted_wait_30min * 2.0)  # 2시간 후

            predictions[dept] = {
                'predicted_wait': predicted_wait,
                'timeframe': timeframe,
                'target_minutes': target_minutes
            }

        return predictions
```

---

### 5-2. 환자 상태 전이 서비스

Backend에서 9단계 환자 여정 상태를 중앙 관리하며, Frontend는 액션만 전송합니다.

```python
# p_queue/services.py
class PatientJourneyService:
    @transaction.atomic
    def perform_action(self, action_type: str, payload: Dict[str, Any] = None):
        """액션을 수행하고 상태를 전이시킴"""
        # 현재 상태 조회
        patient_state = self._get_or_create_patient_state()
        current_state = PatientJourneyState(patient_state.current_state)

        # 상태 전이 가능 여부 확인
        transitions = STATE_TRANSITIONS[current_state]
        if action not in transitions:
            raise InvalidActionError(f"Action '{action_type}' is not allowed")

        new_state = transitions[action]

        # 상태 변경 수행
        patient_state.current_state = new_state.value
        patient_state.save()

        # 상태 전환 로그 생성
        StateTransition.objects.create(
            user=self.user, from_state=old_state_value, to_state=new_state.value
        )

        # WebSocket 알림 전송
        async_to_sync(self.channel_layer.group_send)(
            f"patient_{self.user.id}",
            {"type": "state_update", "journey_state": new_state}
        )

        return self._build_response(patient_state)
```

---

### 5-3. JWT 기반 인증 및 Django API 컨텍스트 조회

챗봇 서버는 JWT 토큰을 검증하여 사용자를 식별하고, Django API에서 실시간 환자 컨텍스트를 조회합니다.

```python
# chatbot-server/app.py
def verify_jwt_token(auth_header):
    """JWT 토큰 검증하여 사용자 정보 반환"""
    if not auth_header or not auth_header.startswith('Bearer '):
        return None

    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, DJANGO_SECRET_KEY, algorithms=['HS256'])

        return {
            'user_id': payload.get('user_id'),
            'name': payload.get('name', '환자'),
            'role': payload.get('role', 'patient')
        }
    except jwt.ExpiredSignatureError:
        return None

@app.route('/api/chatbot/query', methods=['POST'])
def chatbot_query():
    # 1. JWT 검증 → user_info 추출
    user_info = verify_jwt_token(request.headers.get('Authorization'))

    # 2. Django API 호출 → 환자 실시간 상태 조회
    patient_data = fetch_patient_info(user_info['user_id']) if user_info else None

    # 3. 동적 프롬프트 생성 및 GPT-4o API 호출
    system_prompt = build_system_prompt(user_info, patient_data)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system_prompt},
                  {"role": "user", "content": question}]
    )
    return jsonify({"answer": response.choices[0].message.content})
```

---

### 5-4. NFC 태그 스캔 처리

비로그인/로그인 이중 모드로 위치 인식 및 맞춤형 안내를 제공합니다.

```python
# nfc/views.py
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def nfc_public_scan(request):
    """비로그인 사용자용 NFC 태그 스캔 - 공개 정보만"""
    tag_id = request.data.get('tag_id')

    # 태그 유효성 검증
    tag = NFCTag.objects.get(tag_id=tag_id, is_active=True)

    # 주변 편의시설 조회
    nearby_facilities = _get_nearby_facilities(tag)

    # 마지막 스캔 시각 업데이트
    tag.last_scanned_at = timezone.now()
    tag.save(update_fields=['last_scanned_at'])

    return Response({
        "location": f"{tag.building} {tag.floor}층 {tag.room}",
        "description": tag.description,
        "nearby_facilities": nearby_facilities
    })
```

---

### 5-5. Frontend 환자 여정 UI 관리

상태별로 최적화된 UI 템플릿을 자동으로 렌더링하고 실시간 데이터를 반영합니다.

```jsx
// frontend-pwa/src/components/JourneyContainer.jsx
const JourneyContainer = ({ taggedLocation }) => {
  const patientState = useJourneyStore(state => state.patientState);
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments);

  // 상태별 Template/Content 조합 결정
  const currentState = patientState?.current_state || PatientJourneyState.FINISHED;
  const { Template, Content } = getJourneyComponents(currentState);

  // 완료 통계 계산
  const journeySummary = React.useMemo(() => {
    const completedTasks = todaysAppointments.filter(
      apt => ['completed', 'examined'].includes(apt.status)
    );

    const totalMinutes = completedTasks.reduce((sum, apt) => {
      if (apt.started_at && apt.completed_at) {
        const duration = (new Date(apt.completed_at) - new Date(apt.started_at)) / 60000;
        return sum + duration;
      }
      return sum + (apt.exam?.average_duration || 30);
    }, 0);

    return { completedCount: completedTasks.length, totalDuration: totalMinutes };
  }, [todaysAppointments]);

  return (
    <Template
      patientState={currentState}
      progressBar={<ProgressBar appointments={todaysAppointments} />}
      mainContent={<Content />}
      completionStats={journeySummary}
    />
  );
};
```

---

**문서 작성**: 2025년 10월
**최종 수정**: 2025-10-01
