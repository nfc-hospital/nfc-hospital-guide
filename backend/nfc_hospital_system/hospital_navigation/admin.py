from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
import json
from .models import (
    HospitalMap, NavigationNode, NavigationEdge, 
    PatientRoute, RouteProgress, DepartmentZone
)
from nfc.models import FacilityRoute


@admin.register(HospitalMap)
class HospitalMapAdmin(admin.ModelAdmin):
    list_display = ['building', 'floor', 'get_node_count', 'is_active', 'created_at']
    list_filter = ['building', 'is_active', 'created_at']
    search_fields = ['building']
    readonly_fields = ['map_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('map_id', 'building', 'floor', 'is_active')
        }),
        ('지도 데이터', {
            'fields': ('svg_data', 'image_url', 'scale', 'width', 'height')
        }),
        #('메타데이터', {
        #    'fields': ('metadata',)
        #}),
        ('시스템 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_node_count(self, obj):
        return obj.nodes.count()
    get_node_count.short_description = '노드 수'


@admin.register(NavigationNode)
class NavigationNodeAdmin(admin.ModelAdmin):
    list_display = ['name', 'node_type', 'map', 'get_coordinates', 'is_accessible', 'created_at']
    list_filter = ['node_type', 'map__building', 'map__floor', 'is_accessible', 'has_elevator', 'has_escalator']
    search_fields = ['name', 'description']
    readonly_fields = ['node_id', 'created_at', 'updated_at']
    autocomplete_fields = ['nfc_tag', 'exam']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('node_id', 'name', 'node_type', 'map', 'description')
        }),
        ('위치 정보', {
            'fields': ('x_coord', 'y_coord', 'z_coord')
        }),
        ('연결 정보', {
            'fields': ('nfc_tag', 'exam'),
            'description': 'NFC 태그나 검사실과 연결'
        }),
        ('접근성 정보', {
            'fields': ('is_accessible', 'has_elevator', 'has_escalator')
        }),
        ('시스템 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_coordinates(self, obj):
        return f"({obj.x_coord:.1f}, {obj.y_coord:.1f}, {obj.z_coord:.1f})"
    get_coordinates.short_description = '좌표 (X, Y, Z)'


@admin.register(NavigationEdge)
class NavigationEdgeAdmin(admin.ModelAdmin):
    list_display = ['get_edge_display', 'edge_type', 'distance', 'walk_time', 'is_accessible', 'is_bidirectional']
    list_filter = ['edge_type', 'is_accessible', 'is_bidirectional']
    search_fields = ['from_node__name', 'to_node__name']
    readonly_fields = ['edge_id', 'created_at', 'updated_at']
    autocomplete_fields = ['from_node', 'to_node']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('edge_id', 'from_node', 'to_node', 'edge_type')
        }),
        ('거리 및 시간', {
            'fields': ('distance', 'walk_time')
        }),
        ('접근성 및 난이도', {
            'fields': ('is_accessible', 'difficulty_level', 'avg_congestion')
        }),
        ('통행 정보', {
            'fields': ('is_bidirectional',)
        }),
        ('시스템 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_edge_display(self, obj):
        return f"{obj.from_node.name} → {obj.to_node.name}"
    get_edge_display.short_description = '경로'


@admin.register(PatientRoute)
class PatientRouteAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_route_display', 'status', 'total_distance', 'estimated_time', 'created_at']
    list_filter = ['status', 'is_accessible_route', 'created_at']
    search_fields = ['user__name', 'user__email']
    readonly_fields = ['route_id', 'created_at', 'started_at', 'completed_at', 'get_progress_display']
    autocomplete_fields = ['user', 'start_node', 'end_node', 'target_exam']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('route_id', 'user', 'status')
        }),
        ('경로 정보', {
            'fields': ('start_node', 'end_node', 'target_exam')
        }),
        ('경로 데이터', {
            'fields': ('path_nodes', 'path_edges', 'total_distance', 'estimated_time')
        }),
        ('접근성 옵션', {
            'fields': ('is_accessible_route', 'avoid_stairs', 'avoid_crowded')
        }),
        ('진행 상황', {
            'fields': ('get_progress_display', 'started_at', 'completed_at')
        }),
        ('시스템 정보', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )
    
    def get_route_display(self, obj):
        return f"{obj.start_node.name} → {obj.end_node.name}"
    get_route_display.short_description = '경로'
    
    def get_progress_display(self, obj):
        progress = obj.get_progress_percentage()
        color = 'green' if progress == 100 else 'orange' if progress > 50 else 'red'
        return format_html(
            '<div style="width: 200px; background-color: #f0f0f0; border-radius: 5px;">' +
            '<div style="width: {}%; background-color: {}; color: white; text-align: center; border-radius: 5px;">' +
            '{}%</div></div>',
            progress, color, progress
        )
    get_progress_display.short_description = '진행률'


