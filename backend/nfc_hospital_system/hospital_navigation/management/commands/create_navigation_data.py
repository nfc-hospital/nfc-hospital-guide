"""
Django Management Command: create_navigation_data
SVG 파일에서 NavigationNode와 NavigationEdge를 자동으로 생성하는 명령어
"""

import math
import os
import re
from xml.etree import ElementTree as ET
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from hospital_navigation.models import HospitalMap, NavigationNode, NavigationEdge
from nfc.models import NFCTag


class Command(BaseCommand):
    help = 'SVG 파일에서 NavigationNode와 NavigationEdge를 자동 생성'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', 
            action='store_true',
            help='기존 데이터를 모두 삭제하고 새로 생성'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write("기존 NavigationNode 및 NavigationEdge 데이터 삭제 중...")
            NavigationEdge.objects.all().delete()
            NavigationNode.objects.all().delete()
            self.stdout.write(self.style.WARNING("기존 데이터 삭제 완료"))

        # SVG 파일 목록
        svg_files = [
            {'filename': 'main_1f.interactive.svg', 'building': '본관', 'floor': 1},
            {'filename': 'main_2f.interactive.svg', 'building': '본관', 'floor': 2},
            {'filename': 'cancer_1f.interactive.svg', 'building': '암센터', 'floor': 1},
        ]

        with transaction.atomic():
            # 1. HospitalMap 생성 또는 조회
            maps = {}
            for svg_info in svg_files:
                hospital_map, created = HospitalMap.objects.get_or_create(
                    building=svg_info['building'],
                    floor=svg_info['floor'],
                    defaults={
                        'width': 900,
                        'height': 600,
                        'scale': 1.0,
                        'is_active': True
                    }
                )
                maps[f"{svg_info['building']}_{svg_info['floor']}"] = hospital_map
                if created:
                    self.stdout.write(f"HospitalMap 생성: {hospital_map}")

            # 2. SVG 파일에서 노드 추출 및 생성
            all_nodes = {}
            for svg_info in svg_files:
                nodes = self.extract_nodes_from_svg(svg_info, maps[f"{svg_info['building']}_{svg_info['floor']}"])
                all_nodes.update(nodes)

            self.stdout.write(f"총 {len(all_nodes)}개의 NavigationNode 생성 완료")

            # 3. 엣지 자동 생성
            self.create_edges_automatically(all_nodes)

        self.stdout.write(
            self.style.SUCCESS(f"NavigationNode 및 NavigationEdge 생성 완료!")
        )

    def extract_nodes_from_svg(self, svg_info, hospital_map):
        """SVG 파일에서 interactive 요소들을 추출하여 NavigationNode 생성"""
        svg_path = os.path.join(
            settings.BASE_DIR, 
            'static', 'maps', 
            svg_info['filename']
        )

        if not os.path.exists(svg_path):
            self.stdout.write(self.style.WARNING(f"SVG 파일을 찾을 수 없음: {svg_path}"))
            return {}

        self.stdout.write(f"SVG 파싱 중: {svg_info['filename']}")
        
        # SVG 파일 파싱
        tree = ET.parse(svg_path)
        root = tree.getroot()
        
        # 네임스페이스 처리
        namespaces = {'svg': 'http://www.w3.org/2000/svg'}
        if root.tag.startswith('{'):
            namespaces['svg'] = root.tag.split('}')[0][1:]

        nodes = {}
        
        # data-interactive="true" 요소 찾기
        for elem in root.iter():
            if elem.get('data-interactive') == 'true' or elem.get('id'):
                node_data = self.parse_svg_element(elem, svg_info)
                if node_data:
                    try:
                        # NavigationNode 생성
                        nav_node = NavigationNode.objects.create(
                            map=hospital_map,
                            node_type=node_data['node_type'],
                            x_coord=node_data['x_coord'],
                            y_coord=node_data['y_coord'],
                            name=node_data['name'],
                            description=node_data['description'],
                            is_accessible=node_data.get('is_accessible', True),
                            has_elevator=node_data.get('has_elevator', False),
                            has_escalator=node_data.get('has_escalator', False)
                        )

                        # NFC 태그와 연결 (있는 경우)
                        if node_data.get('nfc_code'):
                            try:
                                nfc_tag = NFCTag.objects.get(code=node_data['nfc_code'])
                                nav_node.nfc_tag = nfc_tag
                                nav_node.save()
                                self.stdout.write(f"NFC 태그 연결: {nfc_tag.code} -> {nav_node.name}")
                            except NFCTag.DoesNotExist:
                                pass

                        nodes[node_data['element_id']] = nav_node
                        self.stdout.write(f"노드 생성: {nav_node.name} ({node_data['x_coord']}, {node_data['y_coord']})")
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"노드 생성 실패: {node_data['name']} - {str(e)}"))

        return nodes

    def parse_svg_element(self, elem, svg_info):
        """SVG 요소에서 노드 정보 추출"""
        element_id = elem.get('id')
        if not element_id:
            return None

        # 좌표 추출
        coords = self.extract_coordinates(elem)
        if not coords:
            return None

        x_coord, y_coord = coords

        # 노드 타입 결정
        node_type = self.determine_node_type(element_id)
        
        # 이름 추출
        name = elem.get('data-name') or self.generate_name_from_id(element_id)
        
        # 설명 생성
        description = f"{svg_info['building']} {svg_info['floor']}층 {name}"
        
        # NFC 코드 매핑 (실제 NFC 태그가 있는 경우)
        nfc_code = self.map_to_nfc_code(element_id)

        return {
            'element_id': element_id,
            'x_coord': float(x_coord),
            'y_coord': float(y_coord),
            'node_type': node_type,
            'name': name,
            'description': description,
            'nfc_code': nfc_code,
            'is_accessible': self.is_accessible_location(element_id),
            'has_elevator': 'elevator' in element_id.lower(),
            'has_escalator': 'escalator' in element_id.lower()
        }

    def extract_coordinates(self, elem):
        """SVG 요소에서 좌표 추출"""
        # transform 속성에서 translate 좌표 추출
        transform = elem.get('transform')
        if transform and 'translate' in transform:
            match = re.search(r'translate\(([\d.-]+),\s*([\d.-]+)\)', transform)
            if match:
                return float(match.group(1)), float(match.group(2))

        # x, y 속성
        x = elem.get('x')
        y = elem.get('y')
        if x and y:
            width = float(elem.get('width', 0)) / 2
            height = float(elem.get('height', 0)) / 2
            return float(x) + width, float(y) + height

        # cx, cy 속성 (원형 요소)
        cx = elem.get('cx')
        cy = elem.get('cy')
        if cx and cy:
            return float(cx), float(cy)

        # path 요소의 경우 중점 계산
        d = elem.get('d')
        if d:
            # 간단한 path의 시작점 추출
            match = re.search(r'M\s*([\d.-]+)[\s,]+([\d.-]+)', d)
            if match:
                return float(match.group(1)), float(match.group(2))

        return None

    def determine_node_type(self, element_id):
        """요소 ID에서 노드 타입 결정"""
        if 'dept-' in element_id or 'room-' in element_id:
            return 'exam_room'
        elif 'elevator' in element_id:
            return 'elevator'
        elif 'stairs' in element_id:
            return 'stairs'
        elif 'restroom' in element_id:
            return 'restroom'
        elif 'store-' in element_id:
            return 'facility'
        elif 'info-' in element_id:
            return 'entrance'
        elif 'conn-' in element_id:
            return 'junction'
        else:
            return 'junction'

    def generate_name_from_id(self, element_id):
        """요소 ID에서 이름 생성"""
        name_mapping = {
            'dept-emergency': '응급의료센터',
            'dept-laboratory': '진단검사의학과',
            'room-blood-collection': '채혈실',
            'room-blood-donation': '헌혈실',
            'store-pharmacy': '약국',
            'store-cafe': '카페',
            'store-bank': '은행',
            'room-storage': '원무과',
            'facility-elevator-1': '엘리베이터 1',
            'facility-elevator-2': '엘리베이터 2',
            'facility-stairs-1': '계단 1',
            'facility-restroom-1': '화장실 1',
            'info-main-gate': '정문',
            'info-desk-1': '안내데스크',
            'conn-cancer-center': '암센터 연결통로'
        }
        return name_mapping.get(element_id, element_id.replace('-', ' ').title())

    def map_to_nfc_code(self, element_id):
        """요소 ID를 NFC 코드로 매핑 (실제 NFC 태그가 있는 경우만)"""
        nfc_mapping = {
            'dept-emergency': 'NFC001',
            'dept-laboratory': 'NFC002', 
            'room-blood-collection': 'NFC003',
            'store-pharmacy': 'NFC004',
            'facility-elevator-1': 'NFC005'
        }
        return nfc_mapping.get(element_id)

    def is_accessible_location(self, element_id):
        """접근성 여부 판단"""
        # 계단은 휠체어 접근 불가
        if 'stairs' in element_id:
            return False
        return True

    def create_edges_automatically(self, all_nodes):
        """노드 간 엣지 자동 생성"""
        self.stdout.write("NavigationEdge 자동 생성 중...")
        
        nodes_list = list(all_nodes.values())
        edge_count = 0

        # 1. 같은 층 내 거리 기반 연결
        for i, node_a in enumerate(nodes_list):
            for j, node_b in enumerate(nodes_list):
                if i >= j or node_a.map != node_b.map:
                    continue
                
                distance = self.calculate_distance(
                    node_a.x_coord, node_a.y_coord,
                    node_b.x_coord, node_b.y_coord
                )
                
                # 150픽셀(75미터) 이내면 연결
                if distance <= 150:
                    self.create_edge(node_a, node_b, distance)
                    edge_count += 1

        # 2. 엘리베이터/계단 층간 연결
        elevators = [node for node in nodes_list if node.node_type == 'elevator']
        stairs = [node for node in nodes_list if node.node_type == 'stairs']

        # 엘리베이터 층간 연결
        for i, elev_a in enumerate(elevators):
            for j, elev_b in enumerate(elevators):
                if i >= j or elev_a.map.building != elev_b.map.building:
                    continue
                
                # 같은 건물의 다른 층 엘리베이터는 연결
                if elev_a.map.floor != elev_b.map.floor:
                    # 층간 이동은 고정 시간 (30초)
                    floor_distance = abs(elev_a.map.floor - elev_b.map.floor) * 50
                    self.create_edge(elev_a, elev_b, floor_distance, 'elevator')
                    edge_count += 1

        # 계단 층간 연결
        for i, stair_a in enumerate(stairs):
            for j, stair_b in enumerate(stairs):
                if i >= j or stair_a.map.building != stair_b.map.building:
                    continue
                
                if stair_a.map.floor != stair_b.map.floor:
                    # 계단 이동 시간 (층당 45초)
                    floor_distance = abs(stair_a.map.floor - stair_b.map.floor) * 60
                    self.create_edge(stair_a, stair_b, floor_distance, 'stairs')
                    edge_count += 1

        self.stdout.write(f"총 {edge_count}개의 NavigationEdge 생성 완료")

    def calculate_distance(self, x1, y1, x2, y2):
        """유클리드 거리 계산 (픽셀 단위)"""
        return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

    def create_edge(self, node_a, node_b, pixel_distance, edge_type='corridor'):
        """NavigationEdge 생성"""
        # 픽셀을 미터로 변환 (1픽셀 = 0.5미터)
        meter_distance = pixel_distance * 0.5
        
        # 걷기 시간 계산 (평균 속도 1.2m/s)
        walk_time = int(meter_distance / 1.2)
        
        # 엣지 타입에 따른 시간 조정
        if edge_type == 'elevator':
            walk_time += 30  # 엘리베이터 대기시간
        elif edge_type == 'stairs':
            walk_time = int(walk_time * 1.5)  # 계단은 50% 더 느림
        
        # 양방향 엣지 생성
        NavigationEdge.objects.create(
            from_node=node_a,
            to_node=node_b,
            distance=meter_distance,
            walk_time=walk_time,
            edge_type=edge_type,
            is_accessible=(edge_type != 'stairs'),  # 계단은 휠체어 불가
            is_bidirectional=True
        )
        
        NavigationEdge.objects.create(
            from_node=node_b,
            to_node=node_a,
            distance=meter_distance,
            walk_time=walk_time,
            edge_type=edge_type,
            is_accessible=(edge_type != 'stairs'),
            is_bidirectional=True
        )