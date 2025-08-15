from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamViewSet, TodaysAppointmentsView
 
router = DefaultRouter()
router.register(r'exams', ExamViewSet)

urlpatterns = [ 
    path('', include(router.urls)),
    path('appointments/today/', TodaysAppointmentsView.as_view(), name='todays-appointments'),
] 
