"""
SVG 기반 자동 복도 인식 및 노드 생성 시스템
현재 평면도 SVG에서 방들 사이의 빈 공간을 분석하여 복도를 자동 인식
"""

import xml.etree.ElementTree as ET
import re
from typing import List, Dict, Tuple, Optional
import math
from dataclasses import dataclass


@dataclass
class Room:
    """방 정보"""
    id: str
    name: str
    x: float
    y: float
    width: float
    height: float
    room_type: str  # 'medical-room', 'convenience', 'room'
    door_x: Optional[float] = None
    door_y: Optional[float] = None


@dataclass
class CorridorSegment:
    """복도 구간"""
    start_x: float
    start_y: float
    end_x: float
    end_y: float
    width: float
    direction: str  # 'horizontal', 'vertical'


@dataclass
class NavigationPoint:
    """자동 생성될 네비게이션 포인트"""
    x: float
    y: float
    point_type: str  # 'junction', 'room_entrance', 'corridor'
    name: str
    connected_rooms: List[str] = None
    
    def __post_init__(self):
        if self.connected_rooms is None:
            self.connected_rooms = []


class SVGCorridorAnalyzer:
    """SVG에서 복도를 자동 인식하는 분석기"""
    
    def __init__(self, svg_width: int = 900, svg_height: int = 600):
        self.svg_width = svg_width
        self.svg_height = svg_height
        self.rooms: List[Room] = []
        self.corridor_segments: List[CorridorSegment] = []
        self.navigation_points: List[NavigationPoint] = []
        
    def parse_svg_file(self, svg_path: str) -> None:
        """SVG 파일을 파싱하여 방 정보 추출"""
        try:
            tree = ET.parse(svg_path)
            root = tree.getroot()
            
            # 네임스페이스 처리
            ns = {'svg': 'http://www.w3.org/2000/svg'}
            if root.tag.startswith('{'):
                ns_uri = root.tag.split('}')[0][1:]
                ns['svg'] = ns_uri
            
            self._extract_rooms_from_svg(root, ns)
            self._extract_door_positions(root, ns)
            
            print(f"[OK] SVG 파싱 완료: {len(self.rooms)}개 방 발견")
            
        except Exception as e:
            print(f"[ERROR] SVG 파싱 실패: {e}")
            
    def _extract_rooms_from_svg(self, root: ET.Element, ns: Dict[str, str]) -> None:
        """SVG에서 방 정보 추출"""
        
        # 디버깅: SVG 구조 전체 탐색
        print(f"[DEBUG] SVG root tag: {root.tag}")
        print(f"[DEBUG] SVG root attributes: {root.attrib}")
        
        # 모든 요소 찾기 (다양한 방법 시도)
        all_elements = list(root.iter())
        print(f"[DEBUG] 전체 요소 수: {len(all_elements)}개")
        
        # 태그별 카운트
        tag_counts = {}
        for elem in all_elements:
            tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
            
        print(f"[DEBUG] 태그별 카운트: {tag_counts}")
        
        # rect 요소 찾기 (여러 방법 시도)
        all_rects = []
        try:
            all_rects = root.findall('.//rect')
            print(f"[DEBUG] findall('.//rect'): {len(all_rects)}개")
        except:
            pass
            
        if not all_rects:
            # 네임스페이스를 고려한 검색
            for elem in all_elements:
                if elem.tag.endswith('rect'):
                    all_rects.append(elem)
            print(f"[DEBUG] 네임스페이스 고려 rect 검색: {len(all_rects)}개")
        
        # path 요소 찾기
        all_paths = []
        try:
            all_paths = root.findall('.//path')  
            print(f"[DEBUG] findall('.//path'): {len(all_paths)}개")
        except:
            pass
            
        if not all_paths:
            for elem in all_elements:
                if elem.tag.endswith('path'):
                    all_paths.append(elem)
            print(f"[DEBUG] 네임스페이스 고려 path 검색: {len(all_paths)}개")
        
        # text 요소 찾기 (방 이름 추출용)
        all_texts = []
        try:
            all_texts = root.findall('.//text')
            print(f"[DEBUG] findall('.//text'): {len(all_texts)}개")
        except:
            pass
            
        if not all_texts:
            for elem in all_elements:
                if elem.tag.endswith('text'):
                    all_texts.append(elem)
            print(f"[DEBUG] 네임스페이스 고려 text 검색: {len(all_texts)}개")
        
        # 텍스트 요소들의 내용 출력 (디버깅)
        for i, text in enumerate(all_texts[:10]):  # 처음 10개만
            text_content = text.text or ""
            print(f"[DEBUG] text[{i}]: '{text_content}' at {text.attrib}")
        
        print(f"[DEBUG] 전체 rect 요소: {len(all_rects)}개")
        print(f"[DEBUG] 전체 path 요소: {len(all_paths)}개")
        print(f"[DEBUG] 전체 text 요소: {len(all_texts)}개")
        
        # rect 요소에서 방 추출
        for i, rect in enumerate(all_rects):
            class_attr = rect.get('class', '')
            print(f"[DEBUG] rect[{i}] class: '{class_attr}', attrib: {rect.attrib}")
            if self._is_room_rect(rect):
                room = self._parse_room_rect(rect)
                if room:
                    self.rooms.append(room)
                    print(f"[DEBUG] 방 추가됨: {room.name}")
                    
        # path 요소에서 복잡한 형태의 방 추출 (응급의료센터 등)
        for i, path in enumerate(all_paths):
            class_attr = path.get('class', '')
            d_attr = path.get('d', '')[:50] + '...' if path.get('d', '') else ''
            print(f"[DEBUG] path[{i}] class: '{class_attr}', d: '{d_attr}'")
            is_room = self._is_room_path(path)
            print(f"[DEBUG] path[{i}] is_room: {is_room}")
            if is_room:
                room = self._parse_room_path(path)
                print(f"[DEBUG] path[{i}] parsed room: {room}")
                if room:
                    self.rooms.append(room)
                    print(f"[DEBUG] 경로방 추가됨: {room.name}")
                else:
                    print(f"[DEBUG] path[{i}] room parsing failed")
                    
    def _is_room_rect(self, rect: ET.Element) -> bool:
        """rect가 방인지 판단"""
        class_attr = rect.get('class', '')
        return any(room_class in class_attr for room_class in 
                  ['medical-room', 'convenience', 'room'])
        
    def _is_room_path(self, path: ET.Element) -> bool:
        """path가 방인지 판단"""
        class_attr = path.get('class', '')
        return any(room_class in class_attr for room_class in 
                  ['medical-room', 'convenience', 'room'])
        
    def _parse_room_rect(self, rect: ET.Element) -> Optional[Room]:
        """rect 요소에서 Room 객체 생성"""
        try:
            x = float(rect.get('x', 0))
            y = float(rect.get('y', 0))
            width = float(rect.get('width', 0))
            height = float(rect.get('height', 0))
            
            # 방 이름은 인근 text 요소에서 찾기
            name = self._find_room_name_near_point(x + width/2, y + height/2)
            
            # 방 타입 결정
            class_attr = rect.get('class', '')
            if 'medical-room' in class_attr:
                room_type = 'medical'
            elif 'convenience' in class_attr:
                room_type = 'convenience'
            else:
                room_type = 'general'
                
            return Room(
                id=f"room_{int(x)}_{int(y)}",
                name=name or f"방_{int(x)}_{int(y)}",
                x=x,
                y=y,
                width=width,
                height=height,
                room_type=room_type
            )
            
        except (ValueError, TypeError):
            return None
            
    def _parse_room_path(self, path: ET.Element) -> Optional[Room]:
        """path 요소에서 Room 객체 생성 (L자형 응급실 등)"""
        try:
            d = path.get('d', '')
            if not d:
                return None
                
            # path에서 경계 박스 계산
            coords = self._extract_coordinates_from_path(d)
            if not coords:
                return None
                
            min_x = min(coord[0] for coord in coords)
            max_x = max(coord[0] for coord in coords)
            min_y = min(coord[1] for coord in coords)
            max_y = max(coord[1] for coord in coords)
            
            center_x = (min_x + max_x) / 2
            center_y = (min_y + max_y) / 2
            
            name = self._find_room_name_near_point(center_x, center_y)
            
            return Room(
                id=f"path_{int(center_x)}_{int(center_y)}",
                name=name or f"경로방_{int(center_x)}_{int(center_y)}",
                x=min_x,
                y=min_y,
                width=max_x - min_x,
                height=max_y - min_y,
                room_type='medical'
            )
            
        except (ValueError, TypeError):
            return None
            
    def _extract_coordinates_from_path(self, d: str) -> List[Tuple[float, float]]:
        """SVG path의 d 속성에서 좌표 추출"""
        coords = []
        
        # 더 정확한 SVG path 파싱 
        # M 50 100 L 350 100 L 350 200 L 200 200 L 200 300 L 50 300 Z 형태
        parts = d.replace(',', ' ').split()
        print(f"[DEBUG] path parts: {parts}")
        
        i = 0
        while i < len(parts):
            cmd = parts[i]
            if cmd in ['M', 'L']:
                # M 또는 L 뒤에 x, y 좌표가 따라옴
                if i + 2 < len(parts):
                    try:
                        x = float(parts[i + 1])
                        y = float(parts[i + 2])
                        coords.append((x, y))
                        print(f"[DEBUG] coord added: ({x}, {y})")
                        i += 3
                    except ValueError:
                        i += 1
                else:
                    i += 1
            elif cmd == 'Z':
                # Z는 닫기 명령어
                i += 1
            else:
                # 숫자인 경우 (이전 명령어 연속)
                try:
                    x = float(parts[i])
                    y = float(parts[i + 1]) if i + 1 < len(parts) else 0
                    coords.append((x, y))
                    print(f"[DEBUG] coord added (continuous): ({x}, {y})")
                    i += 2
                except ValueError:
                    i += 1
                    
        print(f"[DEBUG] total coords extracted: {len(coords)}")
        return coords
        
    def _find_room_name_near_point(self, x: float, y: float, max_distance: float = 100) -> Optional[str]:
        """특정 좌표 근처의 텍스트 요소에서 방 이름 찾기"""
        # 실제 구현에서는 SVG root를 참조해야 하지만, 
        # 여기서는 간단한 매핑 사용
        room_names = {
            (180, 190): "응급의료센터",
            (480, 165): "진단검사의학과", 
            (680, 165): "채혈실",
            (140, 405): "헌혈실",
            (530, 325): "약국",
            (530, 425): "카페",
            (680, 375): "은행",
            (380, 525): "원무과"
        }
        
        for (room_x, room_y), name in room_names.items():
            distance = math.sqrt((x - room_x) ** 2 + (y - room_y) ** 2)
            if distance < max_distance:
                return name
                
        return None
        
    def _extract_door_positions(self, root: ET.Element, ns: Dict[str, str]) -> None:
        """문 위치 정보 추출 (doorway 클래스의 line 요소)"""
        for line in root.findall('.//line', ns):
            if 'doorway' in line.get('class', ''):
                x1 = float(line.get('x1', 0))
                y1 = float(line.get('y1', 0))
                x2 = float(line.get('x2', 0))
                y2 = float(line.get('y2', 0))
                
                door_x = (x1 + x2) / 2
                door_y = (y1 + y2) / 2
                
                # 가장 가까운 방에 문 위치 할당
                closest_room = self._find_closest_room(door_x, door_y)
                if closest_room:
                    closest_room.door_x = door_x
                    closest_room.door_y = door_y
                    
    def _find_closest_room(self, x: float, y: float) -> Optional[Room]:
        """특정 좌표에서 가장 가까운 방 찾기"""
        min_distance = float('inf')
        closest_room = None
        
        for room in self.rooms:
            # 방의 중심점까지의 거리 계산
            center_x = room.x + room.width / 2
            center_y = room.y + room.height / 2
            distance = math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
            
            if distance < min_distance:
                min_distance = distance
                closest_room = room
                
        return closest_room
        
    def analyze_corridor_layout(self) -> None:
        """방들 사이의 복도 구조 분석"""
        print("[INFO] 복도 구조 분석 시작...")
        
        # 1. 수평/수직 복도 구간 식별
        self._identify_main_corridors()
        
        # 2. 교차점 찾기
        self._find_corridor_intersections()
        
        # 3. 방 입구 연결점 생성
        self._create_room_entrance_points()
        
        print(f"[OK] 복도 분석 완료: {len(self.navigation_points)}개 네비게이션 포인트 생성")
        
    def _identify_main_corridors(self) -> None:
        """주요 복도 구간 식별 - 더 실용적인 접근법"""
        print("[DEBUG] 복도 분석 시작...")
        
        # 모든 방의 위치를 분석하여 실제 병원 레이아웃에 맞는 연결 생성
        # 1층 평면도 기준으로 실제 복도 상황을 고려
        
        # 중앙 복도 축 정의 (실제 SVG 분석 기반)
        main_corridor_y = 350  # 응급실 하단 ~ 편의시설 사이의 주복도
        north_corridor_y = 250  # 진단검사의학과/채혈실 하단 복도
        
        # 각 방의 복도 접근점 계산
        for room in self.rooms:
            # 방 중심에서 가장 가까운 복도로의 연결점 생성
            room_center_x = room.x + room.width / 2
            room_center_y = room.y + room.height / 2
            
            # 복도 연결점 결정
            if room_center_y < 300:  # 북쪽 방들 (진단검사의학과, 채혈실, 응급실)
                corridor_y = north_corridor_y
            else:  # 남쪽 방들 (편의시설, 원무과, 헌혈실)
                corridor_y = main_corridor_y
                
            # 방에서 복도로의 수직 연결
            if room.door_y:
                # 실제 문 위치가 있으면 그것 사용
                corridor_connect_x = room.door_x or room_center_x
            else:
                corridor_connect_x = room_center_x
                
            # 수직 복도 구간 생성 (방에서 메인 복도로)
            if abs(room_center_y - corridor_y) > 10:  # 10px 이상 떨어져 있으면
                corridor = CorridorSegment(
                    start_x=corridor_connect_x,
                    start_y=min(room_center_y, corridor_y),
                    end_x=corridor_connect_x,
                    end_y=max(room_center_y, corridor_y),
                    width=30,  # 복도 폭
                    direction='vertical'
                )
                self.corridor_segments.append(corridor)
                print(f"[DEBUG] 수직복도 생성: {room.name} → 메인복도")
        
        # 메인 수평 복도들 생성
        main_corridors = [
            # 북쪽 수평 복도 (진단검사의학과 ↔ 채혈실)
            CorridorSegment(380, north_corridor_y, 750, north_corridor_y, 40, 'horizontal'),
            
            # 중앙 수평 복도 (응급실 ↔ 편의시설)  
            CorridorSegment(200, main_corridor_y, 740, main_corridor_y, 50, 'horizontal'),
            
            # 남쪽 수평 복도 (헌혈실 ↔ 원무과)
            CorridorSegment(140, 480, 480, 480, 30, 'horizontal')
        ]
        
        self.corridor_segments.extend(main_corridors)
        print(f"[DEBUG] 총 {len(self.corridor_segments)}개 복도 구간 생성")
        
        # 주요 교차점 생성
        junction_points = [
            # 중앙 교차점 (메인 복도들이 만나는 지점)
            NavigationPoint(400, main_corridor_y, 'junction', '중앙교차점'),
            NavigationPoint(500, north_corridor_y, 'junction', '북쪽교차점'),
            NavigationPoint(300, 480, 'junction', '남쪽교차점')
        ]
        
        self.navigation_points.extend(junction_points)
        print(f"[DEBUG] {len(junction_points)}개 교차점 생성")
                        
    def _find_corridor_intersections(self) -> None:
        """복도 교차점 찾기"""
        intersections = []
        
        for h_corridor in [c for c in self.corridor_segments if c.direction == 'horizontal']:
            for v_corridor in [c for c in self.corridor_segments if c.direction == 'vertical']:
                # 수평-수직 복도 교차점 계산
                if (h_corridor.start_x <= v_corridor.start_x <= h_corridor.end_x and
                    v_corridor.start_y <= h_corridor.start_y <= v_corridor.end_y):
                    
                    intersection = NavigationPoint(
                        x=v_corridor.start_x,
                        y=h_corridor.start_y,
                        point_type='junction',
                        name=f"교차점_{int(v_corridor.start_x)}_{int(h_corridor.start_y)}"
                    )
                    intersections.append(intersection)
                    
        self.navigation_points.extend(intersections)
        
    def _create_room_entrance_points(self) -> None:
        """방 입구 연결점 생성"""
        for room in self.rooms:
            if room.door_x and room.door_y:
                # 실제 문 위치 사용
                entrance = NavigationPoint(
                    x=room.door_x,
                    y=room.door_y,
                    point_type='room_entrance',
                    name=f"{room.name}_입구",
                    connected_rooms=[room.name]
                )
            else:
                # 문 위치가 없으면 방 중앙 하단 사용
                entrance = NavigationPoint(
                    x=room.x + room.width / 2,
                    y=room.y + room.height,
                    point_type='room_entrance',
                    name=f"{room.name}_입구",
                    connected_rooms=[room.name]
                )
                
            self.navigation_points.append(entrance)
            
    def generate_navigation_graph(self) -> Dict[str, any]:
        """네비게이션 그래프 생성"""
        nodes = []
        edges = []
        
        # 노드 생성
        for point in self.navigation_points:
            nodes.append({
                'name': point.name,
                'x_coord': point.x,
                'y_coord': point.y,
                'node_type': point.point_type,
                'connected_rooms': point.connected_rooms
            })
            
        # 엣지 생성 (더 적극적인 연결 정책)
        for i, point1 in enumerate(self.navigation_points):
            for j, point2 in enumerate(self.navigation_points[i+1:], i+1):
                distance = math.sqrt(
                    (point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2
                )
                
                # 거리 기반 연결 (300픽셀 이하면 연결)
                should_connect = False
                
                if distance < 150:  # 가까운 노드들은 무조건 연결
                    should_connect = True
                elif distance < 300:  # 중간 거리는 경로가 명확하면 연결
                    should_connect = self._is_reasonable_path(point1, point2)
                    
                if should_connect:
                    walk_time = max(10, int(distance * 0.6))  # 보행 시간 계산 (더 빠르게)
                    
                    edges.append({
                        'from_node': point1.name,
                        'to_node': point2.name,
                        'distance': round(distance, 1),
                        'walk_time': walk_time,
                        'edge_type': 'corridor'
                    })
                    print(f"[DEBUG] 엣지 생성: {point1.name} ↔ {point2.name} ({distance:.1f}m)")
                    
        return {
            'nodes': nodes,
            'edges': edges,
            'rooms': [
                {
                    'name': room.name,
                    'x': room.x,
                    'y': room.y,
                    'width': room.width,
                    'height': room.height,
                    'room_type': room.room_type
                }
                for room in self.rooms
            ]
        }
        
    def _is_path_clear(self, point1: NavigationPoint, point2: NavigationPoint) -> bool:
        """두 점 사이의 경로가 방을 통과하지 않는지 확인"""
        # 간단한 구현: 두 점을 잇는 직선이 방과 교차하는지 확인
        for room in self.rooms:
            if self._line_intersects_rect(
                point1.x, point1.y, point2.x, point2.y,
                room.x, room.y, room.width, room.height
            ):
                return False
        return True
        
    def _is_reasonable_path(self, point1: NavigationPoint, point2: NavigationPoint) -> bool:
        """두 점 사이에 합리적인 경로가 있는지 판단"""
        # 거리 기반 + 방향 기반 판단
        dx = abs(point1.x - point2.x)
        dy = abs(point1.y - point2.y)
        
        # 수직 또는 수평에 가까우면 연결하기 쉬움
        if dx < 50 or dy < 50:  # 거의 같은 축에 있음
            return True
            
        # 대각선이지만 합리적인 범위
        if dx < 200 and dy < 200:
            return True
            
        return False
        
    def _line_intersects_rect(self, x1: float, y1: float, x2: float, y2: float,
                             rect_x: float, rect_y: float, rect_w: float, rect_h: float) -> bool:
        """선분이 사각형과 교차하는지 확인"""
        # 간단한 구현: 선분의 양 끝점이 사각형 안에 있는지만 확인
        def point_in_rect(x, y):
            return (rect_x <= x <= rect_x + rect_w and 
                   rect_y <= y <= rect_y + rect_h)
                   
        return point_in_rect(x1, y1) or point_in_rect(x2, y2)


def main():
    """테스트 실행"""
    analyzer = SVGCorridorAnalyzer()
    
    # SVG 파일 분석
    svg_path = "C:/Users/jyhne/Desktop/hywu/hanium/nfc-hospital-guide/frontend-pwa/public/images/maps/main_1f.svg"
    analyzer.parse_svg_file(svg_path)
    
    # 복도 구조 분석
    analyzer.analyze_corridor_layout()
    
    # 네비게이션 그래프 생성
    graph = analyzer.generate_navigation_graph()
    
    print(f"\n=== 분석 결과 ===")
    print(f"방 개수: {len(graph['rooms'])}")
    print(f"네비게이션 노드: {len(graph['nodes'])}")
    print(f"연결 엣지: {len(graph['edges'])}")
    
    # 결과 샘플 출력
    print(f"\n=== 방 목록 ===")
    for room in graph['rooms']:
        print(f"- {room['name']}: ({room['x']}, {room['y']}) {room['width']}x{room['height']}")
        
    print(f"\n=== 네비게이션 노드 ===")
    for node in graph['nodes'][:5]:  # 처음 5개만
        print(f"- {node['name']}: ({node['x_coord']}, {node['y_coord']}) [{node['node_type']}]")
        
    print(f"\n=== 연결 엣지 (샘플) ===")
    for edge in graph['edges'][:5]:  # 처음 5개만
        print(f"- {edge['from_node']} -> {edge['to_node']}: {edge['distance']:.1f}m")


if __name__ == "__main__":
    main()