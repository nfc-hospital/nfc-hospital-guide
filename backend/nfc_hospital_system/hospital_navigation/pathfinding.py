# hospital_navigation/pathfinding.py
"""
병원 내 경로 탐색 알고리즘 구현
A* 알고리즘을 사용하여 최단 경로를 찾습니다.
"""

import heapq
from typing import List, Dict, Tuple, Optional
from django.db.models import Q
from .models import NavigationNode, NavigationEdge
import math


def heuristic(node1, node2):
    """유클리드 거리를 휴리스틱으로 사용"""
    return math.sqrt(
        (node1.x_coord - node2.x_coord) ** 2 + 
        (node1.y_coord - node2.y_coord) ** 2
    )


def find_shortest_path(
    start_node: NavigationNode, 
    end_node: NavigationNode,
    avoid_stairs: bool = False,
    is_accessible: bool = False
) -> Optional[Dict]:
    """
    A* 알고리즘을 사용하여 두 노드 사이의 최단 경로를 찾습니다.
    
    Args:
        start_node: 출발 노드
        end_node: 도착 노드
        avoid_stairs: 계단 회피 여부
        is_accessible: 접근성 경로만 사용할지 여부
    
    Returns:
        경로 정보를 담은 딕셔너리 또는 None
    """
    
    if start_node.node_id == end_node.node_id:
        return {
            "nodes": [start_node],
            "edges": [],
            "distance": 0,
            "estimated_time": 0,
            "steps": []
        }
    
    # 그래프 구축 - 인접 리스트 형태
    graph = {}
    edge_dict = {}
    
    # 엣지 필터링
    edge_filter = Q()
    if is_accessible:
        edge_filter &= Q(is_accessible=True)
    
    edges = NavigationEdge.objects.filter(edge_filter).select_related('from_node', 'to_node')
    
    for edge in edges:
        # 계단 회피
        if avoid_stairs and edge.edge_type == 'stairs':
            continue
        
        from_id = edge.from_node.node_id
        to_id = edge.to_node.node_id
        
        # 그래프에 엣지 추가
        if from_id not in graph:
            graph[from_id] = []
        graph[from_id].append((to_id, edge))
        
        # 양방향 엣지 처리
        if edge.is_bidirectional:
            if to_id not in graph:
                graph[to_id] = []
            graph[to_id].append((from_id, edge))
        
        edge_dict[edge.edge_id] = edge
    
    # A* 알고리즘 구현
    open_set = []
    heapq.heappush(open_set, (0, start_node.node_id))
    
    came_from = {}
    edge_used = {}
    g_score = {start_node.node_id: 0}
    f_score = {start_node.node_id: heuristic(start_node, end_node)}
    
    nodes_dict = {
        start_node.node_id: start_node,
        end_node.node_id: end_node
    }
    
    while open_set:
        current_f, current_id = heapq.heappop(open_set)
        
        # 목표 도달
        if current_id == end_node.node_id:
            # 경로 복원
            path_nodes = []
            path_edges = []
            current = current_id
            
            while current in came_from:
                if current not in nodes_dict:
                    nodes_dict[current] = NavigationNode.objects.get(node_id=current)
                path_nodes.append(nodes_dict[current])
                
                if current in edge_used:
                    path_edges.append(edge_used[current])
                
                current = came_from[current]
            
            # 시작 노드 추가
            path_nodes.append(start_node)
            path_nodes.reverse()
            path_edges.reverse()
            
            # 총 거리와 예상 시간 계산
            total_distance = 0
            estimated_time = 0
            for edge in path_edges:
                total_distance += edge.distance
                estimated_time += edge.walk_time
            
            # 단계별 안내 생성
            steps = generate_navigation_steps(path_nodes, path_edges)
            
            return {
                "nodes": path_nodes,
                "edges": path_edges,
                "distance": total_distance,
                "estimated_time": estimated_time,
                "steps": steps
            }
        
        # 현재 노드에 연결된 이웃 탐색
        if current_id in graph:
            for neighbor_id, edge in graph[current_id]:
                tentative_g_score = g_score[current_id] + edge.distance
                
                if neighbor_id not in g_score or tentative_g_score < g_score[neighbor_id]:
                    came_from[neighbor_id] = current_id
                    edge_used[neighbor_id] = edge
                    g_score[neighbor_id] = tentative_g_score
                    
                    # 이웃 노드 정보 가져오기 (캐싱)
                    if neighbor_id not in nodes_dict:
                        nodes_dict[neighbor_id] = NavigationNode.objects.get(node_id=neighbor_id)
                    
                    f_score[neighbor_id] = g_score[neighbor_id] + heuristic(nodes_dict[neighbor_id], end_node)
                    
                    # 우선순위 큐에 추가
                    heapq.heappush(open_set, (f_score[neighbor_id], neighbor_id))
    
    # 경로를 찾지 못함
    return None


def generate_navigation_steps(nodes: List[NavigationNode], edges: List[NavigationEdge]) -> List[Dict]:
    """
    경로 노드와 엣지를 바탕으로 단계별 안내를 생성합니다.
    """
    steps = []
    
    for i, node in enumerate(nodes):
        instruction = ""
        direction = "straight"
        distance = 0
        
        if i == 0:
            # 시작점
            instruction = f"{node.name}에서 출발하세요"
        elif i == len(nodes) - 1:
            # 도착점
            instruction = f"{node.name}에 도착했습니다"
        else:
            # 중간 경로
            if i < len(edges):
                edge = edges[i]
                
                # 이동 수단에 따른 안내
                if edge.edge_type == 'elevator':
                    instruction = f"엘리베이터를 이용하여 {nodes[i+1].map.floor}층으로 이동하세요"
                elif edge.edge_type == 'stairs':
                    instruction = f"계단을 이용하여 {nodes[i+1].map.floor}층으로 이동하세요"
                elif edge.edge_type == 'escalator':
                    instruction = f"에스컬레이터를 이용하여 {nodes[i+1].map.floor}층으로 이동하세요"
                else:
                    instruction = f"{node.name}을(를) 지나 {nodes[i+1].name}(으)로 이동하세요"
                
                distance = edge.distance
                
                # 방향 계산 (간단한 예시)
                if i > 0:
                    prev_node = nodes[i-1]
                    curr_node = nodes[i]
                    next_node = nodes[i+1] if i+1 < len(nodes) else None
                    
                    if next_node:
                        # 이전 방향과 다음 방향의 각도 계산
                        angle = calculate_turn_angle(prev_node, curr_node, next_node)
                        if angle > 45:
                            direction = "turn_right"
                        elif angle < -45:
                            direction = "turn_left"
        
        steps.append({
            "step": i + 1,
            "instruction": instruction,
            "direction": direction,
            "distance": distance,
            "node": {
                "id": str(node.node_id),
                "name": node.name,
                "x": node.x_coord,
                "y": node.y_coord,
                "floor": node.map.floor if node.map else None,
                "building": node.map.building if node.map else None
            }
        })
    
    return steps


def calculate_turn_angle(prev_node, curr_node, next_node):
    """
    세 노드 사이의 회전 각도를 계산합니다.
    """
    # 벡터 계산
    v1_x = curr_node.x_coord - prev_node.x_coord
    v1_y = curr_node.y_coord - prev_node.y_coord
    v2_x = next_node.x_coord - curr_node.x_coord
    v2_y = next_node.y_coord - curr_node.y_coord
    
    # 외적을 이용한 각도 계산 (간단한 구현)
    cross = v1_x * v2_y - v1_y * v2_x
    
    return cross  # 양수면 우회전, 음수면 좌회전