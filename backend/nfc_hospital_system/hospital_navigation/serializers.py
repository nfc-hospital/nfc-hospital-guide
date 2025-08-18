"""
Hospital Navigation Serializers
기존 API 패턴을 따라 구현한 시리얼라이저
"""

from rest_framework import serializers
from .models import (
    HospitalMap, NavigationNode, NavigationEdge, 
    PatientRoute, RouteProgress, DepartmentZone
)
from nfc.models import NFCTag
from appointments.models import Exam
import logging

logger = logging.getLogger(__name__)


class HospitalMapSerializer(serializers.ModelSerializer):
    """병원 지도 시리얼라이저"""
    
    node_count = serializers.SerializerMethodField()
    
    class Meta:
        model = HospitalMap
        fields = [
            'map_id', 'building', 'floor', 'width', 'height',
            'scale', 'metadata', 'is_active', 'node_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['map_id', 'created_at', 'updated_at']
    
    def get_node_count(self, obj):
        """지도에 포함된 노드 수"""
        return obj.nodes.count()


class NavigationNodeSerializer(serializers.ModelSerializer):
    """네비게이션 노드 시리얼라이저"""
    
    nfc_tag_code = serializers.CharField(source='nfc_tag.code', read_only=True, allow_null=True)
    exam_title = serializers.CharField(source='exam.title', read_only=True, allow_null=True)
    map_info = serializers.SerializerMethodField()
    
    class Meta:
        model = NavigationNode
        fields = [
            'node_id', 'node_type', 'name', 'description',
            'x_coord', 'y_coord', 'z_coord',
            'is_accessible', 'has_elevator', 'has_escalator',
            'nfc_tag_code', 'exam_title', 'map_info'
        ]
        read_only_fields = ['node_id']
    
    def get_map_info(self, obj):
        """지도 정보 요약"""
        return {
            'building': obj.map.building,
            'floor': obj.map.floor
        }


class NavigationEdgeSerializer(serializers.ModelSerializer):
    """네비게이션 엣지 시리얼라이저"""
    
    from_node_name = serializers.CharField(source='from_node.name', read_only=True)
    to_node_name = serializers.CharField(source='to_node.name', read_only=True)
    
    class Meta:
        model = NavigationEdge
        fields = [
            'edge_id', 'from_node', 'to_node',
            'from_node_name', 'to_node_name',
            'distance', 'walk_time', 'edge_type',
            'is_accessible', 'difficulty_level',
            'avg_congestion', 'is_bidirectional'
        ]
        read_only_fields = ['edge_id']


class RouteStepSerializer(serializers.Serializer):
    """경로 단계별 안내 시리얼라이저"""
    
    step_number = serializers.IntegerField()
    node_id = serializers.UUIDField()
    node_name = serializers.CharField()
    instruction = serializers.CharField()
    description = serializers.CharField()
    distance = serializers.FloatField()
    walk_time = serializers.IntegerField()
    node_type = serializers.CharField()
    floor = serializers.IntegerField()
    building = serializers.CharField()
    x_coord = serializers.FloatField()
    y_coord = serializers.FloatField()


class PatientRouteSerializer(serializers.ModelSerializer):
    """환자 경로 시리얼라이저"""
    
    start_node_info = NavigationNodeSerializer(source='start_node', read_only=True)
    end_node_info = NavigationNodeSerializer(source='end_node', read_only=True)
    steps = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientRoute
        fields = [
            'route_id', 'user', 'start_node', 'end_node',
            'start_node_info', 'end_node_info',
            'path_nodes', 'path_edges', 'steps',
            'total_distance', 'estimated_time',
            'status', 'progress_percentage',
            'is_accessible_route', 'avoid_stairs', 'avoid_crowded',
            'target_exam', 'created_at', 'started_at', 'completed_at'
        ]
        read_only_fields = [
            'route_id', 'created_at', 'started_at', 'completed_at',
            'progress_percentage'
        ]
    
    def get_steps(self, obj):
        """경로 단계별 안내 생성"""
        if not obj.path_nodes:
            return []
        
        steps = []
        nodes = NavigationNode.objects.filter(
            node_id__in=obj.path_nodes
        ).select_related('map')
        
        # 노드 ID 순서대로 정렬
        node_dict = {str(node.node_id): node for node in nodes}
        ordered_nodes = [node_dict.get(node_id) for node_id in obj.path_nodes if node_dict.get(node_id)]
        
        for i, node in enumerate(ordered_nodes):
            instruction = self._generate_instruction(i, node, ordered_nodes)
            
            # 다음 노드까지의 거리와 시간 계산
            distance = 0
            walk_time = 0
            if i < len(ordered_nodes) - 1:
                next_node = ordered_nodes[i + 1]
                edge = NavigationEdge.objects.filter(
                    from_node=node,
                    to_node=next_node
                ).first()
                if edge:
                    distance = edge.distance
                    walk_time = edge.walk_time
            
            steps.append({
                'step_number': i + 1,
                'node_id': node.node_id,
                'node_name': node.name,
                'instruction': instruction,
                'description': node.description,
                'distance': distance,
                'walk_time': walk_time,
                'node_type': node.node_type,
                'floor': node.map.floor,
                'building': node.map.building,
                'x_coord': node.x_coord,
                'y_coord': node.y_coord
            })
        
        return steps
    
    def _generate_instruction(self, index, node, all_nodes):
        """단계별 안내 문구 생성"""
        if index == 0:
            return f"출발: {node.name}에서 시작하세요"
        elif index == len(all_nodes) - 1:
            return f"도착: {node.name}에 도착했습니다"
        else:
            prev_node = all_nodes[index - 1]
            next_node = all_nodes[index + 1] if index < len(all_nodes) - 1 else None
            
            # 엘리베이터 탑승
            if node.node_type == 'elevator':
                if prev_node.map.floor != next_node.map.floor:
                    return f"엘리베이터를 타고 {next_node.map.floor}층으로 이동하세요"
            # 계단 이용
            elif node.node_type == 'stairs':
                if prev_node.map.floor != next_node.map.floor:
                    return f"계단을 이용해 {next_node.map.floor}층으로 이동하세요"
            # 일반 이동
            else:
                return f"{node.name}을(를) 지나가세요"
        
        return f"{node.name}으로 이동하세요"
    
    def get_progress_percentage(self, obj):
        """진행률 계산"""
        return obj.get_progress_percentage()


class RouteProgressSerializer(serializers.ModelSerializer):
    """경로 진행 상황 시리얼라이저"""
    
    current_node_info = NavigationNodeSerializer(source='current_node', read_only=True)
    
    class Meta:
        model = RouteProgress
        fields = [
            'progress_id', 'route', 'current_node', 'current_node_info',
            'node_index', 'tag_log', 'accuracy',
            'is_on_route', 'deviation_distance',
            'timestamp', 'notes'
        ]
        read_only_fields = ['progress_id', 'timestamp']


class RouteCalculationRequestSerializer(serializers.Serializer):
    """경로 계산 요청 시리얼라이저"""
    
    start_node_id = serializers.UUIDField(required=False, allow_null=True)
    end_node_id = serializers.UUIDField(required=False, allow_null=True)
    start_tag_id = serializers.CharField(required=False, allow_null=True)
    end_tag_id = serializers.CharField(required=False, allow_null=True)
    start_exam_id = serializers.CharField(required=False, allow_null=True)
    end_exam_id = serializers.CharField(required=False, allow_null=True)
    is_accessible = serializers.BooleanField(default=False)
    avoid_stairs = serializers.BooleanField(default=False)
    avoid_crowded = serializers.BooleanField(default=False)
    
    def validate(self, data):
        """시작점과 도착점 검증"""
        # 시작점 확인
        has_start = any([
            data.get('start_node_id'),
            data.get('start_tag_id'),
            data.get('start_exam_id')
        ])
        
        # 도착점 확인
        has_end = any([
            data.get('end_node_id'),
            data.get('end_tag_id'),
            data.get('end_exam_id')
        ])
        
        if not has_start:
            raise serializers.ValidationError("시작 위치를 지정해주세요.")
        if not has_end:
            raise serializers.ValidationError("도착 위치를 지정해주세요.")
        
        return data


class NFCScanNavigateRequestSerializer(serializers.Serializer):
    """NFC 스캔 기반 경로 안내 요청"""
    
    tag_id = serializers.CharField(required=True)
    target_exam_id = serializers.CharField(required=False, allow_null=True)
    target_location = serializers.CharField(required=False, allow_null=True)
    action_type = serializers.ChoiceField(
        choices=['scan', 'arrival', 'departure'],
        default='scan'
    )
    
    def validate_tag_id(self, value):
        """태그 ID 검증"""
        # UUID, UID, Code 모두 지원
        return value


class RouteCompleteRequestSerializer(serializers.Serializer):
    """경로 완료 요청"""
    
    route_id = serializers.UUIDField(required=True)
    completion_type = serializers.ChoiceField(
        choices=['completed', 'cancelled', 'expired'],
        default='completed'
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class RouteSearchSerializer(serializers.Serializer):
    """경로 검색 시리얼라이저"""
    
    from_location = serializers.CharField(required=False)
    to_location = serializers.CharField(required=False)
    location_type = serializers.ChoiceField(
        choices=['all', 'exam_room', 'facility', 'restroom', 'elevator'],
        default='all'
    )
    building = serializers.CharField(required=False)
    floor = serializers.IntegerField(required=False)
    is_accessible = serializers.BooleanField(default=False)


class DepartmentZoneSerializer(serializers.ModelSerializer):
    """진료과/시설 존 시리얼라이저"""
    
    class Meta:
        model = DepartmentZone
        fields = [
            'id', 'name', 'svg_id', 'building', 'floor',
            'map_url', 'description', 'icon', 'zone_type',
            'display_order', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']