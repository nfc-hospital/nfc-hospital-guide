#!/usr/bin/env python
"""
Navigation 데이터베이스 디버깅 스크립트
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')
django.setup()

from hospital_navigation.models import NavigationNode, NavigationEdge
from nfc.models import NFCTag

# 로그 함수
def debug_log(message):
    print(f"DEBUG {message}")

def main():
    debug_log("Navigation 데이터베이스 상태 확인 시작")
    
    # 1. NavigationNode 개수 확인
    node_count = NavigationNode.objects.count()
    debug_log(f"NavigationNode 총 개수: {node_count}")
    
    # 2. NavigationEdge 개수 확인
    edge_count = NavigationEdge.objects.count()
    debug_log(f"NavigationEdge 총 개수: {edge_count}")
    
    # 3. 약국(pharmacy) 관련 노드 찾기
    pharmacy_node_id = '650fa82e-595b-4232-b27f-ee184b4fce14'
    try:
        pharmacy_node = NavigationNode.objects.get(node_id=pharmacy_node_id)
        debug_log(f"약국 노드 발견: {pharmacy_node.name} at ({pharmacy_node.x_coord}, {pharmacy_node.y_coord})")
    except NavigationNode.DoesNotExist:
        debug_log("약국 노드를 찾을 수 없습니다!")
        return
    
    # 4. 약국에서 시작하는 엣지들 확인
    outgoing_edges = NavigationEdge.objects.filter(from_node=pharmacy_node)
    debug_log(f"약국에서 나가는 엣지 개수: {outgoing_edges.count()}")
    for edge in outgoing_edges[:5]:  # 최대 5개만 표시
        debug_log(f"  -> {edge.to_node.name} (거리: {edge.distance}m, 타입: {edge.edge_type})")
    
    # 5. 약국으로 들어오는 엣지들 확인
    incoming_edges = NavigationEdge.objects.filter(to_node=pharmacy_node)
    debug_log(f"약국으로 들어오는 엣지 개수: {incoming_edges.count()}")
    for edge in incoming_edges[:5]:  # 최대 5개만 표시
        debug_log(f"  {edge.from_node.name} -> (거리: {edge.distance}m, 타입: {edge.edge_type})")
    
    # 6. 응급의료센터 노드 찾기 (facilityManagement.js에서 emergency node_id)
    emergency_node_id = '558d94af-a1cf-4b89-95c2-8e948d33e230'
    try:
        emergency_node = NavigationNode.objects.get(node_id=emergency_node_id)
        debug_log(f"응급의료센터 노드 발견: {emergency_node.name} at ({emergency_node.x_coord}, {emergency_node.y_coord})")
    except NavigationNode.DoesNotExist:
        debug_log("응급의료센터 노드를 찾을 수 없습니다!")
        
    # 7. 전체 노드 목록 확인 (최대 10개)
    debug_log("전체 노드 목록 (최대 10개):")
    for node in NavigationNode.objects.all()[:10]:
        debug_log(f"  {node.node_id}: {node.name} ({node.node_type})")
    
    # 8. 그래프 연결성 확인 - 양방향 엣지 있는지
    bidirectional_count = NavigationEdge.objects.filter(is_bidirectional=True).count()
    debug_log(f"양방향 엣지 개수: {bidirectional_count}")
    
    debug_log("Navigation 데이터베이스 상태 확인 완료")

if __name__ == "__main__":
    main()