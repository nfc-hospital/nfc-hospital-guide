import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import apiService from '../api/apiService';
import { authAPI, appointmentAPI, queueAPI, api } from '../api/client';

const useJourneyStore = create(
  devtools(
    persist(
      (set, get) => ({
        // 로딩 및 에러 상태
        isLoading: false,
        error: null,
        lastFetchTime: null,

        // NFC 태그된 장소 정보
        taggedLocationInfo: null,
        isTagLoading: false,
        tagError: null,

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
            ['waiting', 'called', 'ongoing'].includes(apt.status)
          );
          
          // 2. 큐에서 진행중인 것 찾기
          const activeQueue = queues.find(
            q => q.state === 'waiting' || q.state === 'ongoing'
          );
          
          return currentFromAppointments || activeQueue || null;
        },
        
        // 다음 검사 찾기 (환자 상태에 따라)
        getNextExam: () => {
          const { patientState, todaysAppointments } = get();
          const schedule = get().getTodaysScheduleForUI();
          
          // ✅ PAYMENT 상태: 수납창구를 목적지로
          if (patientState === 'PAYMENT') {
            return {
              exam_id: 'payment_desk',
              title: '수납창구',
              building: '본관',
              floor: '1',
              room: '원무과',
              department: '원무과',
              x_coord: 420,
              y_coord: 380,
              description: '수납창구에서 진료비를 수납해주세요'
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
              description: '모든 진료가 완료되었습니다. 안녕히 가세요.'
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
              description: '검사가 모두 완료되었습니다. 수납창구로 이동해주세요.'
            };
          }
          
          // ✅ CALLED, ONGOING 상태: 현재 진행 중인 검사를 목적지로
          if (patientState === 'CALLED' || patientState === 'ONGOING') {
            const currentExam = schedule.find(s => 
              s.status === 'called' || s.status === 'ongoing'
            );
            if (currentExam) {
              return currentExam.exam;
            }
          }
          
          // ✅ ARRIVED 상태: 원무과를 목적지로 (접수)
          if (patientState === 'ARRIVED') {
            return {
              exam_id: 'reception',
              title: '원무과',
              building: '본관',
              floor: '1',
              room: '접수창구',
              department: '원무과',
              x_coord: 500,
              y_coord: 330,
              description: '원무과에서 접수를 진행해주세요'
            };
          }
          
          // ✅ UNREGISTERED 상태: 병원 입구를 목적지로
          if (patientState === 'UNREGISTERED') {
            return {
              exam_id: 'main_entrance',
              title: '병원 입구',
              building: '본관',
              floor: '1',
              room: '로비',
              department: '출입구',
              x_coord: 150,
              y_coord: 400,
              description: '병원에 도착하시면 원무과로 이동해주세요'
            };
          }
          
          return null;
        },
        
        // 현재 단계 계산 (진행률 표시용)
        getCurrentStepIndex: () => {
          const schedule = get().getTodaysScheduleForUI();
          const currentStep = schedule.findIndex(s => 
            ['waiting', 'called', 'ongoing'].includes(s.status)
          );
          return currentStep === -1 ? 0 : currentStep;
        },
        
        // 대기 정보 계산
        getWaitingInfo: () => {
          const queues = get().currentQueues || [];
          const activeQueue = queues.find(
            q => q.state === 'waiting' || q.state === 'called' || q.state === 'ongoing'
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
          
          // tagId가 없으면 기존 위치 정보 유지, 있으면 초기화
          if (tagId) {
            set({ taggedLocationInfo: null });
          }
          
          try {
            // 1. 병렬로 사용자 프로필과 NFC 태그 정보 가져오기
            console.log('🔄 데이터 로딩 중...', tagId ? `태그 ID: ${tagId}` : '태그 없음');
            
            const apiCalls = [authAPI.getProfile()];
            
            // tagId가 있으면 태그 정보도 병렬로 조회
            if (tagId) {
              set({ isTagLoading: true, tagError: null });
              apiCalls.push(
                apiService.nfc.getTagInfo(tagId)
                  .catch(error => {
                    console.error('⚠️ NFC 태그 정보 조회 실패:', error);
                    set({ tagError: error.message });
                    return null;
                  })
              );
            }
            
            const responses = await Promise.all(apiCalls);
            const profileResponse = responses[0];
            console.log('📦 프로필 API 응답:', profileResponse);
            
            // NFC 태그 정보가 있다면 상태에 저장하고 현재 위치 업데이트
            if (tagId && responses.length > 1 && responses[1]) {
              // API 응답 구조 확인
              const tagResponse = responses[1];
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
            
            // API 응답 구조에 맞게 user 데이터 추출 - 실제 사용자 데이터는 data.user에 있음
            const userData = profileResponse.data?.user;
            
            if (!userData) {
              throw new Error("API 응답에서 사용자 정보를 찾을 수 없습니다.");
            }
            
            // user와 patientState, currentLocation을 올바르게 설정
            set({ 
              user: userData,
              patientState: userData.state || 'UNREGISTERED',
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
                        ]
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
                        ]
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
                        ]
                      },
                      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                      status: isPaymentState ? 'completed' : 'scheduled'
                    }
                  ];
                }
                
                console.log('📋 최종 appointments:', appointments);
                
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
                
                console.log('🔍 최종 currentQueues:', currentQueues);
                
                // 백엔드에서 exam 정보가 완전히 포함되어 오므로 추가 처리 불필요

                // appointments가 비어있으면 queue 데이터를 appointment 형태로 변환
                let finalAppointments = appointments;
                if (appointments.length === 0 && currentQueues.length > 0) {
                  finalAppointments = currentQueues.map(queue => ({
                    appointment_id: queue.appointment || `QUEUE_${queue.queue_id}`,
                    status: queue.state === 'waiting' ? 'waiting' : 
                           queue.state === 'called' ? 'ongoing' : queue.state,
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
                  queues: currentQueues
                });
                
                console.log('✅ 환자 여정 데이터 로드 완료');
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
            taggedLocationInfo: null,
            isTagLoading: false,
            tagError: null,
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