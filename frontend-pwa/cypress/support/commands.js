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

// 테스트 환자 데이터를 동적으로 생성하는 커맨드
Cypress.Commands.add('createDynamicTestPatient', () => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:8000/api/v1'
  const timestamp = Date.now()
  
  // 회원가입 API가 없으므로, 미리 생성된 테스트 사용자 정보를 사용
  // 또는 Django management command로 생성된 사용자 사용
  const testData = {
    phone_last4: '5678',  // 전화번호 뒷자리
    birth_date: '1990-01-01'
  }
  
  // 간편 로그인을 통해 사용자 정보 확인
  return cy.request({
    method: 'POST',
    url: `${apiUrl}/auth/simple-login/`,
    body: {
      phoneLast4: testData.phone_last4,
      birthDate: testData.birth_date.slice(2).replace(/-/g, '') // '900101' 형식
    },
    failOnStatusCode: false
  }).then((response) => {
    if (response.status === 200 && response.body.success) {
      const userData = response.body.data.user
      Cypress.env('currentTestPatient', {
        id: userData.id || userData.user_id,
        email: userData.email,
        phone_last4: testData.phone_last4,
        birth_date: testData.birth_date
      })
      
      // 토큰 저장
      window.localStorage.setItem('accessToken', response.body.data.tokens.access)
      window.localStorage.setItem('refreshToken', response.body.data.tokens.refresh)
      window.localStorage.setItem('userRole', 'patient')
      
      cy.log(`테스트 환자 로그인 성공: ${userData.id || userData.user_id}`)
      return cy.wrap(userData)  // cy.wrap으로 감싸서 Cypress 체인에 포함
    } else {
      throw new Error('테스트 환자가 존재하지 않습니다. Django management command로 생성해주세요: python manage.py create_test_data')
    }
  })
})

// 테스트 약속(appointment) 데이터를 동적으로 생성하는 커맨드
Cypress.Commands.add('createDynamicAppointments', () => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:8000/api/v1'
  const userId = Cypress.env('currentTestPatient')?.id
  const timestamp = Date.now()
  
  if (!userId) {
    throw new Error('테스트 환자가 생성되지 않았습니다. createDynamicTestPatient를 먼저 실행하세요.')
  }
  
  const appointments = [
    {
      appointment_id: `apt-${timestamp}-1`,
      exam_id: 'xray',
      exam_name: 'X선 촬영',
      scheduled_at: new Date(Date.now() + 3600000).toISOString(), // 1시간 후
      status: 'scheduled',
      order: 1,
      user_id: userId
    },
    {
      appointment_id: `apt-${timestamp}-2`,
      exam_id: 'blood-test',
      exam_name: '혈액검사',
      scheduled_at: new Date(Date.now() + 5400000).toISOString(), // 1.5시간 후
      status: 'scheduled',
      order: 2,
      user_id: userId
    },
    {
      appointment_id: `apt-${timestamp}-3`,
      exam_id: 'ultrasound',
      exam_name: '초음파검사',
      scheduled_at: new Date(Date.now() + 7200000).toISOString(), // 2시간 후
      status: 'scheduled',
      order: 3,
      user_id: userId
    },
    {
      appointment_id: `apt-${timestamp}-4`,
      exam_id: 'internal-medicine',
      exam_name: '내과 진료',
      scheduled_at: new Date(Date.now() + 9000000).toISOString(), // 2.5시간 후
      status: 'scheduled',
      order: 4,
      user_id: userId
    }
  ]
  
  return cy.request({
    method: 'POST',
    url: `${apiUrl}/queue/test/set-appointments/`,  // 정확한 API 경로
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json',
      'X-Test-Environment': 'cypress-e2e-test' // 테스트 환경 헤더 추가
    },
    body: {
      appointments: appointments
    }
  }).then((response) => {
    expect(response.status).to.eq(200)  // APIResponse.success는 200을 반환
    Cypress.env('currentTestAppointments', appointments)
    cy.log(`${appointments.length}개의 테스트 약속이 생성됨`)
    return cy.wrap(appointments)  // cy.wrap으로 감싸서 Cypress 체인에 포함
  })
})

