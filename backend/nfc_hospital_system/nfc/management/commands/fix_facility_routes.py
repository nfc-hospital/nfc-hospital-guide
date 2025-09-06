from django.core.management.base import BaseCommand
from nfc.models import FacilityRoute
import json


class Command(BaseCommand):
    help = 'Fix empty facility routes in database'
    
    def handle(self, *args, **options):
        # 경로 데이터 정의
        routes_data = {
            "정문 로비_소변검사": {
                "nodes": [
                    {"id": "node-1", "x": 150, "y": 400, "name": "정문 로비"},
                    {"id": "node-2", "x": 220, "y": 380, "name": "복도1"},
                    {"id": "node-3", "x": 290, "y": 320, "name": "복도2"},
                    {"id": "node-4", "x": 360, "y": 260, "name": "소변검사실"}
                ],
                "edges": [
                    ["node-1", "node-2"],
                    ["node-2", "node-3"],
                    ["node-3", "node-4"]
                ],
                "map_id": "main_1f"
            },
            "정문 로비_채혈실": {
                "nodes": [
                    {"id": "node-1", "x": 150, "y": 400, "name": "정문 로비"},
                    {"id": "node-2", "x": 250, "y": 350, "name": "복도1"},
                    {"id": "node-3", "x": 320, "y": 280, "name": "복도2"},
                    {"id": "node-4", "x": 340, "y": 210, "name": "채혈실"}
                ],
                "edges": [
                    ["node-1", "node-2"],
                    ["node-2", "node-3"],
                    ["node-3", "node-4"]
                ],
                "map_id": "main_1f"
            },
            "정문 로비_엑스레이": {
                "nodes": [
                    {"id": "node-1", "x": 150, "y": 400, "name": "정문 로비"},
                    {"id": "node-2", "x": 200, "y": 350, "name": "복도1"},
                    {"id": "node-3", "x": 250, "y": 300, "name": "복도2"},
                    {"id": "node-4", "x": 300, "y": 250, "name": "엑스레이실"}
                ],
                "edges": [
                    ["node-1", "node-2"],
                    ["node-2", "node-3"],
                    ["node-3", "node-4"]
                ],
                "map_id": "main_1f"
            },
            "채혈실_소변검사": {
                "nodes": [
                    {"id": "node-1", "x": 340, "y": 210, "name": "채혈실"},
                    {"id": "node-2", "x": 350, "y": 235, "name": "복도"},
                    {"id": "node-3", "x": 360, "y": 260, "name": "소변검사실"}
                ],
                "edges": [
                    ["node-1", "node-2"],
                    ["node-2", "node-3"]
                ],
                "map_id": "main_1f"
            },
            "소변검사실_엑스레이": {
                "nodes": [
                    {"id": "node-1", "x": 360, "y": 260, "name": "소변검사실"},
                    {"id": "node-2", "x": 330, "y": 255, "name": "복도"},
                    {"id": "node-3", "x": 300, "y": 250, "name": "엑스레이실"}
                ],
                "edges": [
                    ["node-1", "node-2"],
                    ["node-2", "node-3"]
                ],
                "map_id": "main_1f"
            },
            "엑스레이_수납": {
                "nodes": [
                    {"id": "node-1", "x": 300, "y": 250, "name": "엑스레이실"},
                    {"id": "node-2", "x": 250, "y": 300, "name": "복도"},
                    {"id": "node-3", "x": 200, "y": 350, "name": "수납창구"}
                ],
                "edges": [
                    ["node-1", "node-2"],
                    ["node-2", "node-3"]
                ],
                "map_id": "main_1f"
            },
            "수납창구_정문": {
                "nodes": [
                    {"id": "node-1", "x": 200, "y": 350, "name": "수납창구"},
                    {"id": "node-2", "x": 175, "y": 375, "name": "복도"},
                    {"id": "node-3", "x": 150, "y": 400, "name": "정문"}
                ],
                "edges": [
                    ["node-1", "node-2"],
                    ["node-2", "node-3"]
                ],
                "map_id": "main_1f"
            }
        }
        
        # 각 경로를 데이터베이스에 저장
        fixed_count = 0
        created_count = 0
        
        for facility_name, route_data in routes_data.items():
            try:
                route, created = FacilityRoute.objects.get_or_create(
                    facility_name=facility_name,
                    defaults={
                        'nodes': route_data['nodes'],
                        'edges': route_data['edges'],
                        'map_id': route_data.get('map_id', 'main_1f')
                    }
                )
                
                if not created:
                    # 기존 경로가 있지만 노드가 비어있으면 업데이트
                    if not route.nodes or len(route.nodes) == 0:
                        route.nodes = route_data['nodes']
                        route.edges = route_data['edges']
                        route.map_id = route_data.get('map_id', 'main_1f')
                        route.save()
                        fixed_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'✅ 수정됨: {facility_name}')
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'⏩ 이미 데이터 있음: {facility_name}')
                        )
                else:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'✨ 생성됨: {facility_name}')
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ 오류 ({facility_name}): {str(e)}')
                )
        
        # 결과 요약
        self.stdout.write(
            self.style.SUCCESS(
                f'\n📊 완료: {created_count}개 생성, {fixed_count}개 수정'
            )
        )
        
        # 현재 DB 상태 확인
        all_routes = FacilityRoute.objects.all()
        self.stdout.write('\n📍 현재 저장된 경로:')
        for route in all_routes:
            node_count = len(route.nodes) if route.nodes else 0
            edge_count = len(route.edges) if route.edges else 0
            status = '✅' if node_count > 0 else '❌'
            self.stdout.write(
                f'  {status} {route.facility_name}: '
                f'{node_count}개 노드, {edge_count}개 엣지'
            )