# authentication/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('test/', views.test_view, name='test'),
    path('simple-login/', views.simple_login, name='simple-login'),
    path('kakao/', views.kakao_login, name='kakao-login'),
    # 나중에 추가할 API들
    # path('logout/', views.logout, name='logout'),
    # path('refresh/', views.refresh_token, name='refresh-token'),
]

