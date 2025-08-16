#!/usr/bin/env python
"""
개선된 병원 지도에 맞춰 NavigationNode 좌표 업데이트
U자형 동선과 접근성을 고려한 새로운 레이아웃 적용
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')
django.setup()

from hospital_navigation.models import NavigationNode, HospitalMap
from django.db import transaction

def update_coordinates():
    """개선된 좌표로 업데이트"""
    
    print("\n" + "=" * 60)
    print("🗺️ NavigationNode 좌표 업데이트 시작")
    print("=" * 60)
    
    # 업데이트할 좌표 매핑
    coordinate_updates = {
        # 본관 1층 - U자형 동선 최적화
        '본관 정문': {'x': 500, 'y': 60},  # 상단 중앙
        '접수처': {'x': 160, 'y': 220},  # 101호 좌측 상단
        '채혈실': {'x': 160, 'y': 520},  # 102호 좌측 하단
        '원무과': {'x': 760, 'y': 220},  # 104호 우측 상단
        '약국': {'x': 760, 'y': 520},  # 105호 우측 하단
        '본관 엘리베이터 (1층)': {'x': 500, 'y': 400},  # 중앙으로 이동
        '본관 1층 중앙 복도': {'x': 500, 'y': 400},  # 중앙 교차점
        
        # 본관 2층 - 진료 존 형성
        '내과 대기실': {'x': 500, 'y': 180},  # 201호 중앙 상단
        '내과 진료실 1': {'x': 325, 'y': 350},  # 202호 좌측
        '내과 진료실 2': {'x': 500, 'y': 350},  # 203호 중앙
        '본관 엘리베이터 (2층)': {'x': 500, 'y': 600},  # 중앙
        '본관 2층 중앙 복도': {'x': 500, 'y': 400},  # 중앙 교차점
        
        # 암센터 1층 - 로비 중심 방사형
        '암센터 입구': {'x': 210, 'y': 450},  # 301호
        '암센터 로비': {'x': 600, 'y': 450},  # 302호 중앙
        '방사선치료실': {'x': 1000, 'y': 425},  # 303호 우측
        '암센터 엘리베이터 (1층)': {'x': 600, 'y': 650},  # 중앙
        
        # 암센터 2층 - 영상의학과 클러스터
        '영상의학과 접수': {'x': 200, 'y': 400},  # 401호 좌측
        'CT실': {'x': 550, 'y': 425},  # 403호 중앙
        'MRI실': {'x': 800, 'y': 425},  # 404호 우측
        'X-ray실': {'x': 800, 'y': 580},  # 405호 우측 하단
        '암센터 엘리베이터 (2층)': {'x': 300, 'y': 750},  # 좌측
    }
    
    # HospitalMap SVG 파일 경로 업데이트
    svg_updates = {
        '본관': {
            1: '/images/maps/main_1f.svg',
            2: '/images/maps/main_2f.svg'
        },
        '암센터': {
            1: '/images/maps/cancer_1f.svg',
            2: '/images/maps/cancer_2f.svg'
        }
    }
    
    with transaction.atomic():
        # NavigationNode 좌표 업데이트
        updated_count = 0
        not_found = []
        
        for node_name, coords in coordinate_updates.items():
            try:
                node = NavigationNode.objects.get(name=node_name)
                old_coords = (node.x_coord, node.y_coord)
                node.x_coord = coords['x']
                node.y_coord = coords['y']
                node.save()
                updated_count += 1
                print(f"  ✅ {node_name}: ({old_coords[0]}, {old_coords[1]}) → ({coords['x']}, {coords['y']})")
            except NavigationNode.DoesNotExist:
                not_found.append(node_name)
                print(f"  ❌ {node_name}: 노드를 찾을 수 없음")
        
        # HospitalMap SVG 경로 업데이트
        map_updated = 0
        for building, floors in svg_updates.items():
            for floor, svg_path in floors.items():
                try:
                    hospital_map = HospitalMap.objects.get(
                        building=building,
                        floor=floor
                    )
                    # metadata에 SVG 경로 추가
                    if not hospital_map.metadata:
                        hospital_map.metadata = {}
                    hospital_map.metadata['svg_file_path'] = svg_path
                    hospital_map.metadata['improved_layout'] = True
                    hospital_map.metadata['layout_version'] = '2.0'
                    hospital_map.metadata['accessibility_features'] = [
                        'wheelchair_accessible',
                        'elevator_central',
                        'wide_corridors',
                        'disabled_restrooms'
                    ]
                    hospital_map.save()
                    map_updated += 1
                    print(f"  ✅ {building} {floor}층 SVG 경로 업데이트: {svg_path}")
                except HospitalMap.DoesNotExist:
                    print(f"  ❌ {building} {floor}층 지도를 찾을 수 없음")
    
    print("\n" + "=" * 60)
    print(f"📊 업데이트 결과:")
    print(f"  • NavigationNode 좌표 업데이트: {updated_count}개")
    print(f"  • HospitalMap SVG 경로 업데이트: {map_updated}개")
    if not_found:
        print(f"  • 찾을 수 없는 노드: {', '.join(not_found)}")
    print("=" * 60)
    
    # 개선사항 요약
    print("\n🔥 적용된 개선사항:")
    print("  1. U자형 순환 동선 (정문→접수→채혈→원무과→약국)")
    print("  2. 엘리베이터 중앙 배치로 접근성 향상")
    print("  3. 진료 존(Zone) 형성으로 동선 최적화")
    print("  4. 방 번호 체계 도입 (101호~409호)")
    print("  5. 장애인 화장실 및 휴게실 추가")
    print("  6. 시각적 구역 분리 (색상별 존)")
    print("=" * 60)


if __name__ == '__main__':
    update_coordinates()