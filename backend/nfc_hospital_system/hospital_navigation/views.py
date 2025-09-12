"""
Hospital Navigation Views
기존 API 패턴을 따라 구현한 경로 안내 API
"""

from django.shortcuts import get_object_or_404
from django.db import models, transaction
from django.http import HttpResponse, Http404
from django.conf import settings
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from django.utils import timezone
import logging
import json
import os
from typing import List, Dict, Optional, Tuple
import heapq
from collections import defaultdict

from .models import (
    HospitalMap, NavigationNode, NavigationEdge,
    PatientRoute, RouteProgress, DepartmentZone
)
from .pathfinding_optimized import calculate_optimized_route, clear_pathfinding_cache
from .serializers import (
    HospitalMapSerializer, NavigationNodeSerializer,
    PatientRouteSerializer, RouteProgressSerializer,
    RouteCalculationRequestSerializer, NFCScanNavigateRequestSerializer,
    RouteCompleteRequestSerializer, RouteSearchSerializer, DepartmentZoneSerializer
)
from nfc.models import NFCTag
from appointments.models import Exam
from authentication.models import User
from nfc_hospital_system.utils import APIResponse
import re

logger = logging.getLogger(__name__)


class RouteCalculationService:
    """경로 계산 서비스 - 90도 직각 경로만 허용하는 A* 알고리즘 사용"""
    
    @staticmethod
    def manhattan_distance(node1: NavigationNode, node2: NavigationNode) -> float:
        """맨하탄 거리 계산 (대각선 이동 금지)"""
        return abs(node1.x_coord - node2.x_coord) + abs(node1.y_coord - node2.y_coord)
    
    @staticmethod
    def is_orthogonal_movement(from_node: NavigationNode, to_node: NavigationNode) -> bool:
        """
        두 노드 간 이동이 90도 직각(상하좌우)인지 확인
        대각선 이동은 허용하지 않음
        """
        dx = abs(from_node.x_coord - to_node.x_coord)
        dy = abs(from_node.y_coord - to_node.y_coord)
        
        # 수평 이동 또는 수직 이동만 허용 (둘 중 하나는 0이어야 함)
        return (dx == 0 and dy > 0) or (dy == 0 and dx > 0)
    
    @staticmethod
    def find_shortest_path(
        start_node: NavigationNode,
        end_node: NavigationNode,
        is_accessible: bool = False,
        avoid_stairs: bool = False,
        avoid_crowded: bool = False
    ) -> Tuple[List[str], List[str], float, int]:
        """
        90도 직각 경로만 허용하는 A* 알고리즘을 사용한 최단 경로 계산
        Returns: (path_nodes, path_edges, total_distance, estimated_time)
        """
        if start_node == end_node:
            return ([str(start_node.node_id)], [], 0, 0)
        
        # 그래프 구축 - 90도 직각 이동만 허용
        graph = defaultdict(list)
        edges_dict = {}
        nodes_dict = {}
        
        # 모든 노드 정보 수집
        all_nodes = NavigationNode.objects.select_related('map')
        for node in all_nodes:
            nodes_dict[str(node.node_id)] = node
        
        # 엣지 필터링 조건
        edge_filter = models.Q()
        if is_accessible:
            edge_filter &= models.Q(is_accessible=True)
        
        edges = NavigationEdge.objects.filter(edge_filter).select_related(
            'from_node', 'to_node'
        )
        
        for edge in edges:
            # 계단 회피
            if avoid_stairs and edge.edge_type == 'stairs':
                continue
            
            # 혼잡 구역 회피 (혼잡도 0.7 이상)
            if avoid_crowded and hasattr(edge, 'avg_congestion') and edge.avg_congestion > 0.7:
                continue
            
            # 90도 직각 이동 검증
            if not RouteCalculationService.is_orthogonal_movement(edge.from_node, edge.to_node):
                continue  # 대각선 연결은 건너뛰기
            
            # 맨하탄 거리 기반 가중치 계산
            manhattan_dist = RouteCalculationService.manhattan_distance(edge.from_node, edge.to_node)
            weight = manhattan_dist  # 거리 기반 가중치 사용
            
            graph[str(edge.from_node.node_id)].append(
                (str(edge.to_node.node_id), weight, str(edge.edge_id))
            )
            edges_dict[str(edge.edge_id)] = edge
            
            if edge.is_bidirectional:
                graph[str(edge.to_node.node_id)].append(
                    (str(edge.from_node.node_id), weight, str(edge.edge_id))
                )
        
        # A* 알고리즘 (맨하탄 휴리스틱)
        start_id = str(start_node.node_id)
        end_id = str(end_node.node_id)
        
        # A* 데이터 구조
        open_set = [(0, start_id)]  # (f_score, node_id)
        came_from = {}
        came_from_edge = {}
        g_score = {start_id: 0}
        f_score = {start_id: RouteCalculationService.manhattan_distance(start_node, end_node)}
        visited = set()
        
        while open_set:
            current_f, current_node = heapq.heappop(open_set)
            
            if current_node in visited:
                continue
            
            visited.add(current_node)
            
            if current_node == end_id:
                break
            
            current_node_obj = nodes_dict.get(current_node)
            if not current_node_obj:
                continue
            
            for neighbor, weight, edge_id in graph[current_node]:
                if neighbor in visited:
                    continue
                
                neighbor_node_obj = nodes_dict.get(neighbor)
                if not neighbor_node_obj:
                    continue
                
                # g_score 계산 (실제 비용)
                tentative_g = g_score[current_node] + weight
                
                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    # 더 좋은 경로 발견
                    came_from[neighbor] = current_node
                    came_from_edge[neighbor] = edge_id
                    g_score[neighbor] = tentative_g
                    
                    # h_score (휴리스틱) - 맨하탄 거리
                    h_score = RouteCalculationService.manhattan_distance(neighbor_node_obj, end_node)
                    f_score[neighbor] = tentative_g + h_score
                    
                    heapq.heappush(open_set, (f_score[neighbor], neighbor))
        
        # 경로 복원
        if end_id not in came_from and end_id != start_id:
            # 경로를 찾을 수 없음
            return ([], [], 0, 0)
        
        path_nodes = []
        path_edges = []
        current = end_id
        
        while current != start_id:
            path_nodes.append(current)
            if current in came_from_edge:
                path_edges.append(came_from_edge[current])
            current = came_from[current]
        
        path_nodes.append(start_id)
        path_nodes.reverse()
        path_edges.reverse()
        
        # 총 거리와 시간 계산
        total_distance = 0
        estimated_time = 0
        
        for edge_id in path_edges:
            if edge_id in edges_dict:
                edge = edges_dict[edge_id]
                total_distance += edge.distance
                estimated_time += edge.walk_time
        
        return (path_nodes, path_edges, total_distance, estimated_time)


