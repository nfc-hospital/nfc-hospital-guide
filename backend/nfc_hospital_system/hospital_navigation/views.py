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
    """경로 계산 서비스 - Dijkstra 알고리즘 사용"""
    
    @staticmethod
    def find_shortest_path(
        start_node: NavigationNode,
        end_node: NavigationNode,
        is_accessible: bool = False,
        avoid_stairs: bool = False,
        avoid_crowded: bool = False
    ) -> Tuple[List[str], List[str], float, int]:
        """
        최단 경로 계산
        Returns: (path_nodes, path_edges, total_distance, estimated_time)
        """
        if start_node == end_node:
            return ([str(start_node.node_id)], [], 0, 0)
        
        # 그래프 구축
        graph = defaultdict(list)
        edges_dict = {}
        
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
            if avoid_crowded and edge.avg_congestion > 0.7:
                continue
            
            # 양방향 엣지 처리
            weight = edge.walk_time  # 시간 기준 최적화
            graph[str(edge.from_node.node_id)].append(
                (str(edge.to_node.node_id), weight, str(edge.edge_id))
            )
            edges_dict[str(edge.edge_id)] = edge
            
            if edge.is_bidirectional:
                graph[str(edge.to_node.node_id)].append(
                    (str(edge.from_node.node_id), weight, str(edge.edge_id))
                )
        
        # Dijkstra 알고리즘
        start_id = str(start_node.node_id)
        end_id = str(end_node.node_id)
        
        distances = {start_id: 0}
        previous_nodes = {}
        previous_edges = {}
        priority_queue = [(0, start_id)]
        visited = set()
        
        while priority_queue:
            current_distance, current_node = heapq.heappop(priority_queue)
            
            if current_node in visited:
                continue
            
            visited.add(current_node)
            
            if current_node == end_id:
                break
            
            for neighbor, weight, edge_id in graph[current_node]:
                distance = current_distance + weight
                
                if neighbor not in distances or distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous_nodes[neighbor] = current_node
                    previous_edges[neighbor] = edge_id
                    heapq.heappush(priority_queue, (distance, neighbor))
        
        # 경로 복원
        if end_id not in previous_nodes:
            # 경로를 찾을 수 없음
            return ([], [], 0, 0)
        
        path_nodes = []
        path_edges = []
        current = end_id
        
        while current != start_id:
            path_nodes.append(current)
            if current in previous_edges:
                path_edges.append(previous_edges[current])
            current = previous_nodes[current]
        
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
