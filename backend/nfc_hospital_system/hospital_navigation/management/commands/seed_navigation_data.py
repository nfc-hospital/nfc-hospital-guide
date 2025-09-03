# hospital_navigation/management/commands/seed_navigation_data.py
"""
병원 내 네비게이션 테스트 데이터 생성 커맨드
실제 병원의 3층 구조를 시뮬레이션합니다.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from hospital_navigation.models import HospitalMap, NavigationNode, NavigationEdge
from nfc.models import NFCTag
import uuid


class Command(BaseCommand):
    help = '병원 네비게이션을 위한 테스트 노드와 엣지 데이터를 생성합니다.'

    def handle(self, *args, **options):
        self.stdout.write('네비게이션 테스트 데이터 생성을 시작합니다...')
        
        with transaction.atomic():
            # 1. Map 생성
            maps = self.create_maps()
            self.stdout.write(self.style.SUCCESS(f'✓ {len(maps)}개의 맵을 생성했습니다.'))
            
            # 2. NavigationNode 생성
            nodes = self.create_navigation_nodes(maps)
            self.stdout.write(self.style.SUCCESS(f'✓ {len(nodes)}개의 노드를 생성했습니다.'))
            
            # 3. NavigationEdge 생성
            edges = self.create_navigation_edges(nodes)
            self.stdout.write(self.style.SUCCESS(f'✓ {len(edges)}개의 엣지를 생성했습니다.'))
            
            # 4. NFCTag와 NavigationNode 연결
            self.link_nfc_tags_to_nodes(nodes)
            self.stdout.write(self.style.SUCCESS('✓ NFC 태그와 노드를 연결했습니다.'))
            
        self.stdout.write(self.style.SUCCESS('네비게이션 테스트 데이터 생성이 완료되었습니다!'))

    def create_maps(self):
        """각 층의 맵 정보 생성"""
        maps_data = [
            {
                'building': '본관',
                'floor': 1,
                'svg_data': '<svg><!-- 1층 지도 데이터 --></svg>',
                'image_url': '/static/maps/floor1.svg',
                'scale': 1.0,
                'width': 1000,
                'height': 800,
                'metadata': {'description': '접수처, 약국, 응급실, 카페테리아'},
                'is_active': True
            },
            {
                'building': '본관',
                'floor': 2,
                'svg_data': '<svg><!-- 2층 지도 데이터 --></svg>',
                'image_url': '/static/maps/floor2.svg',
                'scale': 1.0,
                'width': 1000,
                'height': 800,
                'metadata': {'description': '내과, 외과, 정형외과, 영상의학과'},
                'is_active': True
            },
            {
                'building': '본관',
                'floor': 3,
                'svg_data': '<svg><!-- 3층 지도 데이터 --></svg>',
                'image_url': '/static/maps/floor3.svg',
                'scale': 1.0,
                'width': 1000,
                'height': 800,
                'metadata': {'description': '산부인과, 소아과, 이비인후과, 안과'},
                'is_active': True
            }
        ]
        
        maps = {}
        for data in maps_data:
            floor = data['floor']
            map_obj, created = HospitalMap.objects.get_or_create(
                building=data['building'],
                floor=data['floor'],
                defaults=data
            )
            maps[floor] = map_obj
            
        return maps

    def create_navigation_nodes(self, maps):
        """각 층의 주요 위치에 노드 생성"""
        nodes_data = [
            # 1층 노드
            {'floor': 1, 'name': '정문 로비', 'node_type': 'entrance', 'x': 500, 'y': 100},
            {'floor': 1, 'name': '접수처', 'node_type': 'junction', 'x': 500, 'y': 300},
            {'floor': 1, 'name': '약국', 'node_type': 'facility', 'x': 300, 'y': 300},
            {'floor': 1, 'name': '응급실', 'node_type': 'facility', 'x': 700, 'y': 300},
            {'floor': 1, 'name': '카페테리아', 'node_type': 'facility', 'x': 500, 'y': 500},
            {'floor': 1, 'name': '엘리베이터 1층', 'node_type': 'elevator', 'x': 400, 'y': 400},
            {'floor': 1, 'name': '계단 1층', 'node_type': 'stairs', 'x': 600, 'y': 400},
            {'floor': 1, 'name': '화장실 1층', 'node_type': 'restroom', 'x': 350, 'y': 400},
            
            # 2층 노드
            {'floor': 2, 'name': '내과 대기실', 'node_type': 'waiting_area', 'x': 300, 'y': 200},
            {'floor': 2, 'name': '내과 진료실', 'node_type': 'exam_room', 'x': 300, 'y': 300},
            {'floor': 2, 'name': '외과 대기실', 'node_type': 'waiting_area', 'x': 700, 'y': 200},
            {'floor': 2, 'name': '외과 진료실', 'node_type': 'exam_room', 'x': 700, 'y': 300},
            {'floor': 2, 'name': '정형외과 진료실', 'node_type': 'exam_room', 'x': 500, 'y': 200},
            {'floor': 2, 'name': '영상의학과 접수', 'node_type': 'junction', 'x': 500, 'y': 400},
            {'floor': 2, 'name': 'X-Ray실', 'node_type': 'exam_room', 'x': 400, 'y': 500},
            {'floor': 2, 'name': 'CT실', 'node_type': 'exam_room', 'x': 600, 'y': 500},
            {'floor': 2, 'name': '엘리베이터 2층', 'node_type': 'elevator', 'x': 400, 'y': 400},
            {'floor': 2, 'name': '계단 2층', 'node_type': 'stairs', 'x': 600, 'y': 400},
            {'floor': 2, 'name': '화장실 2층', 'node_type': 'restroom', 'x': 350, 'y': 400},
            
            # 3층 노드
            {'floor': 3, 'name': '산부인과 대기실', 'node_type': 'waiting_area', 'x': 300, 'y': 200},
            {'floor': 3, 'name': '산부인과 진료실', 'node_type': 'exam_room', 'x': 300, 'y': 300},
            {'floor': 3, 'name': '소아과 대기실', 'node_type': 'waiting_area', 'x': 700, 'y': 200},
            {'floor': 3, 'name': '소아과 진료실', 'node_type': 'exam_room', 'x': 700, 'y': 300},
            {'floor': 3, 'name': '이비인후과 진료실', 'node_type': 'exam_room', 'x': 500, 'y': 200},
            {'floor': 3, 'name': '안과 진료실', 'node_type': 'exam_room', 'x': 500, 'y': 300},
            {'floor': 3, 'name': '엘리베이터 3층', 'node_type': 'elevator', 'x': 400, 'y': 400},
            {'floor': 3, 'name': '계단 3층', 'node_type': 'stairs', 'x': 600, 'y': 400},
            {'floor': 3, 'name': '화장실 3층', 'node_type': 'restroom', 'x': 350, 'y': 400},
        ]
        
        nodes = {}
        for data in nodes_data:
            floor = data.pop('floor')
            x = data.pop('x')
            y = data.pop('y')
            node = NavigationNode.objects.create(
                node_id=str(uuid.uuid4()),
                map=maps[floor],
                x_coord=x,
                y_coord=y,
                **data
            )
            nodes[f"{floor}_{data['name']}"] = node
            
        return nodes

    def create_navigation_edges(self, nodes):
        """노드 간 연결 엣지 생성"""
        edges_data = [
            # 1층 내부 연결
            ('1_정문 로비', '1_접수처', 'corridor', 20, 30, True, True),
            ('1_접수처', '1_약국', 'corridor', 20, 30, True, True),
            ('1_접수처', '1_응급실', 'corridor', 20, 30, True, True),
            ('1_접수처', '1_카페테리아', 'corridor', 20, 30, True, True),
            ('1_접수처', '1_엘리베이터 1층', 'corridor', 10, 15, True, True),
            ('1_접수처', '1_계단 1층', 'corridor', 10, 15, True, True),
            ('1_엘리베이터 1층', '1_화장실 1층', 'corridor', 5, 8, True, True),
            
            # 2층 내부 연결
            ('2_엘리베이터 2층', '2_내과 대기실', 'corridor', 10, 15, True, True),
            ('2_내과 대기실', '2_내과 진료실', 'corridor', 10, 15, True, True),
            ('2_엘리베이터 2층', '2_외과 대기실', 'corridor', 30, 45, True, True),
            ('2_외과 대기실', '2_외과 진료실', 'corridor', 10, 15, True, True),
            ('2_엘리베이터 2층', '2_정형외과 진료실', 'corridor', 10, 15, True, True),
            ('2_엘리베이터 2층', '2_영상의학과 접수', 'corridor', 0, 0, True, True),
            ('2_영상의학과 접수', '2_X-Ray실', 'corridor', 10, 15, True, True),
            ('2_영상의학과 접수', '2_CT실', 'corridor', 10, 15, True, True),
            ('2_엘리베이터 2층', '2_계단 2층', 'corridor', 20, 30, True, True),
            ('2_엘리베이터 2층', '2_화장실 2층', 'corridor', 5, 8, True, True),
            
            # 3층 내부 연결
            ('3_엘리베이터 3층', '3_산부인과 대기실', 'corridor', 10, 15, True, True),
            ('3_산부인과 대기실', '3_산부인과 진료실', 'corridor', 10, 15, True, True),
            ('3_엘리베이터 3층', '3_소아과 대기실', 'corridor', 30, 45, True, True),
            ('3_소아과 대기실', '3_소아과 진료실', 'corridor', 10, 15, True, True),
            ('3_엘리베이터 3층', '3_이비인후과 진료실', 'corridor', 10, 15, True, True),
            ('3_엘리베이터 3층', '3_안과 진료실', 'corridor', 10, 15, True, True),
            ('3_엘리베이터 3층', '3_계단 3층', 'corridor', 20, 30, True, True),
            ('3_엘리베이터 3층', '3_화장실 3층', 'corridor', 5, 8, True, True),
            
            # 층간 연결 (엘리베이터)
            ('1_엘리베이터 1층', '2_엘리베이터 2층', 'elevator', 0, 60, True, True),
            ('2_엘리베이터 2층', '3_엘리베이터 3층', 'elevator', 0, 60, True, True),
            ('1_엘리베이터 1층', '3_엘리베이터 3층', 'elevator', 0, 120, True, True),
            
            # 층간 연결 (계단)
            ('1_계단 1층', '2_계단 2층', 'stairs', 0, 90, True, False),
            ('2_계단 2층', '3_계단 3층', 'stairs', 0, 90, True, False),
            ('1_계단 1층', '3_계단 3층', 'stairs', 0, 180, True, False),
        ]
        
        edges = []
        for from_key, to_key, edge_type, distance, walk_time, bidirectional, accessible in edges_data:
            from_node = nodes.get(from_key)
            to_node = nodes.get(to_key)
            
            if from_node and to_node:
                edge = NavigationEdge.objects.create(
                    edge_id=str(uuid.uuid4()),
                    from_node=from_node,
                    to_node=to_node,
                    edge_type=edge_type,
                    distance=distance,
                    walk_time=walk_time,
                    is_bidirectional=bidirectional,
                    is_accessible=accessible
                )
                edges.append(edge)
                
        return edges

    def link_nfc_tags_to_nodes(self, nodes):
        """기존 NFC 태그를 네비게이션 노드와 연결"""
        tag_node_mapping = [
            ('TAG001', '1_접수처'),
            ('TAG002', '2_내과 진료실'),
            ('TAG003', '2_X-Ray실'),
            ('TAG004', '2_CT실'),
            ('TAG005', '3_소아과 진료실'),
            ('TAG006', '1_약국'),
            ('TAG007', '2_영상의학과 접수'),
            ('TAG008', '3_산부인과 진료실'),
            ('TAG009', '2_외과 진료실'),
            ('TAG010', '3_안과 진료실'),
        ]
        
        for tag_code, node_key in tag_node_mapping:
            try:
                tag = NFCTag.objects.get(code=tag_code)
                node = nodes.get(node_key)
                
                if node:
                    # NavigationNode에서 NFCTag를 연결 (OneToOne 관계)
                    node.nfc_tag = tag
                    node.save()
                    self.stdout.write(f'  - {tag.code} → {node.name} 연결')
                    
            except NFCTag.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f'  - NFC 태그 {tag_code}를 찾을 수 없습니다.')
                )