@admin.register(RouteProgress)
class RouteProgressAdmin(admin.ModelAdmin):
    list_display = ['route', 'current_node', 'node_index', 'is_on_route', 'timestamp']
    list_filter = ['is_on_route', 'timestamp']
    search_fields = ['route__user__name', 'current_node__name']
    readonly_fields = ['progress_id', 'timestamp']
    autocomplete_fields = ['route', 'current_node', 'tag_log']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('progress_id', 'route', 'timestamp')
        }),
        ('위치 정보', {
            'fields': ('current_node', 'node_index', 'tag_log')
        }),
        ('정확도 및 이탈', {
            'fields': ('accuracy', 'is_on_route', 'deviation_distance')
        }),
        ('비고', {
            'fields': ('notes',)
        })
    )


@admin.register(DepartmentZone)
class DepartmentZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'zone_type', 'building', 'floor', 'svg_id', 'display_order', 'is_active']
    list_filter = ['zone_type', 'building', 'floor', 'is_active']
    search_fields = ['name', 'svg_id', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('name', 'svg_id', 'zone_type', 'icon')
        }),
        ('위치 정보', {
            'fields': ('building', 'floor', 'map_url', 'description')
        }),
        ('표시 설정', {
            'fields': ('display_order', 'is_active')
        }),
        ('시스템 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['activate_zones', 'deactivate_zones']
    
    def activate_zones(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, f"{queryset.count()}개 구역이 활성화되었습니다.")
    activate_zones.short_description = "선택한 구역 활성화"
    
    def deactivate_zones(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f"{queryset.count()}개 구역이 비활성화되었습니다.")
    deactivate_zones.short_description = "선택한 구역 비활성화"


# FacilityRoute 통합 관리를 위한 프록시 모델
class FacilityRouteProxy(FacilityRoute):
    class Meta:
        proxy = True
        verbose_name = '시설 경로 (MapEditor)'
        verbose_name_plural = '시설 경로 목록 (MapEditor)'


@admin.register(FacilityRouteProxy)
class FacilityRouteProxyAdmin(admin.ModelAdmin):
    """MapEditor에서 생성한 경로를 hospital_navigation에서 관리"""
    list_display = ['facility_name', 'get_building', 'get_floor', 'map_id', 'get_node_count', 'get_path_preview', 'updated_at']
    list_filter = ['map_id', 'created_at', 'updated_at']
    search_fields = ['facility_name']
    readonly_fields = ['created_at', 'updated_at', 'get_path_visualization']
    
    fieldsets = (
        ('시설 정보', {
            'fields': ('facility_name', 'map_id', 'svg_element_id')
        }),
        ('경로 데이터', {
            'fields': ('nodes', 'edges', 'get_path_visualization')
        }),
        #('메타데이터', {
        #    'fields': ('metadata',)
        #}),
        ('시스템 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_building(self, obj):
        map_building = {
            'main_1f': '본관', 'main_2f': '본관',
            'cancer_1f': '암센터', 'cancer_2f': '암센터',
            'annex_1f': '별관'
        }
        return map_building.get(obj.map_id, '-')
    get_building.short_description = '건물'
    
    def get_floor(self, obj):
        if '1f' in obj.map_id:
            return '1층'
        elif '2f' in obj.map_id:
            return '2층'
        return '-'
    get_floor.short_description = '층'
    
    def get_node_count(self, obj):
        return len(obj.nodes) if obj.nodes else 0
    get_node_count.short_description = '노드 수'
    
    def get_path_preview(self, obj):
        if not obj.nodes:
            return '-'
        node_count = len(obj.nodes)
        edge_count = len(obj.edges) if obj.edges else 0
        return f"노드 {node_count}개, 연결 {edge_count}개"
    get_path_preview.short_description = '경로 정보'
    
    def get_path_visualization(self, obj):
        """경로를 시각적으로 표현"""
        if not obj.nodes:
            return "경로 데이터 없음"
        
        html = '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">'
        html += '<h4 style="margin-top: 0;">경로 시각화</h4>'
        
        # 노드 정보
        html += '<div style="margin-bottom: 15px;">'
        html += '<strong>노드 목록:</strong><br>'
        for i, node in enumerate(obj.nodes[:10]):  # 최대 10개만 표시
            html += f'<span style="display: inline-block; margin: 3px; padding: 3px 8px; background: #007bff; color: white; border-radius: 4px; font-size: 12px;">'
            html += f"{node.get('id', f'노드{i+1}')}: ({node.get('x', 0):.0f}, {node.get('y', 0):.0f})"
            html += '</span>'
        if len(obj.nodes) > 10:
            html += f'<span style="color: #666;"> ... 외 {len(obj.nodes)-10}개</span>'
        html += '</div>'
        
        # 연결 정보
        if obj.edges:
            html += '<div>'
            html += '<strong>연결 순서:</strong><br>'
            edge_str = ' → '.join([edge[0].replace('node-', '') for edge in obj.edges[:5]])
            if obj.edges and len(obj.edges) > 0:
                edge_str += f" → {obj.edges[-1][1].replace('node-', '')}"
            if len(obj.edges) > 5:
                edge_str += f" (총 {len(obj.edges)}개 연결)"
            html += f'<code style="background: #e9ecef; padding: 5px; border-radius: 3px;">{edge_str}</code>'
            html += '</div>'
        
        html += '</div>'
        return mark_safe(html)
    get_path_visualization.short_description = '경로 상세'