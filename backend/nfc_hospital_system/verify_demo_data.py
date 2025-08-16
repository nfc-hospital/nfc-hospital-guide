#!/usr/bin/env python
"""
생성된 시연 데이터 검증 스크립트
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')
django.setup()

from hospital_navigation.models import (
    HospitalMap, NavigationNode, NavigationEdge, 
    PatientRoute, RouteProgress
)
from nfc.models import NFCTag
from appointments.models import Exam
from django.db.models import Count


def verify_data():
    print("\n" + "=" * 60)
    print("🔍 시연 데이터 검증 시작")
    print("=" * 60)
    
    # 1. 병원 지도 확인
    print("\n📍 병원 지도:")
    maps = HospitalMap.objects.all()
    for map_obj in maps:
        node_count = NavigationNode.objects.filter(map=map_obj).count()
        print(f"  • {map_obj.building} {map_obj.floor}층 - {node_count}개 노드")
    
    # 2. 주요 노드 확인
    print("\n📍 주요 네비게이션 노드:")
    key_nodes = NavigationNode.objects.filter(
        node_type__in=['entrance', 'exam_room', 'facility', 'waiting_area']
    ).order_by('map__building', 'map__floor', 'name')[:10]
    
    for node in key_nodes:
        extras = []
        if node.nfc_tag:
            extras.append(f"NFC: {node.nfc_tag.code}")
        if node.exam:
            extras.append(f"검사: {node.exam.title}")
        extra_info = f" ({', '.join(extras)})" if extras else ""
        print(f"  • [{node.map.building} {node.map.floor}F] {node.name}{extra_info}")
    
    # 3. 연결성 확인
    print("\n📍 노드 연결성:")
    nodes_with_edges = NavigationNode.objects.annotate(
        out_count=Count('outgoing_edges'),
        in_count=Count('incoming_edges')
    ).filter(out_count__gt=0)
    
    print(f"  • 연결된 노드: {nodes_with_edges.count()}개")
    print(f"  • 총 엣지: {NavigationEdge.objects.count()}개")
    print(f"  • 양방향 엣지: {NavigationEdge.objects.filter(is_bidirectional=True).count()}개")
    
    # 4. NFC 태그 연결 상태
    print("\n📍 NFC 태그 연결:")
    connected_tags = NavigationNode.objects.filter(nfc_tag__isnull=False)
    for node in connected_tags:
        print(f"  • {node.nfc_tag.code} → {node.name}")
    
    # 5. 검사실 연결 상태
    print("\n📍 검사실 연결:")
    connected_exams = NavigationNode.objects.filter(exam__isnull=False)
    for node in connected_exams:
        print(f"  • {node.exam.title} → {node.name}")
    
    # 6. 샘플 경로 확인
    print("\n📍 생성된 경로:")
    routes = PatientRoute.objects.all()
    for route in routes:
        progress_count = RouteProgress.objects.filter(route=route).count()
        waypoint_count = len(route.path_nodes) if route.path_nodes else 0
        print(f"  • {route.start_node.name} → {route.end_node.name}")
        print(f"    - 경유지: {waypoint_count}개, 진행기록: {progress_count}개")
        print(f"    - 거리: {route.total_distance}m, 예상시간: {route.estimated_time//60}분")
    
    # 7. 9단계 여정 가능 여부 확인
    print("\n✅ 9단계 환자 여정 시연 가능 여부:")
    
    required_nodes = {
        '1. 미등록': NavigationNode.objects.filter(name__contains='정문').exists(),
        '2. 도착': NavigationNode.objects.filter(name__contains='접수').exists(),
        '3. 등록완료': NavigationNode.objects.filter(name__contains='채혈').exists(),
        '4. 대기': NavigationNode.objects.filter(name__contains='대기실').exists(),
        '5. 호출': NavigationNode.objects.filter(name__contains='진료실').exists(),
        '6. 진행중': NavigationNode.objects.filter(name__contains='CT').exists(),
        '7. 완료': NavigationNode.objects.filter(name__contains='원무').exists(),
        '8. 수납': NavigationNode.objects.filter(name__contains='약국').exists(),
    }
    
    all_ready = True
    for stage, exists in required_nodes.items():
        status = "✅" if exists else "❌"
        print(f"  {status} {stage}")
        if not exists:
            all_ready = False
    
    print("\n" + "=" * 60)
    if all_ready:
        print("🎉 모든 시연 데이터가 정상적으로 생성되었습니다!")
        print("   9단계 환자 여정 시연이 가능합니다.")
    else:
        print("⚠️ 일부 데이터가 누락되었습니다.")
        print("   create_navigation_demo_data 명령을 다시 실행하세요.")
    print("=" * 60)


if __name__ == '__main__':
    verify_data()