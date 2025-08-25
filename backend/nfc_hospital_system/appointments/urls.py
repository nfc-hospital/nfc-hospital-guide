from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExamViewSet, TodaysAppointmentsView, PatientExamViewSet, 
    TodayScheduleView, AppointmentPreparationView, ExamPostCareInstructionView
)
 
router = DefaultRouter()
router.register(r'appointments/exams', ExamViewSet)

urlpatterns = [ 
    path('', include(router.urls)),
    path('appointments/today/', TodaysAppointmentsView.as_view(), name='todays-appointments'),
    
    # 환자용 검사 API (CLAUDE.md 명세 준수)
    path('exams/my-list/', PatientExamViewSet.as_view({'get': 'my_list'}), name='patient-exam-list'),
    path('exams/<str:pk>/result/', PatientExamViewSet.as_view({'get': 'result'}), name='patient-exam-result'),
    
    # 당일 일정 조회 API (API 명세서 v3 준수)
    path('schedule/today/', TodayScheduleView.as_view(), name='today-schedule'),
    
    # 예약별 준비사항 조회 API
    path('appointments/<str:appointment_id>/preparation/', AppointmentPreparationView.as_view(), name='appointment-preparation'),
    
    # 검사별 검사 후 주의사항 조회 API
    path('appointments/exams/<str:exam_id>/post-care-instructions/', ExamPostCareInstructionView.as_view(), name='exam-post-care-instructions'),
] 
