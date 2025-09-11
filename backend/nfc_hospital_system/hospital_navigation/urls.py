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
    # 환자용 경로 안내 API (main urls.py에서 api/v1/navigation/ prefix 이미 포함)
    path('scan/', views.nfc_scan_navigate, name='nfc-scan-navigate'),
    path('complete/', views.navigation_complete, name='navigation-complete'),
    path('../hospital/map/<str:floor_id>/', views.get_hospital_map, name='hospital-map'),
    path('../routes/search/', views.search_routes, name='routes-search'),
    
    # 개선된 지도 메타데이터 API
    path('maps/', views.get_maps_metadata, name='maps-metadata'),
    
    # 진료과/시설 존 API (비로그인 사용자용)
    path('zones/', views.department_zones_list, name='department-zones-list'),
    path('zones/<int:zone_id>/', views.department_zone_detail, name='department-zone-detail'),
    
    # SVG 맵 파일 제공 API
    path('../maps/<str:map_name>/', views.serve_map_svg, name='serve-map-svg'),
    
    # 최적화된 경로 계산 API
    path('route-optimized/', views.calculate_optimized_route_view, name='optimized-route-calculation'),
    path('clear-cache/', views.clear_route_cache_view, name='clear-route-cache'),
    
    # 기본 경로 계산 API (navigation.js와 호환)
    path('path/', views.calculate_route_api, name='calculate-route'),
    path('route-by-tags/', views.calculate_route_by_tags_api, name='calculate-route-by-tags'),
    
    # 관리자용 ViewSet (REST framework)
    path('api/navigation/', include(router.urls)),
]