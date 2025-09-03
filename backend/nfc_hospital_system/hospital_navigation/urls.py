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
    r'edges',
    views.NavigationManagementViewSet,
    basename='navigation-edges'
)
router.register(
    r'routes',
    views.NavigationManagementViewSet,
    basename='patient-routes'
)

urlpatterns = [
    # 환자용 경로 안내 API - /api/v1 prefix를 따라가도록 수정 (URL 충돌 방지를 위해 경로 변경)
    path('api/v1/navigation/scan/', views.nfc_scan_navigate, name='nfc-scan-navigate'),
    path('api/v1/navigation/complete/', views.navigation_complete, name='navigation-complete'),
    path('api/v1/hospital/map/<str:floor_id>/', views.get_hospital_map, name='hospital-map'),
    path('api/v1/routes/search/', views.search_routes, name='routes-search'),
    
    # 개선된 지도 메타데이터 API
    path('api/v1/navigation/maps/', views.get_maps_metadata, name='maps-metadata'),
    
    # 진료과/시설 존 API (비로그인 사용자용)
    path('api/v1/navigation/zones/', views.department_zones_list, name='department-zones-list'),
    path('api/v1/navigation/zones/<int:zone_id>/', views.department_zone_detail, name='department-zone-detail'),
    
    # SVG 맵 파일 제공 API
    path('api/v1/maps/<str:map_name>/', views.serve_map_svg, name='serve-map-svg'),
    
    # 관리자용 ViewSet (REST framework)
    path('api/navigation/', include(router.urls)),
]