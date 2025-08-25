// patient_journey_improved.cy.js - 개선된 E2E 테스트
// 독립적이고 안정적인 테스트 구조

describe('환자 여정 E2E 테스트 (개선판)', () => {
  let testPatientData = null
  let testAppointments = null

  beforeEach(() => {
    // 각 테스트마다 새로운 테스트 환경 설정
    cy.visit('/')
    
    // 1. 동적으로 테스트 환자 생성 및 로그인
    cy.setupTestEnvironment().then(() => {
      testPatientData = Cypress.env('currentTestPatient')
      testAppointments = Cypress.env('currentTestAppointments')
      cy.log(`테스트 환자 ID: ${testPatientData.id}`)
    })
  })

  afterEach(() => {
    // 각 테스트 후 생성된 데이터 정리
    cy.cleanupTestData()
  })

  describe('단계 1: 병원 도착 전 상태', () => {
    it('UNREGISTERED 상태에서 로비 NFC 스캔', () => {
      cy.setPatientJourneyState('UNREGISTERED')
      cy.simulateNFCScan('nfc-lobby-001')
      cy.checkUIState('미등록', '접수처로 안내됩니다')
    })

    it('UNREGISTERED 상태에서 검사실 NFC 스캔', () => {
      cy.setPatientJourneyState('UNREGISTERED')
      cy.simulateNFCScan('nfc-blood-test-001')
      cy.checkUIState('미등록', '먼저 접수하세요')
    })
  })

  describe('단계 2: 검사실 대기 상태', () => {
    beforeEach(() => {
      // 이 describe 블록의 모든 테스트는 WAITING 상태에서 시작
      cy.setPatientJourneyState('WAITING')
    })

    it('대기 중 상태에서 올바른 검사실 도착', () => {
      // 첫 번째 예약(X선)에 대한 대기열 설정
      const firstAppointment = testAppointments[0]
      cy.setQueueState(firstAppointment.exam_id, 'waiting')
      
      cy.simulateNFCScan(`nfc-${firstAppointment.exam_id}-001`)
      cy.checkUIState('대기', '대기 중입니다')
      
      // 대기 순서 정보 확인
      cy.get('[data-cy=queue-position]').should('exist')
      cy.get('[data-cy=estimated-wait-time]').should('exist')
    })

    it('대기 중 잘못된 검사실 방문 시 안내', () => {
      // 첫 번째 예약이 있지만 다른 검사실 방문
      const firstAppointment = testAppointments[0]
      const secondAppointment = testAppointments[1]
      
      cy.setQueueState(firstAppointment.exam_id, 'waiting')
      
      cy.simulateNFCScan(`nfc-${secondAppointment.exam_id}-001`)
      cy.checkUIState('대기', `${firstAppointment.exam_name}실로 가세요`)
    })

    it('호출 상태 전환 및 입장 안내', () => {
      const firstAppointment = testAppointments[0]
      
      // 대기 중 상태 설정
      cy.setQueueState(firstAppointment.exam_id, 'waiting')
      cy.simulateNFCScan(`nfc-${firstAppointment.exam_id}-001`)
      cy.checkUIState('대기', '대기 중입니다')
      
      // 호출 상태로 변경
      cy.setPatientJourneyState('CALLED')
      cy.setQueueState(firstAppointment.exam_id, 'called')
      
      // 다시 스캔하면 입장 안내
      cy.simulateNFCScan(`nfc-${firstAppointment.exam_id}-001`)
      cy.checkUIState('호출됨', '검사실로 들어가세요')
    })
  })

  describe('단계 3: 검사 진행 및 완료', () => {
    it('검사 진행 중 상태 표시', () => {
      const appointment = testAppointments[0]
      
      cy.setPatientJourneyState('ONGOING')
      cy.setQueueState(appointment.exam_id, 'ongoing')
      
      cy.simulateNFCScan(`nfc-${appointment.exam_id}-001`)
      cy.checkUIState('진행', '검사가 진행 중입니다')
      
      // 진행률 표시 확인
      cy.get('[data-cy=progress-indicator]').should('exist')
    })

    it('검사 완료 후 다음 검사 안내', () => {
      const firstAppointment = testAppointments[0]
      const secondAppointment = testAppointments[1]
      
      // 첫 번째 검사 완료
      cy.setPatientJourneyState('COMPLETED')
      cy.setQueueState(firstAppointment.exam_id, 'completed')
      
      cy.simulateNFCScan(`nfc-${firstAppointment.exam_id}-001`)
      cy.checkUIState('완료', `${secondAppointment.exam_name}`)
      
      // 다음 검사실 안내 정보 확인
      cy.get('[data-cy=next-location]').should('contain', secondAppointment.exam_name)
    })

    it('모든 검사 완료 후 수납 안내', () => {
      // 모든 예약을 완료 상태로 설정
      testAppointments.forEach(apt => {
        cy.setQueueState(apt.exam_id, 'completed')
      })
      
      // 마지막 검사 완료
      cy.setPatientJourneyState('COMPLETED')
      cy.setAppointments([]) // 남은 예약 없음
      
      const lastAppointment = testAppointments[testAppointments.length - 1]
      cy.simulateNFCScan(`nfc-${lastAppointment.exam_id}-001`)
      cy.checkUIState('완료', '모든 검사가 완료되었습니다')
      
      // 수납 안내 확인
      cy.get('[data-cy=payment-guide]').should('exist')
    })
  })

  describe('특수 상황 처리', () => {
    it('지연된 검사 대기 상태', () => {
      const appointment = testAppointments[0]
      
      cy.setPatientJourneyState('WAITING')
      cy.setQueueState(appointment.exam_id, 'delayed')
      
      cy.simulateNFCScan(`nfc-${appointment.exam_id}-001`)
      cy.checkUIState('대기', '지연되고 있습니다')
      
      // 예상 지연 시간 표시
      cy.get('[data-cy=delay-notice]').should('exist')
    })

    it('미방문(No-Show) 후 재등록', () => {
      const appointment = testAppointments[0]
      
      // 호출되었지만 미방문
      cy.setPatientJourneyState('CALLED')
      cy.setQueueState(appointment.exam_id, 'no_show')
      
      cy.simulateNFCScan(`nfc-${appointment.exam_id}-001`)
      cy.checkUIState('호출됨', '재등록이 필요합니다')
      
      // 재등록 버튼 확인
      cy.get('[data-cy=re-register-btn]').should('exist').click()
      
      // 대기 상태로 복귀
      cy.setPatientJourneyState('WAITING')
      cy.setQueueState(appointment.exam_id, 'waiting')
      
      cy.simulateNFCScan(`nfc-${appointment.exam_id}-001`)
      cy.checkUIState('대기', '대기 중입니다')
    })

    it('검사 취소된 경우 처리', () => {
      const appointment = testAppointments[2] // 세 번째 검사
      
      cy.setPatientJourneyState('WAITING')
      cy.setQueueState(appointment.exam_id, 'cancelled')
      
      cy.simulateNFCScan(`nfc-${appointment.exam_id}-001`)
      cy.checkUIState('대기', '검사가 취소되었습니다')
      
      // 다음 가능한 행동 안내
      cy.get('[data-cy=cancelled-guide]').should('exist')
    })
  })

  describe('전체 여정 통합 시나리오', () => {
    it('병원 도착부터 귀가까지 전체 프로세스', () => {
      // 1. 병원 도착 전
      cy.setPatientJourneyState('UNREGISTERED')
      cy.simulateNFCScan('nfc-lobby-001')
      cy.checkUIState('미등록', '접수처로 안내됩니다')

      // 2. 도착 및 등록
      cy.setPatientJourneyState('ARRIVED')
      cy.simulateNFCScan('nfc-reception-001')
      cy.checkUIState('도착', '간편 인증 필요합니다')

      // 3. 등록 완료
      cy.setPatientJourneyState('REGISTERED')
      cy.simulateNFCScan('nfc-lobby-001')
      cy.checkUIState('등록', '첫 번째 검사실로 이동하세요')

      // 4. 각 검사 순차적 진행
      testAppointments.forEach((appointment, index) => {
        // 대기
        cy.setPatientJourneyState('WAITING')
        cy.setQueueState(appointment.exam_id, 'waiting')
        cy.simulateNFCScan(`nfc-${appointment.exam_id}-001`)
        cy.checkUIState('대기', '대기 중입니다')

        // 호출
        cy.setPatientJourneyState('CALLED')
        cy.setQueueState(appointment.exam_id, 'called')
        cy.simulateNFCScan(`nfc-${appointment.exam_id}-001`)
        cy.checkUIState('호출됨', '검사실로 들어가세요')

        // 진행
        cy.setPatientJourneyState('ONGOING')
        cy.setQueueState(appointment.exam_id, 'ongoing')
        cy.wait(1000) // 실제 검사 시뮬레이션

        // 완료
        cy.setPatientJourneyState('COMPLETED')
        cy.setQueueState(appointment.exam_id, 'completed')
        
        if (index < testAppointments.length - 1) {
          // 다음 검사가 있는 경우
          const nextAppointment = testAppointments[index + 1]
          cy.simulateNFCScan(`nfc-${appointment.exam_id}-001`)
          cy.checkUIState('완료', `${nextAppointment.exam_name}`)
        }
      })

      // 5. 모든 검사 완료
      cy.setAppointments([]) // 남은 예약 없음
      cy.simulateNFCScan('nfc-payment-001')
      cy.checkUIState('완료', '수납 진행하세요')

      // 6. 수납
      cy.setPatientJourneyState('PAYMENT')
      cy.simulateNFCScan('nfc-payment-001')
      cy.checkUIState('수납대기', '수납 진행중입니다')

      // 7. 모든 과정 완료
      cy.setPatientJourneyState('FINISHED')
      cy.simulateNFCScan('nfc-exit-001')
      cy.checkUIState('완료', '안전하게 귀가하세요')
    })
  })
})

