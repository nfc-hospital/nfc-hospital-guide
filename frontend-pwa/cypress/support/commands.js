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