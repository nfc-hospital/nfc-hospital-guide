#!/usr/bin/env python
"""경로 디버깅 스크립트"""

import os
import sys
import django
from pathlib import Path

# Django 설정
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')
django.setup()

from hospital_navigation.models import NavigationEdge, NavigationNode
from django.db import models

def debug_node_connections():
    # 연결이 많은 노드들을 찾기
    print("=== 노드별 연결 상태 분석 ===")
    nodes = NavigationNode.objects.all()
    
    node_connections = []
    for node in nodes:
        out_count = NavigationEdge.objects.filter(from_node=node).count()
        in_count = NavigationEdge.objects.filter(to_node=node, is_bidirectional=True).count()
        total = out_count + in_count
        node_connections.append((node, total, out_count, in_count))
    
    # 연결 수가 많은 순으로 정렬
    node_connections.sort(key=lambda x: x[1], reverse=True)
    
    print("연결이 많은 노드들:")
    for node, total, out, in_count in node_connections[:10]:
        print(f"  {node.name}: {total}개 연결 (나가기:{out}, 양방향:{in_count}) - {str(node.node_id)[:8]}...")
    
    print()
    
    # 연결이 많은 두 노드를 선택해서 경로 테스트
    if len(node_connections) >= 2:
        node1 = node_connections[0][0]  # 가장 연결이 많은 노드
        node2 = node_connections[1][0]  # 두 번째로 연결이 많은 노드
        
        print(f"=== 경로 테스트: {node1.name} → {node2.name} ===")
        
        from hospital_navigation.views import RouteCalculationService
        result = RouteCalculationService.find_shortest_path(node1, node2)
        
        print(f"경로 계산 결과:")
        print(f"  노드 수: {len(result[0])}")
        print(f"  거리: {result[2]:.1f}")
        print(f"  시간: {result[3]:.0f}초")
        
        if result[0]:
            print(f"  노드 ID들: {result[0]}")
            return node1.node_id, node2.node_id
    
    return None, None

if __name__ == "__main__":
    debug_node_connections()