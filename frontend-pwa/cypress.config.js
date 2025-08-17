import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5174',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // 플러그인 이벤트 리스너 설정
    },
    env: {
      // API 베이스 URL
      apiUrl: 'http://localhost:8000/api/v1',
      // 테스트용 슈퍼유저 인증 정보
      testAdminEmail: 'admin@test.com',
      testAdminPassword: 'admin123',
      // 테스트용 환자 정보
      testPatientId: '',  // 테스트 실행 시 동적으로 설정
      testPatientPhone: '01012345678',
      testPatientBirthDate: '19900101'
    }
  }
})