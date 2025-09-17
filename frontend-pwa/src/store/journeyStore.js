import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import apiService from '../api/apiService';
import { authAPI, appointmentAPI, queueAPI, api, nfcAPI } from '../api/client';
import useMapStore from './mapStore';
import useLocationStore from './locationStore';
// 🔧 상태 정규화 함수 추가
import { 
  normalizeQueueData, 
  normalizePatientState, 
  validateStateConsistency,
  loadStateDefinitions 
} from '../api/patientJourneyService';

const useJourneyStore = create(
  devtools(
    persist(
      (set, get) => ({
        // 로딩 및 에러 상태
        isLoading: false,
        error: null,
        lastFetchTime: null,

        // NFC 태그된 장소 정보는 locationStore로 이관됨

        // 사용자 정보
        user: null,
        patientState: null,

        // 예약 및 검사 정보
        appointments: [],
        currentAppointment: null,
        examProgress: null,

        // 대기열 정보
        queues: [],
        currentQueues: [],
        currentQueue: null,
        queuePosition: null,
        estimatedWaitTime: null,
        
        // 당일 예약 정보
        todaysAppointments: [],
        
        // 중앙화된 계산 값들
        nextExam: null,
        locationInfo: null,
        
        // === 계산된 상태(Selectors) - 무한 루프 방지를 위해 로직을 store로 중앙화 ===
        
        // UI용 오늘의 일정 포맷팅 (모든 화면에서 공통 사용)
        getTodaysScheduleForUI: () => {
          const appointments = get().todaysAppointments || [];
          return appointments.map((apt, index) => {
            // 장소 정보 생성 - room이 없으면 title 사용
            const building = apt.exam?.building || '본관';
            const floor = apt.exam?.floor ? `${apt.exam.floor}층` : '';
            const room = apt.exam?.room || apt.exam?.title || '';
            
            // 장소 문자열 조합 - 빈 값 제외하고 조합
            const locationParts = [building, floor, room].filter(part => part);
            const location = locationParts.length > 0 ? locationParts.join(' ') : '위치 미정';
            
            return {
              id: apt.appointment_id,
              examName: apt.exam?.title || `검사 ${index + 1}`,
              location: location,
              status: apt.status,
              description: apt.exam?.description,
              purpose: apt.exam?.description || '건강 상태 확인 및 진단',
              preparation: apt.status === 'pending' ? '검사 전 준비사항을 확인해주세요' : null,
              duration: apt.exam?.average_duration || 30,
              scheduled_at: apt.scheduled_at,
              department: apt.exam?.department,
              exam: apt.exam // 원본 exam 객체도 포함
            };
          });
        },
        
        // 현재 진행중인 작업 찾기
        getCurrentTask: () => {
          const appointments = get().todaysAppointments || [];
          const queues = get().currentQueues || [];
          
          // 1. appointments에서 진행중인 것 찾기
          const currentFromAppointments = appointments.find(apt => 
            ['waiting', 'called', 'in_progress'].includes(apt.status)
          );
          
          // 2. 큐에서 진행중인 것 찾기
          const activeQueue = queues.find(
            q => q.state === 'waiting' || q.state === 'in_progress'
          );
          
          return currentFromAppointments || activeQueue || null;
        },
        
        // 다음 검사 찾기 (환자 상태에 따라)
        getNextExam: () => {
          const { patientState, todaysAppointments } = get();
          const schedule = get().getTodaysScheduleForUI();
          
          console.log('🎯 [getNextExam] 디버깅 시작:');
          console.log('  👤 patientState:', patientState);
          console.log('  📅 todaysAppointments:', todaysAppointments?.length || 0);
          console.log('  📊 schedule:', schedule?.length || 0);
          
          // ✅ PAYMENT 상태: 수납창구를 목적지로
          if (patientState === 'PAYMENT') {
            console.log('  ✅ PAYMENT 상태 매칭 → 수납창구');
            return {
              exam_id: 'payment_desk',
              title: '수납창구',
              building: '본관',
              floor: '1',
              room: '원무과',
              department: '원무과',
              x_coord: 420,
              y_coord: 380,
              description: '수납창구에서 진료비를 수납해주세요',
              location_tag: { code: 'TAG004' } // 수납창구 태그
            };
          }
          
          // ✅ FINISHED 상태: 정문을 목적지로 (귀가)
          if (patientState === 'FINISHED') {
            return {
              exam_id: 'main_entrance',
              title: '정문',
              building: '본관',
              floor: '1',
              room: '로비',
              department: '출입구',
              x_coord: 150,
              y_coord: 400,
              description: '모든 진료가 완료되었습니다. 안녕히 가세요.',
              location_tag: { code: 'TAG005' } // 정문 출입구 태그
            };
          }
          
          // ✅ WAITING 상태: 대기 중인 검사를 목적지로
          if (patientState === 'WAITING') {
            // 현재 대기 중인 검사 찾기
            const waitingExam = schedule.find(s => s.status === 'waiting' || s.status === 'called');
            if (waitingExam) {
              return waitingExam.exam;
            }
            // 대기 중인 것이 없으면 첫 번째 검사
            return todaysAppointments?.[0]?.exam;
          }
          
          // ✅ REGISTERED 상태: 첫 번째 검사를 목적지로
          if (patientState === 'REGISTERED' || (patientState === 'COMPLETED' && schedule.length === 0)) {
            // 첫 번째 검사
            return todaysAppointments?.[0]?.exam;
          } 
          
          // ✅ COMPLETED 상태: 다음 검사를 목적지로
          if (patientState === 'COMPLETED') {
            // 완료된 검사 다음 것 찾기
            const completedCount = schedule.filter(s => s.status === 'completed').length;
            if (completedCount < todaysAppointments.length) {
              return todaysAppointments[completedCount]?.exam;
            }
            // 모든 검사가 완료되면 수납창구로
            return {
              exam_id: 'payment_desk',
              title: '수납창구',
              building: '본관',
              floor: '1',
              room: '원무과',
              department: '원무과',
              x_coord: 420,
              y_coord: 380,
              description: '검사가 모두 완료되었습니다. 수납창구로 이동해주세요.',
              location_tag: { code: 'TAG004' } // 수납창구 태그
            };
          }
          
          // ✅ CALLED, IN_PROGRESS 상태: 현재 진행 중인 검사를 목적지로
          if (patientState === 'CALLED' || patientState === 'IN_PROGRESS') {
            const currentExam = schedule.find(s => 
              s.status === 'called' || s.status === 'in_progress'
            );
            if (currentExam) {
              return currentExam.exam;
            }
          }
          
          // ✅ ARRIVED 상태: 원무과를 목적지로 (접수)
          if (patientState === 'ARRIVED') {
            console.log('  ✅ ARRIVED 상태 매칭 → 원무과');
            return {
              exam_id: 'reception',
              title: '원무과',
              building: '본관',
              floor: '1',
              room: '접수창구',
              department: '원무과',
              x_coord: 500,
              y_coord: 330,
              description: '원무과에서 접수를 진행해주세요',
              location_tag: { code: 'TAG006' } // 원무과 접수창구 태그
            };
          }
          
          // ✅ UNREGISTERED 상태: 병원 입구를 목적지로
          if (patientState === 'UNREGISTERED') {
            console.log('  ✅ UNREGISTERED 상태 매칭 → 병원 입구');
            return {
              exam_id: 'main_entrance',
              title: '병원 입구',
              building: '본관',
              floor: '1',
              room: '로비',
              department: '출입구',
              x_coord: 150,
              y_coord: 400,
              description: '병원에 도착하시면 원무과로 이동해주세요',
              location_tag: { code: 'TAG005' } // 정문 출입구 태그
            };
          }
          
          console.log('  ⚠️ 어떤 조건도 매칭되지 않음 - null 반환');
          return null;
        },
        
        // 현재 단계 계산 (진행률 표시용)
        getCurrentStepIndex: () => {
          const schedule = get().getTodaysScheduleForUI();
          const currentStep = schedule.findIndex(s => 
            ['waiting', 'called', 'in_progress'].includes(s.status)
          );
          return currentStep === -1 ? 0 : currentStep;
        },
        
        // 대기 정보 계산
        getWaitingInfo: () => {
          const queues = get().currentQueues || [];
          const activeQueue = queues.find(
            q => q.state === 'waiting' || q.state === 'called' || q.state === 'in_progress'
          );
          
          if (activeQueue) {
            return {
              peopleAhead: activeQueue.queue_number - 1 || 0,
              estimatedTime: activeQueue.estimated_wait_time || 15,
              queueNumber: activeQueue.queue_number,
              priority: activeQueue.priority
            };
          }
          
          return null;
        },
        
        // 완료된 검사 통계
        getCompletionStats: () => {
          const schedule = get().getTodaysScheduleForUI();
          // completed 또는 examined 상태를 모두 완료로 처리
          const completed = schedule.filter(s => 
            s.status === 'completed' || s.status === 'examined'
          );
          const total = schedule.length;
          
          return {
            completedCount: completed.length,
            totalCount: total,
            completedAppointments: completed,
            remainingCount: total - completed.length,
            progressPercentage: total > 0 ? Math.round((completed.length / total) * 100) : 0
          };
        },


        // 알림 설정
        notificationSettings: null,
        
        // 실시간 업데이트를 위한 폴링 ID
        pollingInterval: null,

        // 관리자 대시보드 데이터
        adminDashboardData: null,
        isAdminLoading: false,
        adminError: null,

        // 메인 데이터 페칭 함수 - 역할에 따른 선택적 로딩
        fetchJourneyData: async (tagId = null) => {
          set({ isLoading: true, error: null });
          
          // 🔧 상태 정의 로드 (최초 1회만)
          try {
            await loadStateDefinitions();
          } catch (error) {
            console.warn('상태 정의 로드 실패, fallback 사용:', error);
          }
          
          // tagId가 없으면 기존 위치 정보 유지, 있으면 초기화
          if (tagId) {
            set({ taggedLocationInfo: null });
          }
          
          try {
            // 1. 인증 상태 확인 (토큰 존재 여부로 판단)
            const isAuthenticated = !!localStorage.getItem('access_token');
            console.log('🔄 데이터 로딩 중...', tagId ? `태그 ID: ${tagId}` : '태그 없음', `인증 상태: ${isAuthenticated}`);
            
            const apiCalls = [];
            let profileResponse = null;
            
            // 인증된 사용자만 프로필 조회
            if (isAuthenticated) {
              apiCalls.push(authAPI.getProfile());
            }
            
            // tagId가 있으면 태그 정보 조회 (인증 여부 무관)
            if (tagId) {
              set({ isTagLoading: true, tagError: null });
              const tagApiCall = apiService.nfc.getTagInfo(tagId)
                .catch(error => {
                  console.error('⚠️ NFC 태그 정보 조회 실패:', error);
                  set({ tagError: error.message });
                  return null;
                });
              
              if (isAuthenticated) {
                apiCalls.push(tagApiCall);
              } else {
                // 비로그인 사용자는 태그 정보만 조회
                apiCalls.push(tagApiCall);
              }
            }
            
            const responses = await Promise.all(apiCalls);
            
            // 인증된 사용자의 경우 첫 번째 응답이 프로필
            if (isAuthenticated && responses.length > 0) {
              profileResponse = responses[0];
              console.log('📦 프로필 API 응답:', profileResponse);
            } else {
              console.log('👤 비로그인 사용자 - 프로필 조회 건너뛰기');
            }
            
            // NFC 태그 정보 처리 (인증 여부에 따라 응답 위치 다름)
            const tagResponseIndex = isAuthenticated ? 1 : 0;
            if (tagId && responses.length > tagResponseIndex && responses[tagResponseIndex]) {
              // API 응답 구조 확인
              const tagResponse = responses[tagResponseIndex];
              console.log('📡 태그 정보 API 응답:', tagResponse);
              
              // data 또는 직접 응답 처리
              const tagInfo = tagResponse.data || tagResponse;
              
              set({ 
                taggedLocationInfo: tagInfo,
                isTagLoading: false
              });
              
              // mapStore 업데이트는 subscribe 감시자가 자동으로 처리
              console.log('✅ NFC 태그 정보 업데이트 완료:', tagInfo);
            } else if (tagId) {
              set({ isTagLoading: false });
            }
            
            // 인증된 사용자만 프로필 데이터 처리
            if (!isAuthenticated) {
              console.log('👤 비로그인 사용자 - 기본 상태로 설정');
              set({ 
                user: null,
                patientState: 'UNREGISTERED',
                isLoading: false 
              });
              return { success: true, isGuest: true };
            }
            
            // API 응답 구조에 맞게 user 데이터 추출 - 실제 사용자 데이터는 data.user에 있음
            const userData = profileResponse.data?.user;
            
            if (!userData) {
              throw new Error("API 응답에서 사용자 정보를 찾을 수 없습니다.");
            }
            
            // user와 patientState, currentLocation을 올바르게 설정
            set({ 
              user: userData,
              patientState: normalizePatientState(userData.state) || 'UNREGISTERED',
              // 프로필 API에서 currentLocation이 오면 설정
              // currentLocation은 mapStore에서 별도 관리
            });
            console.log('✅ 사용자 프로필 로드 완료:', userData.role, '상태:', userData.state, '위치:', userData.currentLocation);

            // 2. 역할에 따른 추가 데이터 로딩
            if (userData.role === 'patient') {
              // 환자인 경우에만 여정 데이터 로드
              console.log('🔄 환자 여정 데이터 로딩 중...');
              try {
                // 개별 API 호출로 환자 데이터 가져오기 
                const [scheduleRes, queuesRes] = await Promise.all([
                  // /schedule/today API 사용 (Home.jsx와 동일)
                  api.get('/schedule/today').catch(() => ({ data: { appointments: [] } })),
                  queueAPI.getMyQueue().catch(() => ({ data: [] }))
                ]);

                // 디버깅 로그 추가
                console.log('📋 schedule API 응답:', scheduleRes);
                console.log('🔍 queue API 응답:', queuesRes);

                // API 명세서에 따른 데이터 구조 파싱
                // 1. 스케줄 API: /api/v1/schedule/today
                // axios 인터셉터가 이미 response.data를 반환하므로
                const scheduleData = scheduleRes;
                let queuesData = queuesRes;
                
                // appointments 배열 확인 - 직접 응답 또는 data 속성에서 가져오기
                let appointments = scheduleData?.appointments || scheduleData?.data?.appointments || [];
                
                // 실제 API 응답 확인을 위한 로그
                console.log('🔍 실제 API appointments 데이터:', appointments);
                console.log('🔍 appointments.length:', appointments.length);
                
                // 개발 환경에서 테스트 데이터 추가
                const currentPatientState = get().patientState;
                if (import.meta.env.DEV && appointments.length === 0) {
                  console.log('🧪 개발 환경: 테스트 데이터 추가 (상태:', currentPatientState, ')');
                  
                  // PAYMENT 상태일 때는 완료된 검사 데이터
                  const isPaymentState = currentPatientState === 'PAYMENT';
                  
                  appointments = [
                    {
                      appointment_id: 'dev-001',
                      exam: {
                        exam_id: 'blood_test',
                        title: '혈액검사',
                        building: '본관',
                        floor: '1',
                        room: '채혈실',
                        department: '진단검사의학과',
                        average_duration: 15,
                        x_coord: 507,
                        y_coord: 230,
                        preparations: [
                          {
                            prep_id: 1,
                            type: 'fasting',
                            title: '검사 전날 밤 10시 이후 금식',
                            description: '정확한 검사를 위해 전날 밤 10시 이후 음식물 섭취를 중단해주세요.',
                            is_required: true
                          },
                          {
                            prep_id: 2,
                            type: 'documents',
                            title: '신분증 및 건강보험증 지참',
                            description: '본인 확인을 위해 신분증과 건강보험증을 반드시 지참해주세요.',
                            is_required: true
                          }
                        ],
                        location_tag: { code: 'TAG002' }  // 2층 내과 진료실 (채혈실)
                      },
                      scheduled_at: new Date().toISOString(),
                      status: isPaymentState ? 'completed' : 'scheduled'
                    },
                    {
                      appointment_id: 'dev-002',
                      exam: {
                        exam_id: 'urine_test',
                        title: '소변검사',
                        building: '본관',
                        floor: '1',
                        room: '검체채취실',
                        department: '진단검사의학과',
                        average_duration: 10,
                        x_coord: 507,
                        y_coord: 190,
                        preparations: [
                          {
                            prep_id: 5,
                            type: 'hydration',
                            title: '충분한 수분 섭취',
                            description: '검사 2시간 전부터 물을 충분히 마셔주세요. 소변 채취가 원활해집니다.',
                            is_required: false
                          },
                          {
                            prep_id: 6,
                            type: 'collection',
                            title: '중간뇨 채취',
                            description: '처음 나오는 소변은 버리고 중간 부분의 소변을 채취해주세요.',
                            is_required: true
                          }
                        ],
                        location_tag: { code: 'TAG002' }  // 2층 내과 진료실 (검체채취실)
                      },
                      scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                      status: isPaymentState ? 'completed' : 'scheduled'
                    },
                    {
                      appointment_id: 'dev-003',
                      exam: {
                        exam_id: 'xray_chest',
                        title: '흉부 X-ray',
                        building: '본관',
                        floor: '2',
                        room: '영상의학과',
                        department: '영상의학과',
                        average_duration: 10,
                        x_coord: 400,
                        y_coord: 300,
                        preparations: [
                          {
                            prep_id: 7,
                            type: 'clothing',
                            title: '금속 제거',
                            description: '정확한 영상 촬영을 위해 목걸이, 귀걸이 등 금속 액세서리를 제거해주세요.',
                            is_required: true
                          },
                          {
                            prep_id: 8,
                            type: 'general',
                            title: '임신 가능성 확인',
                            description: '임신 가능성이 있는 경우 반드시 의료진에게 알려주세요.',
                            is_required: false
                          }
                        ],
                        location_tag: { code: 'TAG003' }  // 2층 X-Ray실
                      },
                      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                      status: isPaymentState ? 'completed' : 'scheduled'
                    }
                  ];
                }
                
                // Appointment 상태도 정규화 (ongoing -> in_progress)
                const normalizeAppointmentStatus = (status) => {
                  if (status === 'ongoing') return 'in_progress';
                  return status;
                };
                
                appointments = appointments.map(apt => ({
                  ...apt,
                  status: normalizeAppointmentStatus(apt.status)
                }));
                
                console.log('📋 최종 appointments (정규화 후):', appointments);
                
                // 2. 큐 API: /api/v1/queue/my-current/  
                // queuesRes는 axios 인터셉터로 인해 이미 data 부분만 반환됨
                const queueData = queuesRes;
                let currentQueues = [];
                
                if (queueData?.results && Array.isArray(queueData.results)) {
                  // Django pagination 응답 구조 (/queue/my-current/ 응답)
                  currentQueues = queueData.results;
                } else if (Array.isArray(queueData)) {
                  currentQueues = queueData;
                } else if (queueData) {
                  currentQueues = [queueData];
                }
                
                // 🔧 새로운 정규화 함수 적용
                currentQueues = normalizeQueueData(currentQueues);
                
                // 상태 일관성 체크 (개발 환경에서만)
                if (import.meta.env.DEV) {
                  const consistency = validateStateConsistency(userData?.state, currentQueues);
                  if (!consistency.isValid) {
                    console.warn('⚠️ 상태 불일치 감지:', consistency.issues);
                  }
                }
                
                console.log('🔍 최종 currentQueues (정규화 후):', currentQueues);
                
                // ✅ --- 환자 상태 계산 로직 (큐와 예약 데이터 기반) ---
                // 환자 여정: UNREGISTERED -> ARRIVED -> REGISTERED -> WAITING -> CALLED -> IN_PROGRESS -> COMPLETED -> PAYMENT -> FINISHED
                
                // 1. 프로필 API의 기본 상태에서 시작 (userData는 위에서 정의됨)
                // userData.state를 사용하거나, 이미 설정된 현재 store의 patientState 사용
                const currentStoreState = get().patientState;
                const profileState = userData?.state || currentStoreState || 'UNREGISTERED';
                let computedState = profileState;
                
                console.log(`🔍 상태 계산 시작 - profileState: ${profileState}, currentStoreState: ${currentStoreState}`);
                
                // 2. 상태별 계산 로직
                if (profileState === 'UNREGISTERED' || profileState === 'ARRIVED') {
                  // 접수 전 상태는 그대로 유지 (큐와 무관)
                  computedState = profileState;
                  console.log(`🏥 접수 전 상태 유지: ${computedState}`);
                  console.log(`   - 큐가 ${currentQueues.length}개 있지만 무시됨 (접수 전이므로)`);
                  
                } else if (profileState === 'REGISTERED' || profileState === 'WAITING' || 
                          profileState === 'CALLED' || profileState === 'IN_PROGRESS' || 
                          profileState === 'COMPLETED') {
                  // 접수 후 상태에서만 큐 상태 확인
                  
                  // 여러 큐 중에서 현재 진행 중인 큐 찾기 (순차적 처리)
                  // 1. in_progress가 있으면 최우선
                  // 2. called가 있으면 그 다음
                  // 3. waiting 중 첫 번째 큐
                  
                  const inProgressQueue = currentQueues.find(q => q.state === 'in_progress');
                  const calledQueue = currentQueues.find(q => q.state === 'called');
                  const waitingQueues = currentQueues.filter(q => q.state === 'waiting');
                  const completedQueues = currentQueues.filter(q => q.state === 'completed');
                  
                  let activeQueue = null;
                  
                  if (inProgressQueue) {
                    activeQueue = inProgressQueue;
                    computedState = 'IN_PROGRESS';
                    console.log(`🏃 진행 중인 검사: ${activeQueue.exam?.title || '검사'}`);
                    
                  } else if (calledQueue) {
                    activeQueue = calledQueue;
                    computedState = 'CALLED';
                    console.log(`📢 호출된 검사: ${activeQueue.exam?.title || '검사'}`);
                    
                  } else if (waitingQueues.length > 0) {
                    // 첫 번째 대기 중인 큐를 활성 큐로
                    activeQueue = waitingQueues[0];
                    computedState = 'WAITING';
                    console.log(`⏳ 대기 중인 검사: ${activeQueue.exam?.title || '검사'} (대기 ${waitingQueues.length}개)`);
                    
                  } else if (completedQueues.length > 0 && appointments && appointments.length > 0) {
                    // 완료된 큐만 있는 경우
                    const totalAppointments = appointments.length;
                    const completedCount = completedQueues.length;
                    
                    if (completedCount < totalAppointments) {
                      // 아직 남은 검사가 있음 (다음 검사 대기)
                      computedState = 'COMPLETED';
                      console.log(`✅ 검사 진행 상황: ${completedCount}/${totalAppointments} 완료`);
                    } else {
                      // 모든 검사 완료
                      computedState = 'PAYMENT';
                      console.log(`💳 모든 검사 완료 (${completedCount}/${totalAppointments}) - 수납 대기`);
                    }
                    
                  } else if (appointments && appointments.length > 0) {
                    // 큐가 없지만 예약이 있는 경우 (예약 상태로 판단)
                    const completedCount = appointments.filter(apt => 
                      apt.status === 'completed' || apt.status === 'done'
                    ).length;
                    
                    if (completedCount === 0) {
                      // 아직 검사를 시작하지 않음
                      computedState = 'REGISTERED';
                      console.log(`📝 접수 완료 - 첫 검사 대기`);
                    } else if (completedCount < appointments.length) {
                      // 일부 검사 완료
                      computedState = 'COMPLETED';
                      console.log(`📋 예약 기반: ${completedCount}/${appointments.length} 완료`);
                    } else {
                      // 모든 검사 완료 -> 수납 대기
                      computedState = 'PAYMENT';
                      console.log(`💰 예약 기반: 모든 검사 완료 - 수납 대기`);
                    }
                    
                  } else {
                    // 큐도 없고 예약도 없으면 프로필 상태 유지
                    computedState = profileState;
                    console.log(`🔄 기본 상태 유지: ${computedState}`);
                  }
                  
                } else if (profileState === 'PAYMENT') {
                  // 수납 상태
                  computedState = 'PAYMENT';
                  console.log(`💳 수납 상태: ${computedState}`);
                  
                } else if (profileState === 'FINISHED') {
                  // 완료 상태
                  computedState = 'FINISHED';
                  console.log(`✅ 완료 상태: ${computedState}`);
                }
                
                const finalPatientState = computedState;
                console.log(`✅ 최종 환자 상태 결정: ${finalPatientState}`);
                
                // ARRIVED 상태일 때 디버깅
                if (finalPatientState === 'ARRIVED') {
                  console.log('🚨 ARRIVED 상태 확인:');
                  console.log('   - 원무과로 안내되어야 함');
                  console.log('   - 큐 상태와 무관하게 접수 필요');
                }
                
                // appointments가 비어있으면 queue 데이터를 appointment 형태로 변환
                let finalAppointments = appointments;
                
                // ✅ activeQueue를 먼저 정의 (nextExam 계산에서 사용하기 위해)
                const activeQueue = currentQueues.find(
                  q => q.state === 'in_progress' || q.state === 'called' || q.state === 'waiting'
                );
                
                // ✅ --- nextExam과 locationInfo 계산 (한 번에 처리) ---
                let nextExam = null;
                
                // 상태별 다음 목적지 계산
                switch(finalPatientState) {
                  case 'UNREGISTERED':
                    nextExam = {
                      exam_id: 'main_entrance',
                      title: '병원 입구',
                      building: '본관',
                      floor: '1',
                      room: '로비',
                      department: '출입구',
                      x_coord: 150,
                      y_coord: 400,
                      description: '병원에 도착하시면 원무과로 이동해주세요',
                      location_tag: { code: 'TAG001' }  // 접수처 태그 ID
                    };
                    break;
                    
                  case 'ARRIVED':
                    nextExam = {
                      exam_id: 'reception',
                      title: '원무과',
                      building: '본관',
                      floor: '1',
                      room: '접수창구',
                      department: '원무과',
                      x_coord: 500,
                      y_coord: 330,
                      description: '원무과에서 접수를 진행해주세요',
                      location_tag: { code: 'TAG001' }  // 접수처 태그 ID
                    };
                    break;
                    
                  case 'REGISTERED':
                    // 첫 번째 검사
                    nextExam = finalAppointments[0]?.exam || null;
                    break;
                    
                  case 'WAITING':
                  case 'CALLED':
                  case 'IN_PROGRESS':
                    // 현재 진행 중인 검사
                    console.log(`🔍 [${finalPatientState}] activeQueue:`, activeQueue);
                    console.log(`🔍 [${finalPatientState}] currentQueues:`, currentQueues);
                    
                    if (activeQueue && activeQueue.exam) {
                      nextExam = activeQueue.exam;
                      console.log(`✅ activeQueue에서 nextExam 설정:`, nextExam?.title);
                    } else {
                      // 대기 중인 첫 검사
                      const waitingAppointment = finalAppointments.find(apt => 
                        apt.status === 'waiting' || apt.status === 'scheduled'
                      );
                      nextExam = waitingAppointment?.exam || finalAppointments[0]?.exam;
                      console.log(`✅ appointment에서 nextExam 설정:`, nextExam?.title);
                    }
                    break;
                    
                  case 'COMPLETED':
                    // 다음 검사 찾기
                    const completedCount = finalAppointments.filter(apt => 
                      apt.status === 'completed' || apt.status === 'done'
                    ).length;
                    
                    if (completedCount < finalAppointments.length) {
                      // 다음 검사
                      nextExam = finalAppointments[completedCount]?.exam;
                    } else {
                      // 모든 검사 완료 -> 수납
                      nextExam = {
                        exam_id: 'payment_desk',
                        title: '수납창구',
                        building: '본관',
                        floor: '1',
                        room: '원무과',
                        department: '원무과',
                        x_coord: 420,
                        y_coord: 380,
                        description: '검사가 모두 완료되었습니다. 수납창구로 이동해주세요.',
                        location_tag: { code: 'TAG001' }  // 접수처 태그 ID (수납창구도 원무과에 있음)
                      };
                    }
                    break;
                    
                  case 'PAYMENT':
                    nextExam = {
                      exam_id: 'payment_desk',
                      title: '수납창구',
                      building: '본관',
                      floor: '1',
                      room: '원무과',
                      department: '원무과',
                      x_coord: 420,
                      y_coord: 380,
                      description: '수납창구에서 진료비를 수납해주세요',
                      location_tag: { code: 'TAG001' }  // 접수처 태그 ID (수납창구도 원무과에 있음)
                    };
                    break;
                    
                  case 'FINISHED':
                    nextExam = {
                      exam_id: 'main_entrance',
                      title: '정문',
                      building: '본관',
                      floor: '1',
                      room: '로비',
                      department: '출입구',
                      x_coord: 150,
                      y_coord: 400,
                      description: '모든 진료가 완료되었습니다. 안녕히 가세요.',
                      location_tag: { code: 'TAG001' }  // 접수처 태그 ID (정문 근처)
                    };
                    break;
                }
                
                // locationInfo 생성 (nextExam 기반)
                const locationInfo = nextExam ? {
                  name: nextExam.title,
                  building: nextExam.building || '본관',
                  floor: nextExam.floor ? `${nextExam.floor}층` : '1층',
                  room: nextExam.room || nextExam.title,
                  department: nextExam.department || '',
                  description: nextExam.description,
                  x_coord: nextExam.x_coord,
                  y_coord: nextExam.y_coord,
                  mapId: `${(nextExam.building || 'main').toLowerCase().replace(' ', '_')}_${nextExam.floor || '1'}f`,
                  exam: nextExam
                } : null;
                
                console.log(`📍 다음 목적지: ${nextExam?.title || '없음'}`);
                // ----------------------------------------------------
                
                // 백엔드에서 exam 정보가 완전히 포함되어 오므로 추가 처리 불필요
                
                // ✨ 큐 상태와 appointments 상태 동기화
                // activeQueue가 있으면 해당하는 appointment의 status도 업데이트
                if (activeQueue && activeQueue.state && finalAppointments.length > 0) {
                  const appointmentToUpdate = finalAppointments.find(
                    apt => apt.appointment_id === activeQueue.appointment || 
                           apt.exam?.exam_id === activeQueue.exam?.exam_id
                  );
                  
                  if (appointmentToUpdate) {
                    console.log(`🔄 [동기화] 예약 '${appointmentToUpdate.exam?.title}'의 상태를 '${activeQueue.state}'(으)로 업데이트합니다.`);
                    appointmentToUpdate.status = activeQueue.state; // 큐의 최신 상태로 동기화
                  }
                }
                if (appointments.length === 0 && currentQueues.length > 0) {
                  finalAppointments = currentQueues.map(queue => ({
                    appointment_id: queue.appointment || `QUEUE_${queue.queue_id}`,
                    status: queue.state === 'waiting' ? 'waiting' : 
                           queue.state === 'called' ? 'called' : 
                           queue.state === 'in_progress' ? 'in_progress' : queue.state,
                    scheduled_at: queue.created_at,
                    exam: queue.exam,
                    queue_info: {
                      queue_number: queue.queue_number,
                      estimated_wait_time: queue.estimated_wait_time,
                      priority: queue.priority
                    }
                  }));
                  console.log('📋 appointments가 비어있어서 queue 데이터로 생성:', finalAppointments);
                }

                set({
                  todaysAppointments: finalAppointments,
                  currentQueues: currentQueues,
                  appointments: finalAppointments,
                  queues: currentQueues,
                  patientState: finalPatientState,  // ✅ 최종 결정된 상태로 업데이트
                  nextExam: nextExam,  // ✅ 계산된 다음 목적지
                  locationInfo: locationInfo  // ✅ 계산된 위치 정보
                });
                
                console.log('✅ 환자 여정 데이터 로드 완료');
                
                // ✅ 모든 데이터와 상태가 준비된 후, mapStore에 경로 계산을 명령
                // Race condition 방지를 위해 여기서 직접 호출
                try {
                  const { default: useMapStore } = await import('./mapStore');
                  const mapStore = useMapStore.getState();
                  
                  // navigationMode가 'explore'가 아닐 때만 자동 경로 계산
                  if (mapStore.navigationMode !== 'explore') {
                    const currentLocation = get().taggedLocationInfo || {
                      x_coord: 150,
                      y_coord: 400,
                      building: '본관',
                      floor: '1',
                      room: '정문 로비'
                    };
                    
                    console.log('🗺️ journeyStore에서 mapStore 경로 업데이트 요청');
                    await mapStore.updateRouteBasedOnLocation(currentLocation);
                  }
                } catch (mapError) {
                  console.warn('⚠️ mapStore 경로 업데이트 실패 (정상적일 수 있음):', mapError);
                }
              } catch (patientError) {
                console.warn('⚠️ 환자 데이터 로드 실패 (정상적일 수 있음):', patientError);
                // 환자 데이터 로드 실패는 에러로 처리하지 않음
              }
            } else if (['staff', 'dept', 'super'].includes(userData.role)) {
              // 관리자 역할인 경우 - 추후 관리자용 데이터 로드 로직 추가 가능
              console.log('✅ 관리자 계정 확인됨:', userData.role);
              // 관리자용 대시보드 데이터는 별도로 로드하지 않음
              // 필요시 여기에 관리자용 통계 데이터 등을 로드할 수 있음
            }
            
            set({ 
              isLoading: false,
              lastFetchTime: new Date().toISOString(),
            });

            return { user: userData };
          } catch (error) {
            console.error('❌ 데이터 로드 실패:', error);
            set({ 
              error: error.message || '데이터를 불러올 수 없습니다',
              isLoading: false 
            });
            throw error;
          }
        },

        // 환자 상태 업데이트
        updatePatientState: async (newState) => {
          try {
            const response = await apiService.updatePatientState(newState);
            set({ patientState: response.state });
            return response;
          } catch (error) {
            console.error('Failed to update patient state:', error);
            set({ error: error.message });
            throw error;
          }
        },

        // 대기열 체크인
        checkInQueue: async (queueId) => {
          try {
            const response = await apiService.checkInQueue(queueId);
            await get().fetchJourneyData(); // 전체 데이터 새로고침
            return response;
          } catch (error) {
            console.error('Failed to check in queue:', error);
            set({ error: error.message });
            throw error;
          }
        },

        // 호출 확인
        acknowledgeCall: async (queueId) => {
          try {
            const response = await apiService.acknowledgeCall(queueId);
            await get().fetchJourneyData(); // 전체 데이터 새로고침
            return response;
          } catch (error) {
            console.error('Failed to acknowledge call:', error);
            set({ error: error.message });
            throw error;
          }
        },


        // 알림 설정 업데이트
        updateNotificationSettings: async (settings) => {
          try {
            const response = await apiService.updateNotificationSettings(settings);
            set({ notificationSettings: response.settings });
            return response;
          } catch (error) {
            console.error('Failed to update notification settings:', error);
            set({ error: error.message });
            throw error;
          }
        },

        // 실시간 업데이트 시작 (5초 간격)
        startPolling: () => {
          const interval = setInterval(() => {
            get().fetchJourneyData();
          }, 5000);
          
          set({ pollingInterval: interval });
        },

        // 실시간 업데이트 중지
        stopPolling: () => {
          const interval = get().pollingInterval;
          if (interval) {
            clearInterval(interval);
            set({ pollingInterval: null });
          }
        },

        // 전체 상태 초기화 (로그아웃 시)
        clearJourneyData: () => {
          get().stopPolling();
          
          set({
            isLoading: false,
            error: null,
            lastFetchTime: null,
            user: null,
            patientState: null,
            appointments: [],
            todaysAppointments: [],
            currentAppointment: null,
            examProgress: null,
            queues: [],
            currentQueues: [],
            currentQueue: null,
            queuePosition: null,
            estimatedWaitTime: null,
            notificationSettings: null,
            pollingInterval: null,
          });
        },

        // 에러 상태 클리어
        clearError: () => {
          set({ error: null });
        },

        // NFC 태그 정보만 별도로 가져오기
        fetchTagInfo: async (tagId) => {
          if (!tagId) return null;
          
          set({ isTagLoading: true, tagError: null });
          
          try {
            const response = await apiService.nfc.getTagInfo(tagId);
            const tagInfo = response.data;
            
            set({ 
              taggedLocationInfo: tagInfo,
              isTagLoading: false
            });
            console.log('✅ NFC 태그 정보 업데이트 완료:', tagInfo);
            return tagInfo;
          } catch (error) {
            console.error('❌ NFC 태그 정보 로드 실패:', error);
            set({ 
              tagError: error.message || 'NFC 태그 정보를 불러올 수 없습니다',
              isTagLoading: false 
            });
            throw error;
          }
        },

        // NFC 태그 정보 초기화
        clearTagInfo: () => {
          set({ 
            taggedLocationInfo: null,
            isTagLoading: false,
            tagError: null,
            // 현재 위치는 유지 (완전히 초기화하지 않음)
          });
        },

        // 실시간 경로 탐색 (새로운 백엔드 API 사용)
        navigateToDestination: async () => {
          // 출발지는 locationStore에서 가져옵니다.
          const startLocation = useLocationStore.getState().getCurrentLocation(); 

          // 목적지는 journeyStore의 진료 여정에서 가져옵니다.
          const destinationExam = get().getNextExam();
          
          console.log('🔍 [navigateToDestination] 디버깅 정보:');
          console.log('📍 현재 위치 전체:', startLocation);
          console.log('📍 현재 위치 코드들:', {
            code: startLocation?.code,
            tag_code: startLocation?.tag_code,
            tag_id: startLocation?.tag_id,
            location_tag: startLocation?.location_tag
          });
          console.log('🎯 목적지 검사 전체:', destinationExam);
          console.log('🎯 목적지 location_tag:', destinationExam?.location_tag);
          console.log('👤 환자 상태:', get().patientState);
          console.log('📊 전체 journeyStore 상태:', {
            user: get().user?.name,
            patientState: get().patientState,
            todaysAppointments: get().todaysAppointments?.length
          });

          // 방어 코드: 출발지나 목적지 정보가 없으면 API를 호출하지 않습니다.
          const startTagCode = useLocationStore.getState().getCurrentTagCode();
          if (!startTagCode) {
            console.error("출발지 정보가 없습니다. NFC를 먼저 스캔하세요.");
            console.error("디버깅: startLocation =", startLocation);
            console.error("디버깅: startTagCode =", startTagCode);
            set({ error: "현재 위치 정보가 없습니다. NFC 태그를 스캔해주세요." });
            return;
          }
          
          if (!destinationExam?.location_tag?.code) {
            console.error(`다음 목적지(${destinationExam?.title || '알수없음'})의 위치가 설정되지 않았습니다.`);
            set({ error: `목적지 정보를 찾을 수 없습니다: ${destinationExam?.title || '알수없음'}` });
            return;
          }

          const start_tag_code = startTagCode;
          const destination_tag_code = destinationExam.location_tag.code;

          console.log(`🚀 API 호출 준비: ${start_tag_code} -> ${destination_tag_code}`);
          
          // 같은 위치로 가려고 하는 경우 경고
          if (start_tag_code === destination_tag_code) {
            console.warn(`⚠️ 출발지와 목적지가 같습니다: ${start_tag_code}`);
            set({ error: "이미 목적지에 도착했습니다." });
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const pathData = await nfcAPI.navigatePath(start_tag_code, destination_tag_code);
            
            console.log('✅ 경로 탐색 성공:', pathData);
            useMapStore.getState().setNavigationPath(pathData);
            set({ navigationData: pathData });
          } catch (error) {
            console.error('⚠️ 경로 탐색 API 호출 실패:', error);
            set({ error: '경로를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.' });
            // 필요 시 여기에 폴백 로직을 추가할 수 있습니다.
          } finally {
            set({ isLoading: false });
          }
        },

        // NFC 스캔 후 자동 경로 탐색 (이제 locationStore와 협업)
        handleNFCScanWithNavigation: async (tagId) => {
          try {
            // 1. 태그 정보 가져오기
            const tagInfo = await get().fetchTagInfo(tagId);
            
            if (tagInfo) {
              // 2. locationStore에 현재 위치 업데이트
              useLocationStore.getState().setCurrentLocation(tagInfo);
              
              // 3. 로그인된 환자일 경우에만 경로 탐색 시작
              if (get().user) {
                await get().navigateToDestination();
              } else {
                console.log('🚫 비로그인 사용자 - 경로 탐색 생략');
              }
            }
            
            return tagInfo;
          } catch (error) {
            console.error('❌ NFC 스캔 및 경로 탐색 실패:', error);
            throw error;
          }
        },

        // 관리자 대시보드 데이터 가져오기
        fetchAdminDashboardData: async () => {
          set({ isAdminLoading: true, adminError: null });
          
          try {
            console.log('🔄 관리자 대시보드 데이터 로딩 중...');
            const dashboardData = await apiService.adminDashboard.getSummary();
            
            set({
              adminDashboardData: dashboardData,
              isAdminLoading: false,
              adminError: null,
            });
            
            console.log('✅ 관리자 대시보드 데이터 로드 완료');
            return dashboardData;
          } catch (error) {
            console.error('❌ 관리자 대시보드 데이터 로드 실패:', error);
            set({
              adminError: error.message || '대시보드 데이터를 불러올 수 없습니다',
              isAdminLoading: false,
            });
            throw error;
          }
        },

        // 관리자 대시보드 데이터 초기화
        clearAdminDashboardData: () => {
          set({
            adminDashboardData: null,
            isAdminLoading: false,
            adminError: null,
          });
        },
      }),
      {
        name: 'journey-storage',
        partialize: (state) => ({
          // 로컬 스토리지에 저장할 항목들
          user: state.user,
          patientState: state.patientState,
          notificationSettings: state.notificationSettings,
          lastFetchTime: state.lastFetchTime,
        }),
      }
    )
  )
);

