// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// 테스트용 관리자 로그인 커맨드
Cypress.Commands.add('loginAsAdmin', () => {
  const apiUrl = Cypress.env('apiUrl')
  const email = Cypress.env('testAdminEmail')
  const password = Cypress.env('testAdminPassword')
  
  cy.request('POST', `${apiUrl}/auth/login/`, {
    email,
    password
  }).then((response) => {
    window.localStorage.setItem('accessToken', response.body.access)
    window.localStorage.setItem('refreshToken', response.body.refresh)
    window.localStorage.setItem('userRole', 'super-admin')
  })
})

// 환자 상태 설정 커맨드
Cypress.Commands.add('setPatientState', (patientId, targetState, clearAppointments = false) => {
  const apiUrl = Cypress.env('apiUrl')
  
  // 먼저 관리자로 로그인
  cy.loginAsAdmin()
  
  // 환자 상태 변경 API 호출
  cy.request({
    method: 'POST',
    url: `${apiUrl}/queue/test/set-patient-state/`,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('accessToken')}`
    },
    body: {
      patient_id: patientId,
      target_state: targetState,
      clear_appointments: clearAppointments
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    expect(response.body.success).to.be.true
    cy.log(`환자 상태가 ${targetState}로 변경되었습니다.`)
  })
})

// 테스트 환자 생성 커맨드
Cypress.Commands.add('createTestPatient', () => {
  const apiUrl = Cypress.env('apiUrl')
  const timestamp = Date.now()
  const testEmail = `test${timestamp}@example.com`
  const testPhone = `0101234${String(timestamp).slice(-4)}`
  
  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/register/`,
    body: {
      email: testEmail,
      password: 'testpass123',
      name: '테스트 환자',
      phone_number: testPhone,
      birth_date: '1990-01-01',
      role: 'patient'
    },
    failOnStatusCode: false
  }).then((response) => {
    if (response.status === 201) {
      const patientId = response.body.user.user_id
      Cypress.env('testPatientId', patientId)
      cy.log(`테스트 환자 생성됨: ${patientId}`)
      return patientId
    }
  })
})

// NFC 태그 시뮬레이션 커맨드
Cypress.Commands.add('simulateNFCTag', (tagId) => {
  cy.visit(`/?nfc=${tagId}`)
})

// WebSocket 연결 대기 커맨드
Cypress.Commands.add('waitForWebSocket', (timeout = 5000) => {
  cy.window().its('wsConnected').should('be.true', { timeout })
})

// [작업 1] 테스트를 위한 헬퍼 함수 구현

// 환자의 전체 여정 상태를 변경하는 커맨드
Cypress.Commands.add('setPatientJourneyState', (state) => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:8000/api/v1'
  const accessToken = window.localStorage.getItem('accessToken')
  
  cy.request({
    method: 'POST',
    url: `${apiUrl}/test/set-patient-state/`,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: {
      state: state,
      user_id: Cypress.env('testUserId') || 'test-user-001'
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    cy.log(`환자 상태가 ${state}로 변경됨`)
    cy.wait(1000) // 상태 변경 후 UI 업데이트 대기
  })
})

// 특정 검사의 대기열 상태를 변경하는 커맨드
Cypress.Commands.add('setQueueState', (examId, queueState) => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:8000/api/v1'
  const accessToken = window.localStorage.getItem('accessToken')
  
  cy.request({
    method: 'POST',
    url: `${apiUrl}/test/set-queue-state/`,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: {
      exam_id: examId,
      queue_state: queueState,
      user_id: Cypress.env('testUserId') || 'test-user-001'
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    cy.log(`${examId} 대기열 상태가 ${queueState}로 변경됨`)
    cy.wait(500)
  })
})

// 테스트 환자의 당일 예약 정보를 설정하는 커맨드
Cypress.Commands.add('setAppointments', (appointments) => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:8000/api/v1'
  const accessToken = window.localStorage.getItem('accessToken')
  
  cy.request({
    method: 'POST',
    url: `${apiUrl}/test/set-appointments/`,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: {
      appointments: appointments,
      user_id: Cypress.env('testUserId') || 'test-user-001'
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    cy.log(`예약 정보가 설정됨: ${appointments.length}개`)
    cy.wait(500)
  })
})

// NFC 태그 스캔을 시뮬레이션하는 커맨드
Cypress.Commands.add('simulateNFCScan', (tagId) => {
  cy.visit(`/nfc/${tagId}`)
  cy.wait(2000) // NFC 스캔 후 화면 로딩 대기
  cy.log(`NFC 태그 ${tagId} 스캔 시뮬레이션`)
})

