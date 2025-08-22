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

        // 위치 정보
        currentLocation: null,
        navigationRoute: null,

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
                currentLocation: {
                  building: tagInfo.building,
                  floor: tagInfo.floor,
                  room: tagInfo.room,
                  x_coord: tagInfo.x_coord,
                  y_coord: tagInfo.y_coord,
                  description: tagInfo.description,
                  timestamp: new Date().toISOString()
                },
                isTagLoading: false
              });
              console.log('✅ NFC 태그 정보 및 현재 위치 업데이트 완료:', {
                taggedLocationInfo: tagInfo,
                currentLocation: get().currentLocation
              });
            } else if (tagId) {
              set({ isTagLoading: false });
            }
            
            // API 응답 구조에 맞게 user 데이터 추출 - 실제 사용자 데이터는 data.user에 있음
            const userData = profileResponse.data?.user;
            
            if (!userData) {
              throw new Error("API 응답에서 사용자 정보를 찾을 수 없습니다.");
            }
            
            // user와 patientState를 올바르게 설정
            set({ 
              user: userData,
              patientState: userData.state || 'UNREGISTERED'
            });
            console.log('✅ 사용자 프로필 로드 완료:', userData.role, '상태:', userData.state);

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
                let appointments = scheduleData?.appointments || [];
                
                // 개발 환경에서 테스트 데이터 추가
                const currentPatientState = get().patientState;
                if (import.meta.env.DEV && appointments.length === 0 && 
                    (currentPatientState === 'REGISTERED' || currentPatientState === 'UNREGISTERED')) {
                  console.log('🧪 개발 환경: 테스트 데이터 추가 (상태:', currentPatientState, ')');
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
                      status: 'scheduled'
                    },
                    {
                      appointment_id: 'dev-002',
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
                            prep_id: 3,
                            type: 'clothing',
                            title: '금속 제거',
                            description: '정확한 영상 촬영을 위해 목걸이, 귀걸이 등 금속 액세서리를 제거해주세요.',
                            is_required: true
                          },
                          {
                            prep_id: 4,
                            type: 'general',
                            title: '임신 가능성 확인',
                            description: '임신 가능성이 있는 경우 반드시 의료진에게 알려주세요.',
                            is_required: false
                          }
                        ]
                      },
                      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                      status: 'scheduled'
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

        // 위치 업데이트
        updateLocation: (location) => {
          set({ currentLocation: location });
        },

        // 네비게이션 경로 설정
        setNavigationRoute: (route) => {
          set({ navigationRoute: route });
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
            currentLocation: null,
            navigationRoute: null,
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
              currentLocation: {
                building: tagInfo.building,
                floor: tagInfo.floor,
                room: tagInfo.room,
                x_coord: tagInfo.x_coord,
                y_coord: tagInfo.y_coord,
                timestamp: new Date().toISOString()
              },
              isTagLoading: false
            });
            console.log('✅ NFC 태그 정보 및 현재 위치 업데이트 완료:', tagInfo);
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

export default useJourneyStore;