# nfc/admin.py

from django.contrib import admin
from .models import NFCTag, TagLog, NFCTagExam, FacilityRoute
import json


# NFCTagExam을 NFCTag Admin에 인라인으로 추가
class NFCTagExamInline(admin.TabularInline):
    """
    NFCTag 모델에 NFCTagExam을 인라인으로 추가하여 함께 관리합니다.
    """
    model = NFCTagExam
    extra = 1  # 기본으로 보여줄 빈 폼의 개수
    fields = ('exam', 'exam_name', 'exam_room', 'is_active')



# NFCTag 모델 관리자 설정
@admin.register(NFCTag)
class NFCTagAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 NFCTag 모델을 관리합니다.
    """
    list_display = (
        'code', 'get_location_display', 'tag_uid', 'is_active',
        'last_scanned_at', 'created_at', 'updated_at'
    )
    list_filter = (
        'is_active', 'building', 'floor', 'created_at'
    )
    search_fields = (
        'code', 'tag_uid', 'building', 'room', 'description'
    )
    # 폼에서 필드 그룹화 및 정리
    fieldsets = (
        (None, {
            'fields': ('tag_uid', 'code', 'description')
        }),
        ('위치 정보', {
            'fields': ('building', 'floor', 'room', 'x_coord', 'y_coord')
        }),
        ('상태 및 기록', {
            'fields': ('is_active', 'last_scanned_at'),
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    readonly_fields = ('tag_id', 'last_scanned_at', 'created_at', 'updated_at')
    ordering = ('building', 'floor', 'room')
    inlines = [NFCTagExamInline] # NFCTagExam을 인라인으로 포함

    # 액션 추가
    actions = ['activate_tags', 'deactivate_tags']

    def activate_tags(self, request, queryset):
        """선택된 NFC 태그를 활성화합니다."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated}개의 NFC 태그가 활성화되었습니다.')
    activate_tags.short_description = "선택된 NFC 태그 활성화"

    def deactivate_tags(self, request, queryset):
        """선택된 NFC 태그를 비활성화합니다."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated}개의 NFC 태그가 비활성화되었습니다.')
    deactivate_tags.short_description = "선택된 NFC 태그 비활성화"


# TagLog 모델 관리자 설정
@admin.register(TagLog)
class TagLogAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 TagLog 모델을 관리합니다.
    로그 기록은 주로 조회용으로 사용되므로, 수정/추가/삭제를 비활성화합니다.
    """
    list_display = (
        'timestamp', 'user', 'tag', 'action_type'
    )
    list_filter = (
        'action_type', 'timestamp', 'tag__building', 'tag__floor',
        'user', 'tag'
    )
    search_fields = (
        'user__name', 'user__email', 'tag__code', 'tag__description',
        'tag__building', 'tag__room'
    )
    raw_id_fields = ('user', 'tag') # ForeignKey 필드에 대해 검색 가능한 입력 필드 제공
    date_hierarchy = 'timestamp' # 스캔 시간 기준으로 날짜별 탐색
    ordering = ('-timestamp',)

    # 로그 모델은 조회를 목적으로 하므로, 수정/추가/삭제를 비활성화합니다.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    readonly_fields = (
        'tag', 'user', 'action_type', 'timestamp'
    )


# NFCTagExam 모델 관리자 설정 (인라인으로 사용하지 않고 단독으로 관리할 경우)
# @admin.register(NFCTagExam)
# class NFCTagExamAdmin(admin.ModelAdmin):
#     list_display = ('tag', 'exam_id', 'exam_name', 'exam_room', 'is_active')
#     list_filter = ('is_active', 'exam_name', 'exam_room', 'tag__building')
#     search_fields = ('exam_id', 'exam_name', 'exam_room', 'tag__code')
#     raw_id_fields = ('tag',)
#     ordering = ('tag__code', 'exam_name')


