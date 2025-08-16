"""
시연용 가상 병원 네비게이션 데이터 생성 스크립트
9단계 환자 여정 시연을 위한 완벽한 데이터 세트 구성
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from hospital_navigation.models import (
    HospitalMap, NavigationNode, NavigationEdge, 
    PatientRoute, RouteProgress
)
from nfc.models import NFCTag
from appointments.models import Exam
from authentication.models import User
import random
import uuid


class Command(BaseCommand):
    help = '시연용 가상 병원 네비게이션 데이터 생성'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='기존 데이터를 삭제하고 새로 생성',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('🏥 가상 병원 네비게이션 데이터 생성 시작'))
        self.stdout.write(self.style.SUCCESS('=' * 60))

        if options['clear']:
            self.clear_existing_data()

        with transaction.atomic():
            # 1. 병원 지도 생성
            maps = self.create_hospital_maps()
            
            # 2. 네비게이션 노드 생성
            nodes = self.create_navigation_nodes(maps)
            
            # 3. 노드 간 연결 (엣지) 생성
            edges = self.create_navigation_edges(nodes)
            
            # 4. 기존 NFC 태그와 연결
            self.link_nfc_tags(nodes)
            
            # 5. 기존 검사실과 연결
            self.link_exam_rooms(nodes)
            
            # 6. 샘플 경로 생성
            self.create_sample_routes(nodes)

        self.stdout.write(self.style.SUCCESS('\n✅ 데이터 생성 완료!'))
        self.print_summary()

    def clear_existing_data(self):
        """기존 데이터 삭제"""
        self.stdout.write('🗑️ 기존 데이터 삭제 중...')
        RouteProgress.objects.all().delete()
        PatientRoute.objects.all().delete()
        NavigationEdge.objects.all().delete()
        NavigationNode.objects.all().delete()
        HospitalMap.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('  ✅ 기존 데이터 삭제 완료'))

    def create_hospital_maps(self):
        """병원 지도 생성"""
        self.stdout.write('\n📍 병원 지도 생성 중...')
        
        maps = {
            'main_1f': HospitalMap.objects.create(
                building='본관',
                floor=1,
                width=1000,
                height=800,
                scale=10.0,  # 1픽셀 = 10cm
                metadata={
                    'description': '본관 1층 - 접수, 원무과, 약국',
                    'facilities': ['접수처', '원무과', '약국', '채혈실', '화장실', '엘리베이터']
                }
            ),
            'main_2f': HospitalMap.objects.create(
                building='본관',
                floor=2,
                width=1000,
                height=800,
                scale=10.0,
                metadata={
                    'description': '본관 2층 - 내과 진료실',
                    'facilities': ['내과 대기실', '내과 진료실 1-5', '화장실', '엘리베이터']
                }
            ),
            'cancer_1f': HospitalMap.objects.create(
                building='암센터',
                floor=1,
                width=1200,
                height=900,
                scale=10.0,
                metadata={
                    'description': '암센터 1층 - 로비, 방사선치료실',
                    'facilities': ['로비', '방사선치료실', '상담실', '화장실', '엘리베이터']
                }
            ),
            'cancer_2f': HospitalMap.objects.create(
                building='암센터',
                floor=2,
                width=1200,
                height=900,
                scale=10.0,
                metadata={
                    'description': '암센터 2층 - 영상의학과',
                    'facilities': ['영상의학과 접수', 'CT실', 'MRI실', 'X-ray실', '판독실', '엘리베이터']
                }
            ),
        }
        
        self.stdout.write(self.style.SUCCESS(f'  ✅ {len(maps)}개 지도 생성 완료'))
        return maps

    def create_navigation_nodes(self, maps):
        """네비게이션 노드 생성 - 9단계 환자 여정을 위한 노드"""
        self.stdout.write('\n📍 네비게이션 노드 생성 중...')
        
        nodes = {}
        
        # 본관 1층 노드들 (1단계: 미등록 → 2단계: 도착 → 3단계: 등록완료 → 7단계: 완료 → 8단계: 수납)
        nodes['main_entrance'] = NavigationNode.objects.create(
            map=maps['main_1f'],
            node_type='entrance',
            name='본관 정문',
            description='병원 메인 출입구 - 환자 여정 시작점',
            x_coord=100, y_coord=400, z_coord=0,
            is_accessible=True
        )
        
        nodes['reception'] = NavigationNode.objects.create(
            map=maps['main_1f'],
            node_type='facility',
            name='접수처',
            description='초진/재진 접수 - 도착 확인 및 등록',
            x_coord=300, y_coord=400, z_coord=0,
            is_accessible=True
        )
        
        nodes['blood_test'] = NavigationNode.objects.create(
            map=maps['main_1f'],
            node_type='exam_room',
            name='채혈실',
            description='혈액검사실 - 기본 검사 진행',
            x_coord=500, y_coord=300, z_coord=0,
            is_accessible=True
        )
        
        nodes['billing'] = NavigationNode.objects.create(
            map=maps['main_1f'],
            node_type='facility',
            name='원무과',
            description='수납 및 제증명 발급',
            x_coord=700, y_coord=400, z_coord=0,
            is_accessible=True
        )
        
        nodes['pharmacy'] = NavigationNode.objects.create(
            map=maps['main_1f'],
            node_type='facility',
            name='약국',
            description='처방전 수령 및 복약지도',
            x_coord=900, y_coord=400, z_coord=0,
            is_accessible=True
        )
        
        nodes['main_elevator_1f'] = NavigationNode.objects.create(
            map=maps['main_1f'],
            node_type='elevator',
            name='본관 엘리베이터 (1층)',
            description='2층 내과로 이동',
            x_coord=500, y_coord=600, z_coord=0,
            is_accessible=True,
            has_elevator=True
        )
        
        # 본관 2층 노드들 (4단계: 대기 → 5단계: 호출)
        nodes['internal_waiting'] = NavigationNode.objects.create(
            map=maps['main_2f'],
            node_type='waiting_area',
            name='내과 대기실',
            description='내과 진료 대기 구역',
            x_coord=300, y_coord=400, z_coord=1,
            is_accessible=True
        )
        
        nodes['internal_clinic_1'] = NavigationNode.objects.create(
            map=maps['main_2f'],
            node_type='exam_room',
            name='내과 진료실 1',
            description='내과 전문의 진료실',
            x_coord=500, y_coord=200, z_coord=1,
            is_accessible=True
        )
        
        nodes['internal_clinic_2'] = NavigationNode.objects.create(
            map=maps['main_2f'],
            node_type='exam_room',
            name='내과 진료실 2',
            description='내과 전문의 진료실',
            x_coord=500, y_coord=400, z_coord=1,
            is_accessible=True
        )
        
        nodes['main_elevator_2f'] = NavigationNode.objects.create(
            map=maps['main_2f'],
            node_type='elevator',
            name='본관 엘리베이터 (2층)',
            description='층간 이동',
            x_coord=500, y_coord=600, z_coord=1,
            is_accessible=True,
            has_elevator=True
        )
        
        # 암센터 1층 노드들 (연결 통로)
        nodes['cancer_entrance'] = NavigationNode.objects.create(
            map=maps['cancer_1f'],
            node_type='entrance',
            name='암센터 입구',
            description='암센터 메인 로비',
            x_coord=100, y_coord=450, z_coord=0,
            is_accessible=True
        )
        
        nodes['cancer_lobby'] = NavigationNode.objects.create(
            map=maps['cancer_1f'],
            node_type='junction',
            name='암센터 로비',
            description='암센터 중앙 로비',
            x_coord=400, y_coord=450, z_coord=0,
            is_accessible=True
        )
        
        nodes['radiation_therapy'] = NavigationNode.objects.create(
            map=maps['cancer_1f'],
            node_type='exam_room',
            name='방사선치료실',
            description='방사선 치료 시설',
            x_coord=800, y_coord=300, z_coord=0,
            is_accessible=True
        )
        
        nodes['cancer_elevator_1f'] = NavigationNode.objects.create(
            map=maps['cancer_1f'],
            node_type='elevator',
            name='암센터 엘리베이터 (1층)',
            description='영상의학과로 이동',
            x_coord=600, y_coord=600, z_coord=0,
            is_accessible=True,
            has_elevator=True
        )
        
        # 암센터 2층 노드들 (6단계: 진행중 - CT/MRI 검사)
        nodes['radiology_reception'] = NavigationNode.objects.create(
            map=maps['cancer_2f'],
            node_type='facility',
            name='영상의학과 접수',
            description='CT/MRI 검사 접수',
            x_coord=300, y_coord=450, z_coord=1,
            is_accessible=True
        )
        
        nodes['ct_room'] = NavigationNode.objects.create(
            map=maps['cancer_2f'],
            node_type='exam_room',
            name='CT실',
            description='컴퓨터 단층촬영실',
            x_coord=600, y_coord=200, z_coord=1,
            is_accessible=True
        )
        
        nodes['mri_room'] = NavigationNode.objects.create(
            map=maps['cancer_2f'],
            node_type='exam_room',
            name='MRI실',
            description='자기공명영상 촬영실',
            x_coord=600, y_coord=400, z_coord=1,
            is_accessible=True
        )
        
        nodes['xray_room'] = NavigationNode.objects.create(
            map=maps['cancer_2f'],
            node_type='exam_room',
            name='X-ray실',
            description='일반 방사선 촬영실',
            x_coord=600, y_coord=600, z_coord=1,
            is_accessible=True
        )
        
        nodes['cancer_elevator_2f'] = NavigationNode.objects.create(
            map=maps['cancer_2f'],
            node_type='elevator',
            name='암센터 엘리베이터 (2층)',
            description='층간 이동',
            x_coord=600, y_coord=800, z_coord=1,
            is_accessible=True,
            has_elevator=True
        )
        
        # 주요 교차점 노드 추가 (경로 계산용)
        nodes['main_junction_1f'] = NavigationNode.objects.create(
            map=maps['main_1f'],
            node_type='junction',
            name='본관 1층 중앙 복도',
            x_coord=500, y_coord=400, z_coord=0,
            is_accessible=True
        )
        
        nodes['main_junction_2f'] = NavigationNode.objects.create(
            map=maps['main_2f'],
            node_type='junction',
            name='본관 2층 중앙 복도',
            x_coord=500, y_coord=400, z_coord=1,
            is_accessible=True
        )
        
        self.stdout.write(self.style.SUCCESS(f'  ✅ {len(nodes)}개 노드 생성 완료'))
        return nodes

    def create_navigation_edges(self, nodes):
        """노드 간 연결 생성"""
        self.stdout.write('\n📍 네비게이션 엣지(경로) 생성 중...')
        
        edges = []
        
        # 본관 1층 연결
        edges.extend([
            # 정문 → 접수처
            NavigationEdge.objects.create(
                from_node=nodes['main_entrance'],
                to_node=nodes['reception'],
                distance=20, walk_time=30,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 접수처 → 중앙 복도
            NavigationEdge.objects.create(
                from_node=nodes['reception'],
                to_node=nodes['main_junction_1f'],
                distance=20, walk_time=30,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 중앙 복도 → 채혈실
            NavigationEdge.objects.create(
                from_node=nodes['main_junction_1f'],
                to_node=nodes['blood_test'],
                distance=10, walk_time=15,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 중앙 복도 → 원무과
            NavigationEdge.objects.create(
                from_node=nodes['main_junction_1f'],
                to_node=nodes['billing'],
                distance=20, walk_time=30,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 원무과 → 약국
            NavigationEdge.objects.create(
                from_node=nodes['billing'],
                to_node=nodes['pharmacy'],
                distance=20, walk_time=30,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 중앙 복도 → 엘리베이터
            NavigationEdge.objects.create(
                from_node=nodes['main_junction_1f'],
                to_node=nodes['main_elevator_1f'],
                distance=20, walk_time=30,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
        ])
        
        # 본관 층간 연결 (엘리베이터)
        edges.append(
            NavigationEdge.objects.create(
                from_node=nodes['main_elevator_1f'],
                to_node=nodes['main_elevator_2f'],
                distance=3, walk_time=60,  # 엘리베이터 대기시간 포함
                edge_type='elevator',
                is_accessible=True,
                is_bidirectional=True
            )
        )
        
        # 본관 2층 연결
        edges.extend([
            # 엘리베이터 → 중앙 복도
            NavigationEdge.objects.create(
                from_node=nodes['main_elevator_2f'],
                to_node=nodes['main_junction_2f'],
                distance=10, walk_time=15,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 중앙 복도 → 내과 대기실
            NavigationEdge.objects.create(
                from_node=nodes['main_junction_2f'],
                to_node=nodes['internal_waiting'],
                distance=20, walk_time=30,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 내과 대기실 → 진료실 1
            NavigationEdge.objects.create(
                from_node=nodes['internal_waiting'],
                to_node=nodes['internal_clinic_1'],
                distance=20, walk_time=30,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 내과 대기실 → 진료실 2
            NavigationEdge.objects.create(
                from_node=nodes['internal_waiting'],
                to_node=nodes['internal_clinic_2'],
                distance=20, walk_time=30,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
        ])
        
        # 본관-암센터 연결 (실외 통로)
        edges.append(
            NavigationEdge.objects.create(
                from_node=nodes['main_entrance'],
                to_node=nodes['cancer_entrance'],
                distance=100, walk_time=120,  # 건물 간 이동
                edge_type='outdoor',
                is_accessible=True,
                is_bidirectional=True,
                avg_congestion=0.3  # 실외라 덜 혼잡
            )
        )
        
        # 암센터 1층 연결
        edges.extend([
            # 입구 → 로비
            NavigationEdge.objects.create(
                from_node=nodes['cancer_entrance'],
                to_node=nodes['cancer_lobby'],
                distance=30, walk_time=45,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 로비 → 방사선치료실
            NavigationEdge.objects.create(
                from_node=nodes['cancer_lobby'],
                to_node=nodes['radiation_therapy'],
                distance=40, walk_time=60,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 로비 → 엘리베이터
            NavigationEdge.objects.create(
                from_node=nodes['cancer_lobby'],
                to_node=nodes['cancer_elevator_1f'],
                distance=20, walk_time=30,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
        ])
        
        # 암센터 층간 연결
        edges.append(
            NavigationEdge.objects.create(
                from_node=nodes['cancer_elevator_1f'],
                to_node=nodes['cancer_elevator_2f'],
                distance=3, walk_time=60,
                edge_type='elevator',
                is_accessible=True,
                is_bidirectional=True
            )
        )
        
        # 암센터 2층 연결
        edges.extend([
            # 엘리베이터 → 영상의학과 접수
            NavigationEdge.objects.create(
                from_node=nodes['cancer_elevator_2f'],
                to_node=nodes['radiology_reception'],
                distance=30, walk_time=45,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 영상의학과 접수 → CT실
            NavigationEdge.objects.create(
                from_node=nodes['radiology_reception'],
                to_node=nodes['ct_room'],
                distance=30, walk_time=45,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 영상의학과 접수 → MRI실
            NavigationEdge.objects.create(
                from_node=nodes['radiology_reception'],
                to_node=nodes['mri_room'],
                distance=30, walk_time=45,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
            # 영상의학과 접수 → X-ray실
            NavigationEdge.objects.create(
                from_node=nodes['radiology_reception'],
                to_node=nodes['xray_room'],
                distance=30, walk_time=45,
                edge_type='corridor',
                is_accessible=True,
                is_bidirectional=True
            ),
        ])
        
        self.stdout.write(self.style.SUCCESS(f'  ✅ {len(edges)}개 엣지 생성 완료'))
        return edges

    def link_nfc_tags(self, nodes):
        """기존 NFC 태그와 노드 연결"""
        self.stdout.write('\n📍 NFC 태그 연결 중...')
        
        # 샘플 NFC 태그 생성 (없는 경우)
        tag_locations = [
            ('main_entrance_tag', '본관 정문', nodes['main_entrance']),
            ('reception_tag', '접수처', nodes['reception']),
            ('blood_test_tag', '채혈실', nodes['blood_test']),
            ('internal_waiting_tag', '내과 대기실', nodes['internal_waiting']),
            ('ct_room_tag', 'CT실', nodes['ct_room']),
            ('billing_tag', '원무과', nodes['billing']),
            ('pharmacy_tag', '약국', nodes['pharmacy']),
        ]
        
        for tag_uid, location, node in tag_locations:
            tag, created = NFCTag.objects.get_or_create(
                tag_uid=tag_uid,
                defaults={
                    'code': f'NFC_{tag_uid[:10].upper()}',
                    'building': node.map.building,
                    'floor': node.map.floor,
                    'room': location,
                    'description': f'{location} NFC 태그',
                    'x_coord': node.x_coord,
                    'y_coord': node.y_coord,
                    'is_active': True
                }
            )
            
            # 노드와 연결
            node.nfc_tag = tag
            node.save()
            
            if created:
                self.stdout.write(f'    ✅ 새 NFC 태그 생성 및 연결: {location}')
            else:
                self.stdout.write(f'    ↔️ 기존 NFC 태그 연결: {location}')

    def link_exam_rooms(self, nodes):
        """기존 검사실과 노드 연결"""
        self.stdout.write('\n📍 검사실 연결 중...')
        
        # 샘플 검사실 생성 (없는 경우)
        exam_rooms = [
            ('blood_test', '혈액검사', '채혈실', nodes['blood_test']),
            ('internal_med', '내과진료', '내과', nodes['internal_clinic_1']),
            ('ct_scan', 'CT 촬영', 'CT실', nodes['ct_room']),
            ('mri_scan', 'MRI 촬영', 'MRI실', nodes['mri_room']),
            ('xray', 'X-ray 촬영', 'X-ray실', nodes['xray_room']),
        ]
        
        for exam_id, title, dept, node in exam_rooms:
            exam, created = Exam.objects.get_or_create(
                exam_id=exam_id,
                defaults={
                    'title': title,
                    'description': f'{title} 검사',
                    'department': dept,
                    'building': node.map.building,
                    'floor': str(node.map.floor),
                    'room': node.name,
                    'x_coord': node.x_coord,
                    'y_coord': node.y_coord,
                    'average_duration': 30,
                    'buffer_time': 10,
                    'is_active': True
                }
            )
            
            # 노드와 연결
            node.exam = exam
            node.save()
            
            if created:
                self.stdout.write(f'    ✅ 새 검사실 생성 및 연결: {title}')
            else:
                self.stdout.write(f'    ↔️ 기존 검사실 연결: {title}')

    def create_sample_routes(self, nodes):
        """9단계 환자 여정 샘플 경로 생성"""
        self.stdout.write('\n📍 샘플 경로 생성 중...')
        
        # 테스트용 환자 가져오기 또는 생성
        user = User.objects.filter(role='patient').first()
        if not user:
            user = User.objects.create(
                user_id=uuid.uuid4(),
                email='patient@test.com',
                name='테스트 환자',
                phone_number='01012345678',
                birth_date='1970-01-01',
                role='patient'
            )
            self.stdout.write(f'    ✅ 테스트 환자 생성: {user.name}')
        
        # 주요 경로 시나리오
        routes = [
            {
                'name': '초진 환자 전체 여정',
                'start': nodes['main_entrance'],
                'end': nodes['pharmacy'],
                'waypoints': [
                    nodes['reception'],      # 접수
                    nodes['blood_test'],      # 채혈
                    nodes['internal_waiting'], # 내과 대기
                    nodes['internal_clinic_1'], # 진료
                    nodes['ct_room'],         # CT 검사
                    nodes['billing'],         # 수납
                    nodes['pharmacy']         # 약국
                ],
                'total_distance': 500,
                'estimated_time': 3600  # 1시간
            },
            {
                'name': 'CT 검사 경로',
                'start': nodes['internal_clinic_1'],
                'end': nodes['ct_room'],
                'waypoints': [
                    nodes['main_elevator_2f'],
                    nodes['main_elevator_1f'],
                    nodes['cancer_entrance'],
                    nodes['cancer_lobby'],
                    nodes['cancer_elevator_1f'],
                    nodes['cancer_elevator_2f'],
                    nodes['radiology_reception'],
                    nodes['ct_room']
                ],
                'total_distance': 300,
                'estimated_time': 600  # 10분
            },
            {
                'name': '검사 후 수납 경로',
                'start': nodes['ct_room'],
                'end': nodes['billing'],
                'waypoints': [
                    nodes['cancer_elevator_2f'],
                    nodes['cancer_elevator_1f'],
                    nodes['cancer_entrance'],
                    nodes['main_entrance'],
                    nodes['main_junction_1f'],
                    nodes['billing']
                ],
                'total_distance': 250,
                'estimated_time': 480  # 8분
            }
        ]
        
        for route_data in routes:
            # 경로 노드 ID 리스트 생성
            path_nodes = [str(node.node_id) for node in route_data['waypoints']]
            
            route = PatientRoute.objects.create(
                user=user,
                start_node=route_data['start'],
                end_node=route_data['end'],
                path_nodes=path_nodes,
                total_distance=route_data['total_distance'],
                estimated_time=route_data['estimated_time'],
                status='completed',  # 샘플이므로 완료 상태
                is_accessible_route=True
            )
            
            self.stdout.write(f'    ✅ 경로 생성: {route_data["name"]}')
            
            # 첫 번째 경로에 대해 진행 상황 샘플 생성
            if route_data['name'] == '초진 환자 전체 여정':
                for i, node in enumerate(route_data['waypoints'][:3]):  # 처음 3개 지점만
                    RouteProgress.objects.create(
                        route=route,
                        current_node=node,
                        node_index=i,
                        is_on_route=True
                    )
                self.stdout.write(f'      → 진행 상황 기록 추가 (3개 지점)')

    def print_summary(self):
        """생성된 데이터 요약"""
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('📊 데이터 생성 요약'))
        self.stdout.write('=' * 60)
        
        self.stdout.write(f'  • 병원 지도: {HospitalMap.objects.count()}개')
        self.stdout.write(f'  • 네비게이션 노드: {NavigationNode.objects.count()}개')
        self.stdout.write(f'  • 네비게이션 엣지: {NavigationEdge.objects.count()}개')
        self.stdout.write(f'  • 환자 경로: {PatientRoute.objects.count()}개')
        self.stdout.write(f'  • 경로 진행 기록: {RouteProgress.objects.count()}개')
        
        # NFC 태그 연결 상태
        connected_tags = NavigationNode.objects.filter(nfc_tag__isnull=False).count()
        self.stdout.write(f'  • NFC 태그 연결: {connected_tags}개')
        
        # 검사실 연결 상태
        connected_exams = NavigationNode.objects.filter(exam__isnull=False).count()
        self.stdout.write(f'  • 검사실 연결: {connected_exams}개')
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('✨ 9단계 환자 여정 시연 준비 완료!'))
        self.stdout.write('=' * 60)
        
        # 여정 단계별 위치 안내
        self.stdout.write('\n📍 환자 여정 단계별 주요 위치:')
        self.stdout.write('  1. 미등록 → 본관 정문')
        self.stdout.write('  2. 도착 → 접수처')
        self.stdout.write('  3. 등록완료 → 채혈실')
        self.stdout.write('  4. 대기 → 내과 대기실')
        self.stdout.write('  5. 호출 → 내과 진료실')
        self.stdout.write('  6. 진행중 → CT실/MRI실')
        self.stdout.write('  7. 완료 → 원무과')
        self.stdout.write('  8. 수납 → 약국')
        self.stdout.write('  9. 종료 → 귀가')