// ✅ 위치 변경 감시자 설정 (Store 간 협업)
// 이전 위치를 저장할 변수
let previousLocationInfo = null;
let previousMapLocation = null; // 지도 변경 감지용

// journeyStore의 taggedLocationInfo 변경 감시
useJourneyStore.subscribe(
  (state) => state.taggedLocationInfo,
  (taggedLocationInfo) => {
    // 위치가 변경되었을 때만 실행
    if (taggedLocationInfo && taggedLocationInfo !== previousLocationInfo) {
      console.log('📍 위치 변경 감지:', {
        이전: previousLocationInfo,
        현재: taggedLocationInfo
      });
      
      // mapStore의 현재 위치 업데이트 및 경로 재계산
      import('./mapStore').then(({ default: useMapStore }) => {
        const mapStore = useMapStore.getState();
        
        // ✅ 안전장치: '탐색 모드'일 때는 자동 경로 업데이트 스킵
        if (mapStore.navigationMode === 'explore') {
          console.log('🚫 탐색 모드 중이므로 자동 경로 업데이트 스킵');
          return;
        }
        
        // 1. 현재 위치 업데이트
        mapStore.updateCurrentLocation({
          x_coord: taggedLocationInfo.x_coord,
          y_coord: taggedLocationInfo.y_coord,
          building: taggedLocationInfo.building,
          floor: taggedLocationInfo.floor,
          room: taggedLocationInfo.room,
          description: taggedLocationInfo.description
        });
        
        // 2. 새로운 위치 기반으로 경로 자동 업데이트
        mapStore.updateRouteBasedOnLocation({
          x_coord: taggedLocationInfo.x_coord,
          y_coord: taggedLocationInfo.y_coord,
          building: taggedLocationInfo.building,
          floor: taggedLocationInfo.floor,
          room: taggedLocationInfo.room,
          description: taggedLocationInfo.description
        });
        
        // 3. 건물/층이 변경되었으면 새로운 지도 로드
        if (!previousMapLocation || 
            previousMapLocation.building !== taggedLocationInfo.building ||
            previousMapLocation.floor !== taggedLocationInfo.floor) {
          console.log('🗺️ 지도 변경 필요:', {
            이전: previousMapLocation,
            현재: { 
              building: taggedLocationInfo.building, 
              floor: taggedLocationInfo.floor 
            }
          });
          mapStore.loadMapForLocation(taggedLocationInfo);
          previousMapLocation = {
            building: taggedLocationInfo.building,
            floor: taggedLocationInfo.floor
          };
        }
      });
      
      // 이전 위치 업데이트
      previousLocationInfo = taggedLocationInfo;
    }
  }
);

export default useJourneyStore;