# FacilityRoute 모델 관리자 설정
@admin.register(FacilityRoute)
class FacilityRouteAdmin(admin.ModelAdmin):
    """
    Django 관리자 페이지에서 시설별 경로(맵) 정보를 관리합니다.
    어떤 맵이 어느 관 몇층인지 관리할 수 있습니다.
    """
    list_display = (
        'facility_name', 'get_building', 'get_floor', 'map_id', 
        'svg_element_id', 'get_nodes_count', 'get_edges_count',
        'created_at', 'updated_at'
    )
    list_filter = (
        'map_id', 'created_at', 'updated_at'
    )
    search_fields = (
        'facility_name', 'map_id', 'svg_element_id'
    )
    readonly_fields = ('created_at', 'updated_at', 'get_nodes_preview', 'get_edges_preview')
    
    fieldsets = (
        ('시설 정보', {
            'fields': ('facility_name', 'map_id', 'svg_element_id'),
            'description': '시설명과 해당 시설이 위치한 맵 정보를 설정합니다.'
        }),
        ('경로 데이터', {
            'fields': ('nodes', 'edges'),
            'description': '노드와 엣지 정보를 JSON 형식으로 입력합니다.'
        }),
        ('미리보기', {
            'fields': ('get_nodes_preview', 'get_edges_preview'),
            'classes': ('collapse',),
            'description': '저장된 경로 데이터의 미리보기입니다.'
        }),
        ('메타데이터', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    def get_building(self, obj):
        """맵 ID로부터 건물 정보 추출"""
        map_building = {
            'main_1f': '본관',
            'main_2f': '본관',
            'annex_1f': '별관',
            'cancer_1f': '암센터',
            'cancer_2f': '암센터',
            'overview_main_1f': '본관',
            'overview_main_2f': '본관',
            'overview_cancer_2f': '암센터',
        }
        return map_building.get(obj.map_id, '-')
    get_building.short_description = '건물'
    get_building.admin_order_field = 'map_id'
    
    def get_floor(self, obj):
        """맵 ID로부터 층 정보 추출"""
        if '1f' in obj.map_id:
            return '1층'
        elif '2f' in obj.map_id:
            return '2층'
        elif '3f' in obj.map_id:
            return '3층'
        return '-'
    get_floor.short_description = '층'
    
    def get_nodes_count(self, obj):
        """노드 개수 표시"""
        try:
            nodes = json.loads(obj.nodes) if isinstance(obj.nodes, str) else obj.nodes
            return len(nodes) if nodes else 0
        except:
            return 0
    get_nodes_count.short_description = '노드 수'
    
    def get_edges_count(self, obj):
        """엣지 개수 표시"""
        try:
            edges = json.loads(obj.edges) if isinstance(obj.edges, str) else obj.edges
            return len(edges) if edges else 0
        except:
            return 0
    get_edges_count.short_description = '엣지 수'
    
    def get_nodes_preview(self, obj):
        """노드 데이터 미리보기"""
        try:
            nodes = json.loads(obj.nodes) if isinstance(obj.nodes, str) else obj.nodes
            if nodes and len(nodes) > 0:
                preview = json.dumps(nodes[:3], indent=2, ensure_ascii=False)
                if len(nodes) > 3:
                    preview += f"\n... 외 {len(nodes)-3}개"
                return preview
        except:
            pass
        return "노드 없음"
    get_nodes_preview.short_description = '노드 미리보기'
    
    def get_edges_preview(self, obj):
        """엣지 데이터 미리보기"""
        try:
            edges = json.loads(obj.edges) if isinstance(obj.edges, str) else obj.edges
            if edges and len(edges) > 0:
                preview = json.dumps(edges[:3], indent=2, ensure_ascii=False)
                if len(edges) > 3:
                    preview += f"\n... 외 {len(edges)-3}개"
                return preview
        except:
            pass
        return "엣지 없음"
    get_edges_preview.short_description = '엣지 미리보기'
    
    # 액션 추가
    actions = ['export_routes_to_json', 'clear_route_data']
    
    def export_routes_to_json(self, request, queryset):
        """선택된 경로 데이터를 JSON으로 내보내기"""
        import json
        from django.http import HttpResponse
        
        routes = []
        for route in queryset:
            routes.append({
                'facility_name': route.facility_name,
                'map_id': route.map_id,
                'svg_element_id': route.svg_element_id,
                'nodes': json.loads(route.nodes) if isinstance(route.nodes, str) else route.nodes,
                'edges': json.loads(route.edges) if isinstance(route.edges, str) else route.edges,
            })
        
        response = HttpResponse(
            json.dumps(routes, indent=2, ensure_ascii=False),
            content_type='application/json'
        )
        response['Content-Disposition'] = 'attachment; filename="facility_routes.json"'
        return response
    export_routes_to_json.short_description = "선택된 경로를 JSON으로 내보내기"
    
    def clear_route_data(self, request, queryset):
        """선택된 경로의 노드와 엣지 데이터 초기화"""
        updated = queryset.update(nodes='[]', edges='[]')
        self.message_user(request, f'{updated}개의 경로 데이터가 초기화되었습니다.')
    clear_route_data.short_description = "선택된 경로 데이터 초기화"