// 테스트 사용자로 로그인하는 커맨드
Cypress.Commands.add('loginAsTestPatient', () => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:8000/api/v1'
  
  // 간편 로그인 시도 (전화번호 뒷자리 + 생년월일)
  cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/simple-login/`,
    body: {
      phoneLast4: '5678',    // 전화번호 뒷자리 4자리 (camelCase)
      birthDate: '900101'    // 생년월일 6자리 (YYMMDD) (camelCase)
    },
    failOnStatusCode: false
  }).then((response) => {
    if (response.status === 200 && response.body.success) {
      // 로그인 성공
      window.localStorage.setItem('accessToken', response.body.data.tokens.access)
      window.localStorage.setItem('refreshToken', response.body.data.tokens.refresh)
      window.localStorage.setItem('userRole', 'patient')
      Cypress.env('testUserId', response.body.data.user.id)
      cy.log('테스트 환자로 로그인 완료')
    } else {
      // 로그인 실패시 테스트 계정 먼저 생성
      cy.log('테스트 환자가 없어서 생성 중...')
      
      // 먼저 일반 회원가입
      cy.request({
        method: 'POST',
        url: `${apiUrl}/auth/register/`,
        body: {
          email: `test${Date.now()}@example.com`,
          password: 'testpass123',
          name: '테스트 환자',
          phone_number: '010-1234-5678',
          birth_date: '1990-01-01',
          role: 'patient'
        },
        failOnStatusCode: false
      }).then((regResponse) => {
        if (regResponse.status === 201 || regResponse.status === 200) {
          // 회원가입 성공 후 간편 로그인 재시도
          cy.request({
            method: 'POST',
            url: `${apiUrl}/auth/simple-login/`,
            body: {
              phoneLast4: '5678',    // camelCase로 수정
              birthDate: '900101'     // 생년월일 6자리로 수정
            }
          }).then((loginResponse) => {
            expect(loginResponse.body.success).to.be.true
            window.localStorage.setItem('accessToken', loginResponse.body.data.tokens.access)
            window.localStorage.setItem('refreshToken', loginResponse.body.data.tokens.refresh)
            window.localStorage.setItem('userRole', 'patient')
            Cypress.env('testUserId', loginResponse.body.data.user.id)
            cy.log('테스트 환자 생성 및 로그인 완료')
          })
        } else {
          cy.log('테스트 환자 생성 실패, 기존 데이터 사용')
          // 회원가입 실패시 (이미 존재하는 경우) 간편 로그인만 재시도
          cy.request({
            method: 'POST',
            url: `${apiUrl}/auth/simple-login/`,
            body: {
              phoneLast4: '5678',    // camelCase로 수정
              birthDate: '900101'     // 생년월일 6자리로 수정
            }
          }).then((finalLoginResponse) => {
            window.localStorage.setItem('accessToken', finalLoginResponse.body.data.tokens.access)
            window.localStorage.setItem('refreshToken', finalLoginResponse.body.data.tokens.refresh)
            window.localStorage.setItem('userRole', 'patient')
            Cypress.env('testUserId', finalLoginResponse.body.data.user.id)
            cy.log('기존 테스트 환자로 로그인 완료')
          })
        }
      })
    }
  })
})

// 기본 테스트 예약 데이터 생성 헬퍼
Cypress.Commands.add('createDefaultAppointments', () => {
  const appointments = [
    {
      appointment_id: 'test-apt-001',
      exam_id: 'xray',
      exam_name: 'X선 촬영',
      scheduled_at: '2025-08-16T09:00:00Z',
      status: 'scheduled',
      order: 1
    },
    {
      appointment_id: 'test-apt-002',
      exam_id: 'blood-test',
      exam_name: '혈액검사',
      scheduled_at: '2025-08-16T09:30:00Z',
      status: 'scheduled',
      order: 2
    },
    {
      appointment_id: 'test-apt-003',
      exam_id: 'ultrasound',
      exam_name: '초음파검사',
      scheduled_at: '2025-08-16T10:00:00Z',
      status: 'scheduled',
      order: 3
    },
    {
      appointment_id: 'test-apt-004',
      exam_id: 'internal-medicine',
      exam_name: '내과 진료',
      scheduled_at: '2025-08-16T10:30:00Z',
      status: 'scheduled',
      order: 4
    }
  ]
  
  cy.setAppointments(appointments)
})

// UI 요소 확인 헬퍼
Cypress.Commands.add('checkUIState', (expectedState, expectedMessage) => {
  // 상태 배지 확인
  cy.get('[data-cy=status-badge]').should('contain', expectedState)
  
  // 안내 메시지 확인
  if (expectedMessage) {
    cy.get('[data-cy=guide-message]').should('contain', expectedMessage)
  }
  
  cy.wait(1000) // UI 확인을 위한 짧은 대기
})