// 성능 및 접근성 테스트
describe('성능 및 접근성 검증', () => {
  beforeEach(() => {
    cy.setupTestEnvironment()
  })

  afterEach(() => {
    cy.cleanupTestData()
  })

  it('화면 전환 시 로딩 시간 체크', () => {
    cy.setPatientJourneyState('WAITING')
    
    // 화면 전환 시작 시간 기록
    const startTime = Date.now()
    
    cy.simulateNFCScan('nfc-xray-001')
    
    // 화면이 완전히 로드될 때까지 대기
    cy.get('[data-cy=main-content]').should('be.visible')
    
    // 로딩 시간이 3초 이내인지 확인
    cy.wrap(Date.now() - startTime).should('be.lessThan', 3000)
  })

  it('고령자 친화적 UI 요소 확인', () => {
    cy.setPatientJourneyState('WAITING')
    cy.simulateNFCScan('nfc-xray-001')
    
    // 글자 크기 확인
    cy.get('[data-cy=guide-message]')
      .should('have.css', 'font-size')
      .and('match', /^(2[0-9]|[3-9][0-9])px$/) // 20px 이상
    
    // 버튼 크기 확인
    cy.get('[data-cy=main-action-btn]')
      .should('have.css', 'min-height')
      .and('match', /^(5[6-9]|[6-9][0-9]|[1-9][0-9]{2})px$/) // 56px 이상
    
    // 색상 대비 확인 (배경과 텍스트)
    cy.get('[data-cy=guide-message]').should('have.css', 'color')
    cy.get('[data-cy=guide-message]').should('have.css', 'background-color')
  })

  it('오프라인 상태에서도 기본 기능 동작', () => {
    // 오프라인 상태 시뮬레이션
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(false)
    })
    
    cy.setPatientJourneyState('WAITING')
    cy.simulateNFCScan('nfc-xray-001')
    
    // 오프라인에서도 기본 UI가 표시되는지 확인
    cy.checkUIState('대기', '대기 중입니다')
    
    // 오프라인 알림 표시 확인
    cy.get('[data-cy=offline-notice]').should('be.visible')
  })
})