# 환자용 NFC 스캔 경로 안내 API
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def nfc_scan_navigate(request):
    """
    NFC 스캔 기반 경로 안내 - POST /api/nfc/scan/navigate/
    
    NFC 태그 스캔 시 해당 위치에서 목적지까지 경로 안내
    """
    try:
        serializer = NFCScanNavigateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(
                message="잘못된 요청 데이터입니다.",
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        tag_id = serializer.validated_data['tag_id']
        target_exam_id = serializer.validated_data.get('target_exam_id')
        target_location = serializer.validated_data.get('target_location')
        action_type = serializer.validated_data.get('action_type', 'scan')
        
        # NFC 태그 찾기
        tag = None
        try:
            if len(tag_id) == 36 and '-' in tag_id:
                tag = NFCTag.objects.get(tag_id=tag_id, is_active=True)
            else:
                tag = NFCTag.objects.filter(
                    models.Q(tag_uid=tag_id) | models.Q(code=tag_id),
                    is_active=True
                ).first()
        except NFCTag.DoesNotExist:
            pass
        
        if not tag:
            return APIResponse.error(
                message="존재하지 않거나 비활성화된 NFC 태그입니다.",
                code="TAG_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # 태그와 연결된 노드 찾기
        start_node = NavigationNode.objects.filter(nfc_tag=tag).first()
        if not start_node:
            return APIResponse.error(
                message="이 위치에서 경로 안내를 시작할 수 없습니다.",
                code="NODE_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # 목적지 노드 찾기
        end_node = None
        
        if target_exam_id:
            # 검사실로 안내
            try:
                exam = Exam.objects.get(exam_id=target_exam_id, is_active=True)
                end_node = NavigationNode.objects.filter(exam=exam).first()
            except Exam.DoesNotExist:
                return APIResponse.error(
                    message="존재하지 않는 검사실입니다.",
                    code="EXAM_NOT_FOUND",
                    status_code=status.HTTP_404_NOT_FOUND
                )
        elif target_location:
            # 특정 위치로 안내 (약국, 원무과 등)
            end_node = NavigationNode.objects.filter(
                models.Q(name__icontains=target_location) |
                models.Q(description__icontains=target_location)
            ).first()
        else:
            # 다음 일정 확인
            from appointments.models import Appointment
            next_appointment = Appointment.objects.filter(
                user=request.user,
                scheduled_at__gte=timezone.now(),
                status='scheduled'
            ).order_by('scheduled_at').first()
            
            if next_appointment:
                end_node = NavigationNode.objects.filter(
                    exam=next_appointment.exam
                ).first()
        
        if not end_node:
            return APIResponse.error(
                message="목적지를 찾을 수 없습니다.",
                code="DESTINATION_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # 경로 계산
        service = RouteCalculationService()
        path_nodes, path_edges, total_distance, estimated_time = service.find_shortest_path(
            start_node=start_node,
            end_node=end_node,
            is_accessible=request.data.get('is_accessible', False),
            avoid_stairs=request.data.get('avoid_stairs', False),
            avoid_crowded=request.data.get('avoid_crowded', False)
        )
        
        if not path_nodes:
            return APIResponse.error(
                message="경로를 찾을 수 없습니다.",
                code="NO_ROUTE_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # 경로 저장
        with transaction.atomic():
            route = PatientRoute.objects.create(
                user=request.user,
                start_node=start_node,
                end_node=end_node,
                path_nodes=path_nodes,
                path_edges=path_edges,
                total_distance=total_distance,
                estimated_time=estimated_time,
                status='active',
                is_accessible_route=request.data.get('is_accessible', False),
                avoid_stairs=request.data.get('avoid_stairs', False),
                avoid_crowded=request.data.get('avoid_crowded', False),
                target_exam=next_appointment.exam if next_appointment else None
            )
            
            # 첫 번째 진행 상황 기록
            RouteProgress.objects.create(
                route=route,
                current_node=start_node,
                node_index=0,
                is_on_route=True,
                tag_log=[{
                    'tag_id': str(tag.tag_id),
                    'timestamp': timezone.now().isoformat()
                }]
            )
        
        serializer = PatientRouteSerializer(route)
        
        return APIResponse.success(
            message="경로 안내를 시작합니다.",
            data=serializer.data
        )
        
    except Exception as e:
        logger.error(f"NFC scan navigate error: {str(e)}")
        return APIResponse.error(
            message="경로 안내 생성 중 오류가 발생했습니다.",
            code="NAVIGATION_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# 경로 완료 API
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def navigation_complete(request):
    """
    경로 완료/취소 처리 - POST /api/navigation/complete/
    """
    try:
        serializer = RouteCompleteRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return APIResponse.error(
                message="잘못된 요청 데이터입니다.",
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        route_id = serializer.validated_data['route_id']
        completion_type = serializer.validated_data.get('completion_type', 'completed')
        notes = serializer.validated_data.get('notes', '')
        
        # 경로 찾기
        route = get_object_or_404(
            PatientRoute,
            route_id=route_id,
            user=request.user
        )
        
        if route.status in ['completed', 'cancelled', 'expired']:
            return APIResponse.error(
                message="이미 종료된 경로입니다.",
                code="ROUTE_ALREADY_ENDED",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # 상태 업데이트
        with transaction.atomic():
            route.status = completion_type
            route.completed_at = timezone.now()
            route.save()
            
            # 마지막 진행 상황 기록
            last_progress = RouteProgress.objects.filter(
                route=route
            ).order_by('-timestamp').first()
            
            if last_progress:
                RouteProgress.objects.create(
                    route=route,
                    current_node=route.end_node if completion_type == 'completed' else last_progress.current_node,
                    node_index=len(route.path_nodes) - 1 if completion_type == 'completed' else last_progress.node_index,
                    is_on_route=completion_type == 'completed',
                    notes=notes
                )
        
        return APIResponse.success(
            message="경로가 종료되었습니다.",
            data={
                'route_id': str(route.route_id),
                'status': route.status,
                'completed_at': route.completed_at.isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Navigation complete error: {str(e)}")
        return APIResponse.error(
            message="경로 종료 처리 중 오류가 발생했습니다.",
            code="COMPLETION_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# 병원 지도 조회 API (SVG 파일 + 메타데이터)
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_hospital_map(request, floor_id):
    """
    특정 층 지도 정보 조회 - GET /api/v1/hospital/map/{floor_id}/
    HospitalMap 모델에서 SVG 데이터와 메타데이터 제공
    """
    try:
        # floor_id는 "main_1f", "cancer_2f" 같은 형식
        # floor_id 파싱
        parts = floor_id.split('_')
        if len(parts) == 2:
            building = parts[0]
            floor_str = parts[1]
            
            # 층수를 정수로 변환
            try:
                if 'b' in floor_str:  # 지하층 (예: b1)
                    floor = -int(floor_str.replace('b', ''))
                else:  # 지상층 (예: 1f, 2f)
                    floor = int(floor_str.replace('f', ''))
            except ValueError:
                floor = 1
        else:
            building = 'main'
            floor = 1
        
        # DB에서 지도 메타데이터 조회
        hospital_map = None
        nodes = []
        
        try:
            hospital_map = HospitalMap.objects.get(
                building__iexact=building,
                floor=floor,
                is_active=True
            )
            
            # SVG 데이터가 DB에 있으면 사용, 없으면 파일에서 읽기
            if hospital_map.svg_data:
                svg_content = hospital_map.svg_data
            else:
                # 정적 파일에서 읽기
                svg_filename = f"{floor_id}.svg"
                svg_path = os.path.join(settings.BASE_DIR, 'static', 'maps', svg_filename)
                
                if not os.path.exists(svg_path):
                    svg_filename = f"{floor_id}.interactive.svg"
                    svg_path = os.path.join(settings.BASE_DIR, 'static', 'maps', svg_filename)
                
                if os.path.exists(svg_path):
                    with open(svg_path, 'r', encoding='utf-8') as f:
                        svg_content = f.read()
                else:
                    svg_content = None
            
            # 해당 층의 노드들도 함께 조회
            nodes = NavigationNode.objects.filter(
                map=hospital_map
            ).select_related('nfc_tag', 'exam')
            
        except HospitalMap.DoesNotExist:
            # DB에 없으면 파일에서만 읽기
            svg_filename = f"{floor_id}.svg"
            svg_path = os.path.join(settings.BASE_DIR, 'static', 'maps', svg_filename)
            
            if not os.path.exists(svg_path):
                svg_filename = f"{floor_id}.interactive.svg"
                svg_path = os.path.join(settings.BASE_DIR, 'static', 'maps', svg_filename)
            
            if os.path.exists(svg_path):
                with open(svg_path, 'r', encoding='utf-8') as f:
                    svg_content = f.read()
            else:
                return APIResponse.error(
                    message=f"지도 파일을 찾을 수 없습니다: {floor_id}",
                    code="MAP_NOT_FOUND",
                    status_code=status.HTTP_404_NOT_FOUND
                )
            pass
        
        # 응답 데이터 구성
        response_data = {
            'svg_content': svg_content,
            'svg_url': f'/static/maps/{svg_filename}',
            'floor_id': floor_id,
            'building': building,
            'floor': floor,
            'metadata': {}
        }
        
        # DB 데이터가 있으면 추가
        if hospital_map:
            map_serializer = HospitalMapSerializer(hospital_map)
            nodes_serializer = NavigationNodeSerializer(nodes, many=True)
            response_data['metadata'] = {
                'map': map_serializer.data,
                'nodes': nodes_serializer.data,
                'width': hospital_map.width,
                'height': hospital_map.height
            }
        else:
            # 기본 메타데이터
            response_data['metadata'] = {
                'width': 900,
                'height': 600,
                'nodes': []
            }
        
        return APIResponse.success(
            message="지도 정보를 조회했습니다.",
            data=response_data
        )
        
    except Exception as e:
        logger.error(f"Get hospital map error: {str(e)}")
        return APIResponse.error(
            message="지도 조회 중 오류가 발생했습니다.",
            code="MAP_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# 경로 검색 API
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def search_routes(request):
    """
    위치 검색 및 경로 제안 - GET /api/routes/search/
    """
    try:
        serializer = RouteSearchSerializer(data=request.GET)
        if not serializer.is_valid():
            return APIResponse.error(
                message="잘못된 검색 조건입니다.",
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        from_location = serializer.validated_data.get('from_location')
        to_location = serializer.validated_data.get('to_location')
        location_type = serializer.validated_data.get('location_type', 'all')
        building = serializer.validated_data.get('building')
        floor = serializer.validated_data.get('floor')
        is_accessible = serializer.validated_data.get('is_accessible', False)
        
        # 노드 검색 쿼리 구성
        nodes_query = NavigationNode.objects.all()
        
        if location_type != 'all':
            nodes_query = nodes_query.filter(node_type=location_type)
        
        if building:
            nodes_query = nodes_query.filter(map__building__icontains=building)
        
        if floor is not None:
            nodes_query = nodes_query.filter(map__floor=floor)
        
        if is_accessible:
            nodes_query = nodes_query.filter(is_accessible=True)
        
        # 출발지 검색
        from_nodes = []
        if from_location:
            from_nodes = nodes_query.filter(
                models.Q(name__icontains=from_location) |
                models.Q(description__icontains=from_location)
            )[:5]  # 최대 5개 결과
        
        # 도착지 검색
        to_nodes = []
        if to_location:
            to_nodes = nodes_query.filter(
                models.Q(name__icontains=to_location) |
                models.Q(description__icontains=to_location)
            )[:5]
        
        # 결과 직렬화
        from_serializer = NavigationNodeSerializer(from_nodes, many=True)
        to_serializer = NavigationNodeSerializer(to_nodes, many=True)
        
        # 자주 가는 목적지 추천 (환자용)
        popular_destinations = []
        if request.user.is_authenticated:
            # 최근 방문한 노드들
            recent_routes = PatientRoute.objects.filter(
                user=request.user,
                status='completed'
            ).order_by('-completed_at')[:10]
            
            visited_nodes = set()
            for route in recent_routes:
                if route.end_node and route.end_node.node_id not in visited_nodes:
                    visited_nodes.add(route.end_node.node_id)
                    popular_destinations.append(route.end_node)
                    if len(popular_destinations) >= 3:
                        break
        
        popular_serializer = NavigationNodeSerializer(popular_destinations, many=True)
        
        return APIResponse.success(
            message="검색 결과입니다.",
            data={
                'from_locations': from_serializer.data,
                'to_locations': to_serializer.data,
                'popular_destinations': popular_serializer.data
            }
        )
        
    except Exception as e:
        logger.error(f"Route search error: {str(e)}")
        return APIResponse.error(
            message="경로 검색 중 오류가 발생했습니다.",
            code="SEARCH_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# 지도 메타데이터 API
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_maps_metadata(request):
    """
    개선된 지도 메타데이터 조회 - GET /api/v1/navigation/maps/
    SVG 파일 경로와 개선사항 정보 포함
    """
    try:
        maps = HospitalMap.objects.filter(is_active=True).order_by('building', 'floor')
        
        maps_data = []
        for map_obj in maps:
            # 각 층의 노드 정보 포함
            nodes = NavigationNode.objects.filter(map=map_obj).values(
                'node_id', 'name', 'node_type', 'x_coord', 'y_coord', 
                'is_accessible', 'has_elevator', 'has_escalator'
            )
            
            map_data = {
                'map_id': str(map_obj.map_id),
                'building': map_obj.building,
                'floor': map_obj.floor,
                'width': map_obj.width,
                'height': map_obj.height,
                'scale': map_obj.scale,
                'svg_file_path': map_obj.metadata.get('svg_file_path') if map_obj.metadata else None,
                'improved_layout': map_obj.metadata.get('improved_layout', False) if map_obj.metadata else False,
                'layout_version': map_obj.metadata.get('layout_version', '1.0') if map_obj.metadata else '1.0',
                'accessibility_features': map_obj.metadata.get('accessibility_features', []) if map_obj.metadata else [],
                'node_count': nodes.count(),
                'nodes': list(nodes),
                'zones': []
            }
            
            # 구역(Zone) 정보 추가
            if map_obj.building == '본관' and map_obj.floor == 1:
                map_data['zones'] = [
                    {'name': '접수/등록', 'color': '#e3f2fd', 'area': [50, 150, 350, 250]},
                    {'name': '검사', 'color': '#e8f5e9', 'area': [50, 450, 350, 250]},
                    {'name': '수납/약국', 'color': '#fff3e0', 'area': [600, 150, 350, 550]}
                ]
                map_data['patient_flow'] = 'U자형 순환 동선'
            elif map_obj.building == '본관' and map_obj.floor == 2:
                map_data['zones'] = [
                    {'name': '대기 구역', 'color': '#e3f2fd', 'area': [350, 100, 300, 150]},
                    {'name': '진료 구역', 'color': '#e8f5e9', 'area': [200, 200, 600, 400]}
                ]
                map_data['patient_flow'] = '진료 존 중심'
            elif map_obj.building == '암센터' and map_obj.floor == 1:
                map_data['zones'] = [
                    {'name': '로비/공용', 'color': '#eceff1', 'area': [400, 300, 400, 300]},
                    {'name': '치료 구역', 'color': '#f3e5f5', 'area': [850, 200, 300, 500]},
                    {'name': '상담 구역', 'color': '#e3f2fd', 'area': [50, 200, 300, 500]}
                ]
                map_data['patient_flow'] = '로비 중심 방사형'
            elif map_obj.building == '암센터' and map_obj.floor == 2:
                map_data['zones'] = [
                    {'name': '접수/대기', 'color': '#e3f2fd', 'area': [50, 300, 300, 300]},
                    {'name': '영상검사', 'color': '#e0f2f1', 'area': [400, 200, 700, 500]},
                    {'name': '판독/의사', 'color': '#eceff1', 'area': [400, 50, 700, 120]}
                ]
                map_data['patient_flow'] = '영상의학과 클러스터'
            
            maps_data.append(map_data)
        
        # 전체 개선사항 요약
        improvements = {
            'version': '2.0',
            'release_date': '2025-08-16',
            'features': [
                {
                    'category': '환자 동선 최적화',
                    'items': [
                        'U자형 순환 동선 도입',
                        '체크인/체크아웃 동선 분리',
                        '검사 존(Zone) 형성'
                    ]
                },
                {
                    'category': '접근성 개선',
                    'items': [
                        '엘리베이터 중앙 배치',
                        '복도 폭 확대 (휠체어/침대)',
                        '장애인 화장실 전층 설치',
                        '휴게실/대기실 추가'
                    ]
                },
                {
                    'category': '시각 디자인 강화',
                    'items': [
                        '방 번호 체계 (101호~409호)',
                        '동선 화살표 및 유도선',
                        '구역별 색상 구분',
                        '표준 픽토그램 아이콘'
                    ]
                }
            ]
        }
        
        return APIResponse.success(
            message="지도 메타데이터를 조회했습니다.",
            data={
                'maps': maps_data,
                'improvements': improvements,
                'total_floors': len(maps_data),
                'svg_base_url': '/images/maps/'
            }
        )
        
    except Exception as e:
        logger.error(f"Get maps metadata error: {str(e)}")
        return APIResponse.error(
            message="지도 메타데이터 조회 중 오류가 발생했습니다.",
            code="METADATA_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ViewSet for 관리자 대시보드
class NavigationManagementViewSet(ModelViewSet):
    """
    관리자용 네비게이션 관리 API
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """액션별 권한 설정"""
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]
    
    def get_serializer_class(self):
        if self.basename == 'hospital-maps':
            return HospitalMapSerializer
        elif self.basename == 'navigation-nodes':
            return NavigationNodeSerializer
        elif self.basename == 'navigation-edges':
            from .serializers import NavigationEdgeSerializer
            return NavigationEdgeSerializer
        elif self.basename == 'patient-routes':
            return PatientRouteSerializer
        return super().get_serializer_class()
    
    def get_queryset(self):
        if self.basename == 'hospital-maps':
            return HospitalMap.objects.all()
        elif self.basename == 'navigation-nodes':
            queryset = NavigationNode.objects.select_related('map', 'nfc_tag', 'exam')
            # map_id 파라미터로 필터링
            map_id = self.request.query_params.get('map_id')
            if map_id:
                queryset = queryset.filter(map__map_id=map_id)
            return queryset
        elif self.basename == 'navigation-edges':
            queryset = NavigationEdge.objects.select_related('from_node', 'to_node')
            # map_id 파라미터로 필터링
            map_id = self.request.query_params.get('map_id')
            if map_id:
                queryset = queryset.filter(from_node__map__map_id=map_id)
            return queryset
        elif self.basename == 'patient-routes':
            queryset = PatientRoute.objects.select_related(
                'user', 'start_node', 'end_node', 'target_exam'
            )
            # 관리자가 아닌 경우 자신의 경로만
            if not self.request.user.is_staff:
                queryset = queryset.filter(user=self.request.user)
            # map_id 파라미터로 필터링
            map_id = self.request.query_params.get('map_id')
            if map_id:
                queryset = queryset.filter(start_node__map__map_id=map_id)
            return queryset
        return None
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """경로 통계 조회"""
        try:
            stats = {
                'total_maps': HospitalMap.objects.count(),
                'total_nodes': NavigationNode.objects.count(),
                'total_edges': NavigationEdge.objects.count(),
                'active_routes': PatientRoute.objects.filter(status='active').count(),
                'completed_routes_today': PatientRoute.objects.filter(
                    status='completed',
                    completed_at__date=timezone.now().date()
                ).count(),
                'average_completion_time': 0
            }
            
            # 평균 완료 시간 계산
            completed_routes = PatientRoute.objects.filter(
                status='completed',
                started_at__isnull=False,
                completed_at__isnull=False
            )
            
            if completed_routes.exists():
                total_time = 0
                count = 0
                for route in completed_routes[:100]:  # 최근 100개만
                    duration = (route.completed_at - route.started_at).seconds
                    total_time += duration
                    count += 1
                
                if count > 0:
                    stats['average_completion_time'] = total_time // count
            
            return APIResponse.success(
                message="통계 정보를 조회했습니다.",
                data=stats
            )
            
        except Exception as e:
            logger.error(f"Statistics error: {str(e)}")
            return APIResponse.error(
                message="통계 조회 중 오류가 발생했습니다.",
                code="STATS_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])  # 비로그인 사용자도 접근 가능
def department_zones_list(request):
    """
    진료과/시설 존 목록 조회 API
    비로그인 사용자를 위한 병원 개요 정보 제공
    """
    try:
        # 활성화된 존만 조회, 표시 순서대로 정렬
        zones = DepartmentZone.objects.filter(is_active=True).order_by('display_order', 'name')
        
        # 타입별 필터링 (선택사항)
        zone_type = request.GET.get('type')
        if zone_type and zone_type in ['DEPARTMENT', 'FACILITY']:
            zones = zones.filter(zone_type=zone_type)
        
        # 건물별 필터링 (선택사항)
        building = request.GET.get('building')
        if building:
            zones = zones.filter(building=building)
        
        # 층별 필터링 (선택사항)
        floor = request.GET.get('floor')
        if floor:
            zones = zones.filter(floor=floor)
        
        serializer = DepartmentZoneSerializer(zones, many=True)
        
        return APIResponse.success(
            message="진료과/시설 정보를 조회했습니다.",
            data={
                'zones': serializer.data,
                'total_count': zones.count()
            }
        )
        
    except Exception as e:
        logger.error(f"Department zones list error: {str(e)}")
        return APIResponse.error(
            message="진료과 정보 조회 중 오류가 발생했습니다.",
            code="ZONES_LIST_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def department_zone_detail(request, zone_id):
    """
    특정 진료과/시설 존 상세 정보 조회
    """
    try:
        zone = get_object_or_404(DepartmentZone, id=zone_id, is_active=True)
        serializer = DepartmentZoneSerializer(zone)
        
        return APIResponse.success(
            message="진료과 상세 정보를 조회했습니다.",
            data=serializer.data
        )
        
    except DepartmentZone.DoesNotExist:
        return APIResponse.error(
            message="해당 진료과를 찾을 수 없습니다.",
            code="ZONE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Department zone detail error: {str(e)}")
        return APIResponse.error(
            message="진료과 상세 정보 조회 중 오류가 발생했습니다.",
            code="ZONE_DETAIL_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def serve_map_svg(request, map_name):
    """
    요청된 이름의 맵 SVG 파일을 반환하는 API 뷰.
    보안을 위해 파일 이름에 경로 조작 문자가 있는지 확인합니다.
    """
    if not re.match(r'^[a-zA-Z0-9_.-]+$', map_name):
        raise Http404("잘못된 맵 이름입니다.")

    file_path = os.path.join(settings.STATICFILES_DIRS[0], 'maps', map_name)

    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        return HttpResponse(svg_content, content_type='image/svg+xml')
    else:
        raise Http404("맵 파일을 찾을 수 없습니다.")


@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # 임시로 인증 제거
def calculate_optimized_route_view(request):
    """
    Optimized route calculation API with multi-floor support
    POST /api/v1/navigation/route-optimized/
    
    Request body:
    {
        "start_node_id": 1,
        "end_node_id": 2
    }
    
    Response:
    {
        "success": true,
        "data": {
            "path_coordinates": [...],
            "total_distance": 150.5,
            "total_time": 120.0,
            "floors_involved": [1, 2],
            "has_floor_transitions": true,
            "start_floor": 1,
            "end_floor": 2
        }
    }
    """
    try:
        # Validate request data
        start_node_id = request.data.get('start_node_id')
        end_node_id = request.data.get('end_node_id')
        
        if not start_node_id or not end_node_id:
            return APIResponse.error(
                message="start_node_id and end_node_id are required",
                code="MISSING_PARAMETERS",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Convert to integers and then to UUID format
        try:
            start_node_int = int(start_node_id)
            end_node_int = int(end_node_id)
            
            # Convert integer to fixed UUID format
            start_node_uuid = f'00000000-0000-0000-0000-{start_node_int:012d}'
            end_node_uuid = f'00000000-0000-0000-0000-{end_node_int:012d}'
            
        except ValueError:
            return APIResponse.error(
                message="node IDs must be integers",
                code="INVALID_NODE_IDS",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if nodes exist
        try:
            start_node = NavigationNode.objects.get(node_id=start_node_uuid)
            end_node = NavigationNode.objects.get(node_id=end_node_uuid)
        except NavigationNode.DoesNotExist as e:
            return APIResponse.error(
                message=f"Navigation node not found: {str(e)}",
                code="NODE_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate optimized route using UUID strings
        result = calculate_optimized_route(start_node_uuid, end_node_uuid)
        
        if result['success']:
            # 프론트엔드 호환성을 위해 데이터 형식 통일
            route_data = result.get('data', result)
            
            # coordinates와 path_coordinates 필드 모두 제공
            coordinates = route_data.get('path_coordinates', [])
            if not coordinates:
                coordinates = route_data.get('coordinates', [])
            
            unified_data = {
                "coordinates": coordinates,  # navigation.js 호환성
                "path_coordinates": coordinates,  # MapStore 호환성
                "distance": route_data.get('total_distance', route_data.get('distance', 0)),
                "estimatedTime": int(route_data.get('total_time', route_data.get('estimatedTime', 0))),
                "steps": route_data.get('steps', []),
                "nodes": route_data.get('nodes', []),
                "edges": route_data.get('edges', []),
                "total_distance": route_data.get('total_distance', route_data.get('distance', 0)),
                "estimated_time": int(route_data.get('total_time', route_data.get('estimatedTime', 0))),
                # 추가 메타데이터
                "floors_involved": route_data.get('floors_involved', []),
                "has_floor_transitions": route_data.get('has_floor_transitions', False),
                "start_floor": route_data.get('start_floor'),
                "end_floor": route_data.get('end_floor')
            }
            
            return APIResponse.success(
                message="Route calculated successfully",
                data=unified_data
            )
        else:
            return APIResponse.error(
                message=result.get('error', 'Route calculation failed'),
                code="ROUTE_CALCULATION_ERROR",
                status_code=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        logger.error(f"Optimized route calculation error: {str(e)}")
        return APIResponse.error(
            message="An error occurred while calculating the route",
            code="ROUTE_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def clear_route_cache_view(request):
    """
    Clear pathfinding cache (Admin only)
    POST /api/v1/navigation/clear-cache/
    """
    try:
        clear_pathfinding_cache()
        
        return APIResponse.success(
            message="Pathfinding cache cleared successfully"
        )
        
    except Exception as e:
        logger.error(f"Clear cache error: {str(e)}")
        return APIResponse.error(
            message="Failed to clear pathfinding cache",
            code="CACHE_CLEAR_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ================================
# Navigation.js 호환 API 함수들
# ================================

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def calculate_route_api(request):
    """
    기본 경로 계산 API (navigation.js와 호환)
    POST /api/v1/navigation/path/
    
    Request body:
    {
        "start_node_id": "node_123",
        "end_node_id": "node_456",
        "avoid_stairs": false,
        "is_accessible": false
    }
    
    Response:
    {
        "success": true,
        "data": {
            "path_coordinates": [{"x": 100, "y": 200}, ...],
            "distance": 150.5,
            "estimated_time": 120,
            "steps": [...],
            "nodes": [...],
            "edges": [...]
        },
        "message": "경로 계산이 완료되었습니다."
    }
    """
    try:
        # 🐛 디버깅: 요청 데이터 상세 로깅
        logger.info(f"🚀 calculate_route_api 호출됨")
        logger.info(f"📋 request.data: {request.data}")
        logger.info(f"📋 request.method: {request.method}")
        
        # 요청 데이터 검증
        start_node_id = request.data.get('start_node_id')
        end_node_id = request.data.get('end_node_id')
        avoid_stairs = request.data.get('avoid_stairs', False)
        is_accessible = request.data.get('is_accessible', False)
        
        logger.info(f"🔍 파싱된 데이터: start={start_node_id}, end={end_node_id}, avoid_stairs={avoid_stairs}, is_accessible={is_accessible}")
        
        if not start_node_id or not end_node_id:
            logger.warning("❌ 필수 파라미터 누락")
            return APIResponse.error(
                message="start_node_id and end_node_id are required",
                code="MISSING_PARAMETERS",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"🗺️ 경로 계산 요청: {start_node_id} → {end_node_id}")
        
        # 노드 조회
        try:
            logger.info(f"🔍 start_node_id로 노드 찾는 중: {start_node_id}")
            start_node = NavigationNode.objects.get(node_id=start_node_id)
            logger.info(f"✅ start_node 찾음: {start_node.name} ({start_node.node_id})")
            
            logger.info(f"🔍 end_node_id로 노드 찾는 중: {end_node_id}")
            end_node = NavigationNode.objects.get(node_id=end_node_id)
            logger.info(f"✅ end_node 찾음: {end_node.name} ({end_node.node_id})")
        except NavigationNode.DoesNotExist as e:
            logger.error(f"❌ 노드를 찾을 수 없음: {str(e)}")
            logger.error(f"❌ start_node_id: {start_node_id}")
            logger.error(f"❌ end_node_id: {end_node_id}")
            return APIResponse.error(
                message=f"노드를 찾을 수 없습니다: {str(e)}",
                code="NODE_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # 경로 계산 서비스 사용
        try:
            logger.info("DEBUG 경로 계산 서비스 호출 시작")
            # RouteCalculationService에서 경로 계산
            path_nodes, path_edges, total_distance, estimated_time = RouteCalculationService.find_shortest_path(
                start_node=start_node,
                end_node=end_node,
                avoid_stairs=avoid_stairs,
                is_accessible=is_accessible
            )
            
            logger.info(f"DEBUG 경로 계산 결과: nodes={len(path_nodes) if path_nodes else 0}, edges={len(path_edges) if path_edges else 0}, distance={total_distance}, time={estimated_time}")
            
            if not path_nodes or len(path_nodes) == 0:
                logger.error("ERROR 경로 계산 결과 노드 없음")
                return APIResponse.error(
                    message="경로를 찾을 수 없습니다. 출발지와 목적지 사이에 연결된 경로가 없습니다.",
                    code="ROUTE_NOT_FOUND",
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            # 좌표 배열 생성
            path_coordinates = []
            nodes_data = []
            edges_data = []
            
            # 노드 좌표 조회
            for node_id in path_nodes:
                try:
                    node = NavigationNode.objects.get(node_id=node_id)
                    path_coordinates.append({
                        "x": node.x_coord,
                        "y": node.y_coord
                    })
                    nodes_data.append({
                        "node_id": str(node.node_id),
                        "name": node.name,
                        "x": node.x_coord,
                        "y": node.y_coord
                    })
                except NavigationNode.DoesNotExist:
                    continue
            
            # 좌표 배열 검증
            if not path_coordinates:
                return APIResponse.error(
                    message="유효한 좌표를 생성할 수 없습니다. 노드 정보를 확인해주세요.",
                    code="INVALID_COORDINATES",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # 엣지 정보 조회
            for edge_id in path_edges:
                try:
                    edge = NavigationEdge.objects.get(edge_id=edge_id)
                    edges_data.append({
                        "edge_id": str(edge.edge_id),
                        "distance": edge.distance,
                        "walk_time": edge.walk_time
                    })
                except NavigationEdge.DoesNotExist:
                    continue
            
            return APIResponse.success(
                message="경로 계산이 완료되었습니다.",
                data={
                    "coordinates": path_coordinates,  # navigation.js에서 기대하는 키명
                    "path_coordinates": path_coordinates,  # MapStore 호환성을 위한 중복 제공
                    "distance": total_distance,
                    "estimatedTime": int(estimated_time),
                    "steps": [],  # 간단한 경로 단계 (향후 확장)
                    "nodes": nodes_data,
                    "edges": edges_data,
                    "total_distance": total_distance,  # MapStore 호환성
                    "estimated_time": int(estimated_time)  # MapStore 호환성
                }
            )
                
        except Exception as calculation_error:
            logger.error(f"ERROR 경로 계산 서비스 예외: {str(calculation_error)}", exc_info=True)
            return APIResponse.error(
                message="경로 계산 중 오류가 발생했습니다.",
                code="CALCULATION_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f"ERROR Calculate route API 전체 예외: {str(e)}", exc_info=True)
        return APIResponse.error(
            message="경로 계산 요청 처리 중 오류가 발생했습니다.",
            code="API_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def calculate_route_by_tags_api(request):
    """
    NFC 태그 기반 경로 계산 API (navigation.js와 호환)
    POST /api/v1/navigation/route-by-tags/
    
    Request body:
    {
        "start_tag_code": "NFC001",
        "end_tag_code": "NFC002",
        "avoid_stairs": false,
        "is_accessible": false
    }
    """
    try:
        # 요청 데이터 검증
        start_tag_code = request.data.get('start_tag_code')
        end_tag_code = request.data.get('end_tag_code')
        avoid_stairs = request.data.get('avoid_stairs', False)
        is_accessible = request.data.get('is_accessible', False)
        
        if not start_tag_code or not end_tag_code:
            return APIResponse.error(
                message="start_tag_code and end_tag_code are required",
                code="MISSING_PARAMETERS",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"🏷️ 태그 기반 경로 계산: {start_tag_code} → {end_tag_code}")
        
        # NFC 태그 조회
        try:
            start_tag = NFCTag.objects.get(code=start_tag_code, is_active=True)
            end_tag = NFCTag.objects.get(code=end_tag_code, is_active=True)
        except NFCTag.DoesNotExist as e:
            return APIResponse.error(
                message=f"NFC 태그를 찾을 수 없습니다: {str(e)}",
                code="TAG_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # 태그와 연결된 노드 찾기
        try:
            start_node = NavigationNode.objects.get(nfc_tag=start_tag)
            end_node = NavigationNode.objects.get(nfc_tag=end_tag)
        except NavigationNode.DoesNotExist as e:
            return APIResponse.error(
                message=f"태그와 연결된 노드를 찾을 수 없습니다: {str(e)}",
                code="NODE_NOT_LINKED",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # 경로 계산
        try:
            # RouteCalculationService에서 경로 계산
            path_nodes, path_edges, total_distance, estimated_time = RouteCalculationService.find_shortest_path(
                start_node=start_node,
                end_node=end_node,
                avoid_stairs=avoid_stairs,
                is_accessible=is_accessible
            )
            
            if not path_nodes or len(path_nodes) == 0:
                return APIResponse.error(
                    message="경로를 찾을 수 없습니다. 출발지와 목적지 사이에 연결된 경로가 없습니다.",
                    code="ROUTE_NOT_FOUND",
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            # 좌표 배열 생성 (태그 기반과 동일한 포맷)
            path_coordinates = []
            nodes_data = []
            edges_data = []
            
            # 노드 좌표 조회
            for node_id in path_nodes:
                try:
                    node = NavigationNode.objects.get(node_id=node_id)
                    path_coordinates.append({
                        "x": node.x_coord,
                        "y": node.y_coord
                    })
                    nodes_data.append({
                        "node_id": str(node.node_id),
                        "name": node.name,
                        "x": node.x_coord,
                        "y": node.y_coord
                    })
                except NavigationNode.DoesNotExist:
                    continue
            
            # 좌표 배열 검증
            if not path_coordinates:
                return APIResponse.error(
                    message="유효한 좌표를 생성할 수 없습니다. 노드 정보를 확인해주세요.",
                    code="INVALID_COORDINATES",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # 엣지 정보 조회
            for edge_id in path_edges:
                try:
                    edge = NavigationEdge.objects.get(edge_id=edge_id)
                    edges_data.append({
                        "edge_id": str(edge.edge_id),
                        "distance": edge.distance,
                        "walk_time": edge.walk_time
                    })
                except NavigationEdge.DoesNotExist:
                    continue
            
            return APIResponse.success(
                message="태그 기반 경로 계산이 완료되었습니다.",
                data={
                    "coordinates": path_coordinates,  # navigation.js에서 기대하는 키명
                    "path_coordinates": path_coordinates,  # MapStore 호환성을 위한 중복 제공
                    "distance": total_distance,
                    "estimatedTime": int(estimated_time),
                    "steps": [],
                    "nodes": nodes_data,
                    "edges": edges_data,
                    "total_distance": total_distance,  # MapStore 호환성
                    "estimated_time": int(estimated_time)  # MapStore 호환성
                }
            )
                
        except Exception as calculation_error:
            logger.error(f"태그 기반 경로 계산 오류: {str(calculation_error)}")
            return APIResponse.error(
                message="경로 계산 중 오류가 발생했습니다.",
                code="CALCULATION_ERROR",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f"Calculate route by tags API error: {str(e)}")
        return APIResponse.error(
            message="태그 기반 경로 계산 요청 처리 중 오류가 발생했습니다.",
            code="API_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
