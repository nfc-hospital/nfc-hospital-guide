#!/usr/bin/env python
"""
Navigation 그래프 연결성 수정 스크립트
약국과 응급의료센터를 메인 그래프에 연결합니다.
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')
django.setup()

from hospital_navigation.models import NavigationNode, NavigationEdge
import uuid

def debug_log(message):
    print(f"DEBUG {message}")

def main():
    debug_log("Navigation 연결성 수정 시작")
    
    try:
        # 주요 노드들 가져오기
        pharmacy_id = '650fa82e-595b-4232-b27f-ee184b4fce14'  # 약국
        emergency_id = '558d94af-a1cf-4b89-95c2-8e948d33e230'  # 응급의료센터
        info_desk_id = '497071c2-a868-408c-9595-3cb597b15bae'  # 안내데스크
        administration_id = '260fa931-7998-464c-a487-37851f29f8b1'  # 원무과
        
        pharmacy_node = NavigationNode.objects.get(node_id=pharmacy_id)
        emergency_node = NavigationNode.objects.get(node_id=emergency_id)
        info_desk_node = NavigationNode.objects.get(node_id=info_desk_id)
        administration_node = NavigationNode.objects.get(node_id=administration_id)
        
        debug_log(f"노드 확인 완료: 약국, 응급의료센터, 안내데스크, 원무과")
        
        # 연결성 추가
        edges_to_create = [
            # 약국 <-> 안내데스크 연결 (본관 1층)
            {
                'from_node': info_desk_node,
                'to_node': pharmacy_node,
                'distance': 15.0,
                'walk_time': 20,
                'edge_type': 'corridor'
            },
            
            # 안내데스크 <-> 원무과 연결
            {
                'from_node': info_desk_node,
                'to_node': administration_node,
                'distance': 10.0,
                'walk_time': 15,
                'edge_type': 'corridor'
            },
            
            # 안내데스크 <-> 응급의료센터 연결
            {
                'from_node': info_desk_node,
                'to_node': emergency_node,
                'distance': 25.0,
                'walk_time': 35,
                'edge_type': 'corridor'
            },
            
            # 원무과 <-> 응급의료센터 직접 연결
            {
                'from_node': administration_node,
                'to_node': emergency_node,
                'distance': 20.0,
                'walk_time': 30,
                'edge_type': 'corridor'
            }
        ]
        
        created_count = 0
        
        for edge_data in edges_to_create:
            # 기존 엣지가 있는지 확인
            existing = NavigationEdge.objects.filter(
                from_node=edge_data['from_node'],
                to_node=edge_data['to_node']
            ).exists()
            
            if not existing:
                NavigationEdge.objects.create(
                    edge_id=uuid.uuid4(),
                    from_node=edge_data['from_node'],
                    to_node=edge_data['to_node'],
                    distance=edge_data['distance'],
                    walk_time=edge_data['walk_time'],
                    edge_type=edge_data['edge_type'],
                    is_bidirectional=True,
                    is_accessible=True
                )
                created_count += 1
                debug_log(f"엣지 생성: {edge_data['from_node'].name} -> {edge_data['to_node'].name}")
            else:
                debug_log(f"엣지 이미 존재: {edge_data['from_node'].name} -> {edge_data['to_node'].name}")
        
        debug_log(f"총 {created_count}개의 새로운 엣지를 생성했습니다")
        
        # 연결성 확인
        total_edges = NavigationEdge.objects.count()
        debug_log(f"전체 엣지 개수: {total_edges}")
        
        debug_log("Navigation 연결성 수정 완료!")
        
    except Exception as e:
        debug_log(f"오류 발생: {e}")

if __name__ == "__main__":
    main()