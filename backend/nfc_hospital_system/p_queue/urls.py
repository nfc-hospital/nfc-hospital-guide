from django.urls import path
from . import views

urlpatterns = [
    # 대기열 추가 (POST)
    # URL: /api/v1/queue/join/
    path('join/', views.QueueJoinView.as_view(), name='queue-join'),

    # 내 대기 상태 조회 (GET)
    # URL: /api/v1/queue/my-position/
    path('my-position/', views.MyPositionView.as_view(), name='my-position'),

    # 대기열 목록 (관리자용) (GET)
    # URL: /api/v1/queue/
    path('', views.QueueListView.as_view(), name='queue-list'),

    # 상태 변경 API
    # URL: /api/v1/queue/{queueId}/
    path('<uuid:pk>/', views.QueueStatusUpdateView.as_view(), name='queue-status-update'),
]