// 테스트 데이터를 정리하는 커맨드
Cypress.Commands.add('cleanupTestData', () => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:8000/api/v1'
  const testPatient = Cypress.env('currentTestPatient')
  const testAppointments = Cypress.env('currentTestAppointments')
  
  // 약속 데이터 삭제
  if (testAppointments && testAppointments.length > 0) {
    testAppointments.forEach(appointment => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/appointments/${appointment.appointment_id}/`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('accessToken')}`,
          'X-Test-Environment': 'cypress-e2e-test' // 테스트 환경 헤더 추가
        },
        failOnStatusCode: false
      }).then(() => {
        cy.log(`약속 ${appointment.appointment_id} 삭제됨`)
      })
    })
  }
  
  // 환자 데이터 삭제
  if (testPatient && testPatient.id) {
    cy.request({
      method: 'DELETE',
      url: `${apiUrl}/test/delete-patient/${testPatient.id}/`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('accessToken')}`,
        'X-Test-Environment': 'cypress-e2e-test' // 테스트 환경 헤더 추가
      },
      failOnStatusCode: false
    }).then(() => {
      cy.log(`테스트 환자 ${testPatient.id} 삭제됨`)
    })
  }
  
  // 환경 변수 정리
  Cypress.env('currentTestPatient', null)
  Cypress.env('currentTestAppointments', null)
})

// 환자의 전체 여정 상태를 변경하는 커맨드 (개선된 버전)
Cypress.Commands.add('setPatientJourneyState', (state) => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:8000/api/v1'
  const accessToken = window.localStorage.getItem('accessToken')
  const userId = Cypress.env('currentTestPatient')?.id || Cypress.env('testUserId')
  
  if (!userId) {
    throw new Error('테스트 환자 ID가 없습니다. 로그인이나 환자 생성을 먼저 수행하세요.')
  }
  
  cy.request({
    method: 'POST',
    url: `${apiUrl}/test/set-patient-state/`,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: {
      state: state,
      user_id: userId
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    cy.log(`환자 상태가 ${state}로 변경됨`)
    cy.wait(1000) // 상태 변경 후 UI 업데이트 대기
  })
})

// 특정 검사의 대기열 상태를 변경하는 커맨드 (개선된 버전)
Cypress.Commands.add('setQueueState', (examId, queueState) => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:8000/api/v1'
  const accessToken = window.localStorage.getItem('accessToken')
  const userId = Cypress.env('currentTestPatient')?.id || Cypress.env('testUserId')
  
  if (!userId) {
    throw new Error('테스트 환자 ID가 없습니다. 로그인이나 환자 생성을 먼저 수행하세요.')
  }
  
  // 현재 약속에서 해당 검사의 appointment_id 찾기
  const appointments = Cypress.env('currentTestAppointments') || []
  const appointment = appointments.find(apt => apt.exam_id === examId)
  
  if (!appointment) {
    cy.log(`경고: ${examId}에 대한 약속이 없습니다. 대기열 상태를 설정할 수 없습니다.`)
    return
  }
  
  cy.request({
    method: 'POST',
    url: `${apiUrl}/test/set-queue-state/`,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Test-Environment': 'cypress-e2e-test' // 테스트 환경 헤더 추가
    },
    body: {
      exam_id: examId,
      queue_state: queueState,
      user_id: userId,
      appointment_id: appointment.appointment_id
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    cy.log(`${examId} 대기열 상태가 ${queueState}로 변경됨`)
    cy.wait(500)
  })
})

// 테스트 환자의 당일 예약 정보를 설정하는 커맨드 (개선된 버전)
Cypress.Commands.add('setAppointments', (appointments) => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:8000/api/v1'
  const accessToken = window.localStorage.getItem('accessToken')
  const userId = Cypress.env('currentTestPatient')?.id || Cypress.env('testUserId')
  
  if (!userId) {
    throw new Error('테스트 환자 ID가 없습니다. 로그인이나 환자 생성을 먼저 수행하세요.')
  }
  
  // appointments가 빈 배열이면 모든 약속 삭제
  if (appointments.length === 0) {
    const currentAppointments = Cypress.env('currentTestAppointments') || []
    currentAppointments.forEach(apt => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/appointments/${apt.appointment_id}/`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        failOnStatusCode: false
      })
    })
    Cypress.env('currentTestAppointments', [])
    cy.log('모든 약속이 삭제됨')
    return
  }
  
  // 약속 추가 또는 업데이트
  cy.request({
    method: 'POST',
    url: `${apiUrl}/test/set-appointments/`,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: {
      appointments: appointments.map(apt => ({ ...apt, user_id: userId })),
      user_id: userId
    }
  }).then((response) => {
    expect(response.status).to.eq(200)
    Cypress.env('currentTestAppointments', appointments)
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

// 기본 테스트 예약 데이터 생성 헬퍼 (Deprecated - createDynamicAppointments 사용 권장)
Cypress.Commands.add('createDefaultAppointments', () => {
  cy.log('⚠️ createDefaultAppointments는 deprecated됩니다. createDynamicAppointments를 사용하세요.')
  return cy.createDynamicAppointments()
})

// 동적으로 테스트 환경을 설정하는 헬퍼
Cypress.Commands.add('setupTestEnvironment', () => {
  // 1. 테스트 환자로 로그인 (이미 createDynamicTestPatient에서 로그인됨)
  return cy.createDynamicTestPatient().then((patient) => {
    // 2. 약속 데이터 생성
    return cy.createDynamicAppointments()
  })
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