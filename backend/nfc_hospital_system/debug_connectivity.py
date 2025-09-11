#!/usr/bin/env python
"""
Navigation 그래프 연결성 분석 스크립트
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')
django.setup()

from hospital_navigation.models import NavigationNode, NavigationEdge
from collections import defaultdict, deque

def debug_log(message):
    print(f"DEBUG {message}")

def build_graph():
    """그래프 구조를 구축합니다"""
    graph = defaultdict(list)
    edges = NavigationEdge.objects.select_related('from_node', 'to_node').all()
    
    for edge in edges:
        from_id = edge.from_node.node_id
        to_id = edge.to_node.node_id
        
        graph[from_id].append((to_id, edge))
        
        # 양방향 엣지 처리
        if edge.is_bidirectional:
            graph[to_id].append((from_id, edge))
    
    return graph

def find_connected_components(graph, all_node_ids):
    """연결된 컴포넌트를 찾습니다"""
    visited = set()
    components = []
    
    for node_id in all_node_ids:
        if node_id not in visited:
            component = []
            queue = deque([node_id])
            visited.add(node_id)
            
            while queue:
                current = queue.popleft()
                component.append(current)
                
                for neighbor_id, edge in graph[current]:
                    if neighbor_id not in visited:
                        visited.add(neighbor_id)
                        queue.append(neighbor_id)
            
            components.append(component)
    
    return components

def main():
    debug_log("Navigation 그래프 연결성 분석 시작")
    
    # 그래프 구축
    graph = build_graph()
    debug_log(f"그래프에서 노드 개수: {len(graph)}")
    
    # 모든 노드 ID 수집
    all_nodes = NavigationNode.objects.all()
    all_node_ids = [node.node_id for node in all_nodes]
    node_names = {node.node_id: node.name for node in all_nodes}
    
    # 연결된 컴포넌트 분석
    components = find_connected_components(graph, all_node_ids)
    debug_log(f"연결된 컴포넌트 개수: {len(components)}")
    
    for i, component in enumerate(components):
        debug_log(f"컴포넌트 {i+1} (노드 {len(component)}개):")
        for node_id in component:
            node_name = node_names.get(node_id, 'Unknown')
            debug_log(f"  - {node_name} ({node_id})")
        debug_log("")
    
    # 약국과 응급의료센터가 같은 컴포넌트에 있는지 확인
    pharmacy_id = '650fa82e-595b-4232-b27f-ee184b4fce14'
    emergency_id = '558d94af-a1cf-4b89-95c2-8e948d33e230'
    
    pharmacy_component = None
    emergency_component = None
    
    for i, component in enumerate(components):
        if pharmacy_id in component:
            pharmacy_component = i
        if emergency_id in component:
            emergency_component = i
    
    debug_log(f"약국은 컴포넌트 {pharmacy_component + 1 if pharmacy_component is not None else None}에 있습니다")
    debug_log(f"응급의료센터는 컴포넌트 {emergency_component + 1 if emergency_component is not None else None}에 있습니다")
    
    if pharmacy_component == emergency_component:
        debug_log("✅ 약국과 응급의료센터가 같은 연결된 그래프에 있습니다!")
    else:
        debug_log("❌ 약국과 응급의료센터가 분리된 그래프에 있습니다. 경로가 존재하지 않습니다!")
    
    # 각 노드의 연결도 분석
    debug_log("\n노드별 연결도 분석:")
    for node in all_nodes:
        connections = len(graph[node.node_id])
        debug_log(f"  {node.name}: {connections}개 연결")
    
    debug_log("Navigation 그래프 연결성 분석 완료")

if __name__ == "__main__":
    main()