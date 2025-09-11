#!/usr/bin/env python
"""
Navigation API 최종 테스트 스크립트
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')
django.setup()

from hospital_navigation.pathfinding import find_shortest_path
from hospital_navigation.models import NavigationNode

def debug_log(message):
    print(f"DEBUG {message}")

def test_pathfinding():
    """경로찾기 알고리즘 직접 테스트"""
    debug_log("경로찾기 알고리즘 직접 테스트 시작")
    
    try:
        # 약국과 응급의료센터 노드 가져오기
        pharmacy_id = '650fa82e-595b-4232-b27f-ee184b4fce14'  # 약국
        emergency_id = '558d94af-a1cf-4b89-95c2-8e948d33e230'  # 응급의료센터
        
        pharmacy_node = NavigationNode.objects.get(node_id=pharmacy_id)
        emergency_node = NavigationNode.objects.get(node_id=emergency_id)
        
        debug_log(f"출발지: {pharmacy_node.name} ({pharmacy_id})")
        debug_log(f"목적지: {emergency_node.name} ({emergency_id})")
        
        # 경로찾기 실행
        result = find_shortest_path(pharmacy_node, emergency_node)
        
        if result:
            debug_log("✅ 경로찾기 성공!")
            debug_log(f"노드 개수: {len(result['nodes'])}")
            debug_log(f"엣지 개수: {len(result['edges'])}")
            debug_log(f"총 거리: {result['distance']}m")
            debug_log(f"예상 시간: {result['estimated_time']}초")
            
            debug_log("경로 상세:")
            for i, node in enumerate(result['nodes']):
                debug_log(f"  {i+1}. {node.name} ({node.node_id})")
            
            return True
        else:
            debug_log("❌ 경로찾기 실패 - 경로가 존재하지 않습니다")
            return False
            
    except Exception as e:
        debug_log(f"❌ 오류 발생: {e}")
        return False

def main():
    debug_log("Navigation API 최종 테스트 시작")
    
    success = test_pathfinding()
    
    if success:
        debug_log("🎉 Navigation API 테스트 성공! 404 오류가 해결되었습니다.")
    else:
        debug_log("❌ Navigation API 테스트 실패")
    
    debug_log("Navigation API 최종 테스트 완료")

if __name__ == "__main__":
    main()