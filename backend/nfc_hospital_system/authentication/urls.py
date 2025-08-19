# authentication/urls.py
from django.urls import path
from .views import CSRFTokenView, simple_login, kakao_login, logout, profile, kakao_login_mock, refresh_token_view
from . import views

urlpatterns = [
    path('test/', views.test_view, name='test'),
    path('simple-login/', views.simple_login, name='simple-login'),
    path('kakao/', views.kakao_login, name='kakao-login'),
    path('logout/', views.logout, name='logout'),  
    path('profile/', views.profile, name='profile'),
    path('kakao-mock/', views.kakao_login_mock, name='kakao_login_mock'),
    path('csrf-token/', CSRFTokenView.as_view(), name='csrf_token'),
    
    # JWT 토큰 관리 (수동 구현)
    path('token/refresh/', views.refresh_token_view, name='token_refresh'),
]