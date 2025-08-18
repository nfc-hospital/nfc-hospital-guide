from django.core.management.base import BaseCommand
from hospital_navigation.models import DepartmentZone

class Command(BaseCommand):
    help = 'Create initial department zones data'

    def handle(self, *args, **kwargs):
        # 진료과 데이터
        departments = [
            {
                'name': '응급의료센터',
                'svg_id': 'dept-emergency',
                'building': '본관',
                'floor': '1F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'DEPARTMENT',
                'description': '24시간 운영',
                'display_order': 1
            },
            {
                'name': '진단검사의학과',
                'svg_id': 'dept-laboratory',
                'building': '본관',
                'floor': '1F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'DEPARTMENT',
                'description': '각종 검사 진행',
                'display_order': 2
            },
            {
                'name': '영상의학과',
                'svg_id': 'dept-radiology',
                'building': '본관',
                'floor': '1F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'DEPARTMENT',
                'description': 'X-ray, CT, MRI',
                'display_order': 3
            },
            {
                'name': '내과',
                'svg_id': 'zone-internal-medicine',
                'building': '본관',
                'floor': '2F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'DEPARTMENT',
                'description': '내과 진료',
                'display_order': 4
            },
            {
                'name': '외과',
                'svg_id': 'zone-surgery',
                'building': '본관',
                'floor': '2F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'DEPARTMENT',
                'description': '외과 진료',
                'display_order': 5
            },
            {
                'name': '산부인과',
                'svg_id': 'zone-obstetrics',
                'building': '본관',
                'floor': '2F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'DEPARTMENT',
                'description': '산부인과 진료',
                'display_order': 6
            },
            {
                'name': '소아과',
                'svg_id': 'zone-pediatrics',
                'building': '본관',
                'floor': '3F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'DEPARTMENT',
                'description': '소아 진료',
                'display_order': 7
            }
        ]

        # 시설 데이터
        facilities = [
            {
                'name': '원무과',
                'svg_id': 'dept-administration',
                'building': '본관',
                'floor': '1F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'FACILITY',
                'description': '접수 및 수납',
                'display_order': 1
            },
            {
                'name': '약국',
                'svg_id': 'dept-pharmacy',
                'building': '본관',
                'floor': '1F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'FACILITY',
                'description': '처방전 조제',
                'display_order': 2
            },
            {
                'name': '채혈실',
                'svg_id': 'room-blood-collection',
                'building': '본관',
                'floor': '1F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'FACILITY',
                'description': '혈액 검사',
                'display_order': 3
            },
            {
                'name': '편의점',
                'svg_id': 'store-convenience',
                'building': '본관',
                'floor': '1F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'FACILITY',
                'description': '편의시설',
                'display_order': 4
            },
            {
                'name': '카페',
                'svg_id': 'store-cafe',
                'building': '본관',
                'floor': '1F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'FACILITY',
                'description': '휴게 공간',
                'display_order': 5
            },
            {
                'name': '은행',
                'svg_id': 'store-bank',
                'building': '본관',
                'floor': '1F',
                'map_url': '/images/maps/overview_main_1f.svg',
                'zone_type': 'FACILITY',
                'description': '금융 서비스',
                'display_order': 6
            }
        ]

        # 데이터 생성
        created_count = 0
        for dept_data in departments + facilities:
            zone, created = DepartmentZone.objects.get_or_create(
                svg_id=dept_data['svg_id'],
                defaults=dept_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created: {zone.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Already exists: {zone.name}'))

        self.stdout.write(self.style.SUCCESS(f'\nTotal created: {created_count} zones'))