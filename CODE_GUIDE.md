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
    TRAINED_DEPARTMENTS = {'내과', '정형외과', '진단검사의학과', 'CT실', 'MRI실', 'X-ray실'}

    def predict_wait_times(self, department, timeframe='1h'):
        """LSTM 모델로 대기 시간 예측"""
        # 1. 모델 로드 (캐시 활용)
        model_key = f"{department}_{timeframe}"
        if model_key not in self.models:
            interpreter = tf.lite.Interpreter(model_path=f"models/lstm_{model_key}.tflite")
            interpreter.allocate_tensors()
            self.models[model_key] = interpreter

        # 2. 현재 상태 feature 추출 (대기 인원, 시간대, 요일, 계절 등 15개)
        current_features = self._extract_features(department)

        # 3. LSTM 입력 형태로 변환 (sequence_length=10)
        input_sequence = self._prepare_sequence(current_features)
        input_data = np.array([input_sequence], dtype=np.float32)

        # 4. TFLite 모델 추론
        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        prediction = interpreter.get_tensor(output_details[0]['index'])

        return {'predicted_wait_minutes': int(prediction[0][0])}
```

---

### 5-2. 환자 상태 전이 서비스

Backend에서 9단계 환자 여정 상태를 중앙 관리하며, Frontend는 액션만 전송합니다.

```python
# p_queue/services.py
class PatientJourneyService:
    VALID_TRANSITIONS = {
        PatientJourneyState.UNREGISTERED: [PatientJourneyState.ARRIVED],
        PatientJourneyState.ARRIVED: [PatientJourneyState.REGISTERED],
        # ... 생략
    }

    @classmethod
    def transition_state(cls, user, new_state, trigger_source=None, metadata=None):
        """상태 전이 실행 및 검증"""
        patient_state, _ = PatientState.objects.get_or_create(user=user)
        current_state = patient_state.current_state

        # 1. 전이 유효성 검증
        if new_state not in cls.VALID_TRANSITIONS.get(current_state, []):
            raise InvalidStateTransitionError(f"허용되지 않은 전이: {current_state} → {new_state}")

        # 2. 상태 업데이트
        patient_state.current_state = new_state
        patient_state.save()

        # 3. StateTransition 로그 기록 (감사 추적)
        StateTransition.objects.create(user=user, from_state=current_state, to_state=new_state)

        # 4. WebSocket 알림 전송
        channel_layer.group_send(f"patient_{user.user_id}", {'type': 'state_update', 'new_state': new_state})

        return patient_state
```

---

### 5-3. GPT-4o 챗봇 동적 프롬프트 생성

사용자 인증 여부에 따라 시스템 프롬프트를 동적으로 생성하여 맞춤형 응답을 제공합니다.

```python
# chatbot-server/app.py
def build_system_prompt(user_info=None, patient_data=None):
    """인증 상태별 동적 프롬프트 생성"""
    prompt = """당신은 HC_119 종합병원의 AI 안내원 '차비서'입니다.
[병원 기본 정보]
- 대표전화: 1588-0000, 진료시간: 평일 08:30-17:30
"""

    # 로그인 사용자 개인 정보 주입
    if user_info and patient_data:
        prompt += f"""
[환자 개인 정보] ⭐ {user_info['name']}님
- 현재 상태: {patient_data.get('stateDescription')}
- 대기번호: {patient_data['currentQueues'][0]['queue_number']}번
- 예상 대기시간: 약 {patient_data['currentQueues'][0]['estimated_wait_time']}분
"""

    prompt += """
[답변 규칙]
1. 개인 정보 질문 시 → [환자 개인 정보]가 있으면 구체적 답변, 없으면 "로그인하시면 확인 가능"
2. 일반 정보 질문 시 → 로그인 여부 무관하게 [병원 기본 정보] 활용
"""
    return prompt

@app.route('/api/chatbot/query', methods=['POST'])
def chatbot_query():
    user_info = verify_jwt_token(request.headers.get('Authorization'))
    patient_data = fetch_patient_info(user_info['user_id']) if user_info else None

    system_prompt = build_system_prompt(user_info, patient_data)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": question}]
    )
    return jsonify({"answer": response.choices[0].message.content})
```

---

### 5-4. NFC 태그 스캔 처리

비로그인/로그인 이중 모드로 위치 인식 및 맞춤형 안내를 제공합니다.

```python
# nfc/views.py
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def nfc_scan(request):
    """로그인 사용자용 NFC 스캔 - 맞춤형 안내"""
    user = request.user
    tag = NFCTag.objects.get(tag_id=request.data.get('tag_id'), is_active=True)

    # 1. TagLog 기록 (동선 분석용)
    TagLog.objects.create(user=user, tag=tag, action_type='scan')

    # 2. 현재 환자 상태 조회
    patient_state = PatientState.objects.get(user=user)
    current_queue = Queue.objects.filter(user=user, state__in=['waiting', 'called']).first()

    # 3. 위치 확인 및 맞춤 안내 생성
    if tag.room == current_queue.exam.room:
        personalized_message = f"{user.name}님, {current_queue.exam.title} 대기번호 {current_queue.queue_number}번입니다."
        next_action = {"type": "wait_here", "estimated_wait": current_queue.estimated_wait_time}
    else:
        personalized_message = f"현재 위치는 {tag.room}입니다. {current_queue.exam.room}으로 이동해주세요."

    return Response({"personalized_message": personalized_message, "next_action": next_action})
```

---

### 5-5. Frontend 환자 여정 UI 관리

상태별로 최적화된 UI 템플릿을 자동으로 렌더링하고 실시간 데이터를 반영합니다.

```jsx
// frontend-pwa/src/components/JourneyContainer.jsx
const JourneyContainer = ({ taggedLocation }) => {
  const patientState = useJourneyStore(state => state.patientState);
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments);

  // 1. 상태별 Template/Content 조합 결정
  const currentState = patientState?.current_state || PatientJourneyState.FINISHED;
  const { Template, Content } = getJourneyComponents(currentState);

  // 2. 완료 통계 계산
  const journeySummary = React.useMemo(() => {
    const completedTasks = todaysAppointments.filter(apt =>
      ['completed', 'examined'].includes(apt.status)
    );
    const totalMinutes = completedTasks.reduce((sum, apt) => {
      const duration = apt.completed_at && apt.started_at
        ? (new Date(apt.completed_at) - new Date(apt.started_at)) / 60000
        : apt.exam?.average_duration || 30;
      return sum + duration;
    }, 0);
    return { completedCount: completedTasks.length, totalDuration: totalMinutes };
  }, [todaysAppointments]);

  // 3. Template에 데이터 전달하여 렌더링
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
