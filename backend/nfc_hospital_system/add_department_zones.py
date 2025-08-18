import os
import django
import sys

# Django 설정
sys.path.insert(0, 'C:\\Users\\jyhne\\Desktop\\hywu\\hanium\\nfc-hospital-guide\\backend\\nfc_hospital_system')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings.development')
django.setup()

from hospital_navigation.models import DepartmentZone

# 기존 데이터 삭제 (선택사항)
DepartmentZone.objects.all().delete()

# 진료과 데이터
departments = [
    {
        'name': '이비인후과',
        'svg_id': 'zone-ent',
        'building': '본관',
        'floor': '3F',
        'map_url': '/images/maps/main_3f.svg',
        'description': '본관 3층 엘리베이터 우측',
        'zone_type': 'DEPARTMENT',
        'icon': '👂',
        'display_order': 1,
        'is_active': True
    },
    {
        'name': '안과',
        'svg_id': 'zone-ophthalmology',
        'building': '본관',
        'floor': '3F',
        'map_url': '/images/maps/main_3f.svg',
        'description': '본관 3층 엘리베이터 우측',
        'zone_type': 'DEPARTMENT',
        'icon': '👁️',
        'display_order': 2,
        'is_active': True
    },
    {
        'name': '정형외과',
        'svg_id': 'zone-orthopedics',
        'building': '신관',
        'floor': '2F',
        'map_url': '/images/maps/annex_2f.svg',
        'description': '신관 2층 엘리베이터 좌측',
        'zone_type': 'DEPARTMENT',
        'icon': '🦴',
        'display_order': 3,
        'is_active': True
    },
    {
        'name': '내과',
        'svg_id': 'zone-internal-medicine',
        'building': '본관',
        'floor': '2F',
        'map_url': '/images/maps/main_2f.svg',
        'description': '본관 2층 중앙',
        'zone_type': 'DEPARTMENT',
        'icon': '🫀',
        'display_order': 4,
        'is_active': True
    },
    {
        'name': '치과',
        'svg_id': 'zone-dentistry',
        'building': '본관',
        'floor': '4F',
        'map_url': '/images/maps/main_4f.svg',
        'description': '본관 4층 엘리베이터 좌측',
        'zone_type': 'DEPARTMENT',
        'icon': '🦷',
        'display_order': 5,
        'is_active': True
    },
    {
        'name': '소아과',
        'svg_id': 'zone-pediatrics',
        'building': '본관',
        'floor': '2F',
        'map_url': '/images/maps/main_2f.svg',
        'description': '본관 2층 동쪽',
        'zone_type': 'DEPARTMENT',
        'icon': '🧒',
        'display_order': 6,
        'is_active': True
    }
]

# 편의시설 데이터
facilities = [
    {
        'name': '원무과',
        'svg_id': 'zone-administration',
        'building': '본관',
        'floor': '1F',
        'map_url': '/images/maps/main_1f.svg',
        'description': '본관 1층 정문 우측',
        'zone_type': 'FACILITY',
        'icon': '📋',
        'display_order': 101,
        'is_active': True
    },
    {
        'name': '약국',
        'svg_id': 'zone-pharmacy',
        'building': '본관',
        'floor': '1F',
        'map_url': '/images/maps/main_1f.svg',
        'description': '본관 1층 중앙',
        'zone_type': 'FACILITY',
        'icon': '💊',
        'display_order': 102,
        'is_active': True
    },
    {
        'name': '채혈실',
        'svg_id': 'zone-blood-collection',
        'building': '본관',
        'floor': '1F',
        'map_url': '/images/maps/main_1f.svg',
        'description': '본관 1층 서쪽',
        'zone_type': 'FACILITY',
        'icon': '🩸',
        'display_order': 103,
        'is_active': True
    },
    {
        'name': '응급실',
        'svg_id': 'zone-emergency',
        'building': '응급동',
        'floor': '1F',
        'map_url': '/images/maps/emergency_1f.svg',
        'description': '응급동 1층',
        'zone_type': 'FACILITY',
        'icon': '🚨',
        'display_order': 104,
        'is_active': True
    }
]

# 데이터 삽입
for dept in departments:
    zone, created = DepartmentZone.objects.get_or_create(
        name=dept['name'],
        defaults=dept
    )
    if created:
        print(f"✅ Created department: {dept['name']}")
    else:
        print(f"⚠️ Department already exists: {dept['name']}")

for facility in facilities:
    zone, created = DepartmentZone.objects.get_or_create(
        name=facility['name'],
        defaults=facility
    )
    if created:
        print(f"✅ Created facility: {facility['name']}")
    else:
        print(f"⚠️ Facility already exists: {facility['name']}")

print(f"\n총 {DepartmentZone.objects.count()}개의 진료과/시설이 등록되었습니다.")