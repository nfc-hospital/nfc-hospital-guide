"""
Hospital Navigation URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'hospital_navigation'

# ViewSet Router 설정
router = DefaultRouter()
router.register(
    r'maps',
    views.NavigationManagementViewSet,
    basename='hospital-maps'
)
router.register(
    r'nodes', 
    views.NavigationManagementViewSet,
    basename='navigation-nodes'
)
router.register(
    r'routes',
    views.NavigationManagementViewSet,
    basename='patient-routes'
)

urlpatterns = [
    # 환자용 경로 안내 API
    path('api/nfc/scan/navigate/', views.nfc_scan_navigate, name='nfc-scan-navigate'),
    path('api/navigation/complete/', views.navigation_complete, name='navigation-complete'),
    path('api/hospital/map/<str:floor_id>/', views.get_hospital_map, name='hospital-map'),
    path('api/routes/search/', views.search_routes, name='routes-search'),
    
    # 개선된 지도 메타데이터 API
    path('api/v1/navigation/maps/', views.get_maps_metadata, name='maps-metadata'),
    
    # 관리자용 ViewSet (REST framework)
    path('api/navigation/', include(router.urls)),
]