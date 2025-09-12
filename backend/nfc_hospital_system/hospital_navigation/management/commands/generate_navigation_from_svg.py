"""
SVG 파일에서 자동으로 NavigationNode와 NavigationEdge를 생성하는 Django management 명령어
"""

import os
import uuid
from django.core.management.base import BaseCommand
from django.conf import settings
from hospital_navigation.svg_parser import SVGCorridorAnalyzer
from hospital_navigation.models import NavigationNode, NavigationEdge, HospitalMap
import math


class Command(BaseCommand):
    help = 'SVG 파일에서 네비게이션 노드와 엣지를 자동 생성'

    def add_arguments(self, parser):
        parser.add_argument(
            '--svg-path',
            type=str,
            default='C:/Users/jyhne/Desktop/hywu/hanium/nfc-hospital-guide/frontend-pwa/public/images/maps/main_1f.svg',
            help='SVG 파일 경로'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='기존 네비게이션 데이터 삭제 후 새로 생성'
        )

    def handle(self, *args, **options):
        svg_path = options['svg_path']
        clear_existing = options['clear_existing']

        self.stdout.write(self.style.SUCCESS(f'🗺️ SVG 파일 분석 시작: {svg_path}'))

        if not os.path.exists(svg_path):
            self.stdout.write(self.style.ERROR(f'❌ SVG 파일을 찾을 수 없습니다: {svg_path}'))
            return

        # 기존 데이터 삭제 (옵션)
        if clear_existing:
            self.stdout.write('🧹 기존 네비게이션 데이터 삭제 중...')
            NavigationEdge.objects.all().delete()
            NavigationNode.objects.all().delete()
            self.stdout.write('✅ 기존 데이터 삭제 완료')

        # SVG 분석
        analyzer = SVGCorridorAnalyzer()
        analyzer.parse_svg_file(svg_path)
        analyzer.analyze_corridor_layout()
        
        # 네비게이션 그래프 생성
        graph = analyzer.generate_navigation_graph()
        
        self.stdout.write(f'📊 분석 결과:')
        self.stdout.write(f'   - 방 개수: {len(graph["rooms"])}')
        self.stdout.write(f'   - 네비게이션 노드: {len(graph["nodes"])}')
        self.stdout.write(f'   - 연결 엣지: {len(graph["edges"])}')

        # 지도 객체 생성 또는 가져오기
        hospital_map = self._get_or_create_hospital_map()
        
        # Django 모델에 저장
        self._save_nodes_to_database(graph['nodes'], hospital_map)
        self._save_edges_to_database(graph['edges'])
        
        self.stdout.write(self.style.SUCCESS('🎉 SVG 기반 네비게이션 시스템 생성 완료!'))

    def _get_or_create_hospital_map(self):
        """병원 지도 객체 생성 또는 가져오기"""
        hospital_map, created = HospitalMap.objects.get_or_create(
            building='본관',
            floor=1,
            defaults={
                'width': 900,
                'height': 600,
                'metadata': {'source': 'SVG 자동 생성', 'svg_path': 'main_1f.svg'}
            }
        )
        
        if created:
            self.stdout.write('🗺️ 병원 지도 생성 완료')
        else:
            self.stdout.write('🗺️ 기존 병원 지도 사용')
            
        return hospital_map

    def _save_nodes_to_database(self, nodes, hospital_map):
        """네비게이션 노드를 데이터베이스에 저장"""
        self.stdout.write('💾 네비게이션 노드 저장 중...')
        
        for node_data in nodes:
            node, created = NavigationNode.objects.get_or_create(
                node_id=self._generate_node_id(node_data['name']),
                defaults={
                    'map': hospital_map,
                    'name': node_data['name'],
                    'x_coord': node_data['x_coord'],
                    'y_coord': node_data['y_coord'],
                    'node_type': self._map_node_type(node_data['node_type']),
                    'description': f"SVG에서 자동 생성된 {node_data['name']} 노드"
                }
            )
            
            if created:
                self.stdout.write(f'   ✅ 노드 생성: {node.name} ({node.x_coord}, {node.y_coord})')
            else:
                # 기존 노드 업데이트
                node.x_coord = node_data['x_coord']
                node.y_coord = node_data['y_coord']
                node.node_type = self._map_node_type(node_data['node_type'])
                node.save()
                self.stdout.write(f'   🔄 노드 업데이트: {node.name}')

    def _save_edges_to_database(self, edges):
        """네비게이션 엣지를 데이터베이스에 저장"""
        self.stdout.write('🔗 네비게이션 엣지 저장 중...')
        
        for edge_data in edges:
            try:
                from_node = NavigationNode.objects.get(
                    node_id=self._generate_node_id(edge_data['from_node'])
                )
                to_node = NavigationNode.objects.get(
                    node_id=self._generate_node_id(edge_data['to_node'])
                )
                
                # 양방향 엣지 생성
                edge1, created1 = NavigationEdge.objects.get_or_create(
                    from_node=from_node,
                    to_node=to_node,
                    defaults={
                        'distance': round(edge_data['distance'], 2),
                        'walk_time': edge_data['walk_time'],
                        'edge_type': 'corridor',
                        'is_accessible': True  # 모든 경로를 접근 가능으로 설정
                    }
                )
                
                edge2, created2 = NavigationEdge.objects.get_or_create(
                    from_node=to_node,
                    to_node=from_node,
                    defaults={
                        'distance': round(edge_data['distance'], 2),
                        'walk_time': edge_data['walk_time'],
                        'edge_type': 'corridor',
                        'is_accessible': True
                    }
                )
                
                if created1 or created2:
                    self.stdout.write(f'   ✅ 엣지 생성: {from_node.name} ↔ {to_node.name} ({edge_data["distance"]:.1f}m)')
                
            except NavigationNode.DoesNotExist as e:
                self.stdout.write(f'   ❌ 노드를 찾을 수 없음: {e}')

    def _generate_node_id(self, name: str) -> uuid.UUID:
        """노드 이름에서 UUID 생성 (결정론적)"""
        # 한글을 영문으로 간단히 매핑
        name_mapping = {
            '응급의료센터': 'emergency_center',
            '진단검사의학과': 'diagnostic_lab', 
            '채혈실': 'blood_draw',
            '헌혈실': 'blood_donation',
            '약국': 'pharmacy',
            '카페': 'cafe',
            '은행': 'bank',
            '원무과': 'administration',
            '입구': 'entrance'
        }
        
        # 매핑된 이름이 있으면 사용, 없으면 원본 이름 사용
        clean_name = name
        for korean, english in name_mapping.items():
            if korean in clean_name:
                clean_name = clean_name.replace(korean, english)
                
        # 공백을 언더스코어로 변경하고 특수문자 제거
        clean_name = clean_name.lower().replace(' ', '_').replace('_입구', '_entrance')
        
        # 이름 기반으로 결정론적 UUID 생성 (같은 이름은 항상 같은 UUID)
        namespace = uuid.NAMESPACE_DNS
        return uuid.uuid5(namespace, clean_name)

    def _map_node_type(self, svg_node_type: str) -> str:
        """SVG 노드 타입을 Django 모델의 노드 타입으로 매핑"""
        # NavigationNode 모델의 NODE_TYPE_CHOICES에서 허용하는 값들
        type_mapping = {
            'room_entrance': 'exam_room',  # 방 입구 → 검사실
            'junction': 'junction',        # 교차점 → 교차점
            'corridor': 'junction'         # 복도 → 교차점 (별도 복도 타입이 없음)
        }
        
        return type_mapping.get(svg_node_type, 'exam_room')

    def _create_additional_corridor_nodes(self):
        """추가 복도 노드 생성 (방 사이의 연결점)"""
        self.stdout.write('🛤️  추가 복도 연결점 생성 중...')
        
        # 주요 복도 교차점들 (SVG 분석 결과 기반)
        corridor_nodes = [
            {
                'node_id': 'main_corridor_center',
                'name': '중앙복도',
                'x_coord': 400,
                'y_coord': 300,
                'node_type': 'hallway'
            },
            {
                'node_id': 'north_corridor',
                'name': '북쪽복도',
                'x_coord': 500,
                'y_coord': 200,
                'node_type': 'hallway'
            },
            {
                'node_id': 'south_corridor',
                'name': '남쪽복도',  
                'x_coord': 400,
                'y_coord': 400,
                'node_type': 'hallway'
            }
        ]
        
        for node_data in corridor_nodes:
            node, created = NavigationNode.objects.get_or_create(
                node_id=node_data['node_id'],
                defaults={
                    'name': node_data['name'],
                    'x_coord': node_data['x_coord'],
                    'y_coord': node_data['y_coord'],
                    'node_type': node_data['node_type'],
                    'floor': 1,
                    'building': 'main',
                    'description': f"자동 생성된 {node_data['name']} 연결점"
                }
            )
            
            if created:
                self.stdout.write(f'   ✅ 복도 노드 생성: {node.name}')