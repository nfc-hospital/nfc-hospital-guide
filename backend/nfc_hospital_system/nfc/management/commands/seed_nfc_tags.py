# nfc/management/commands/seed_nfc_tags.py
"""
NFC 태그 테스트 데이터 생성 커맨드
네비게이션 노드와 연결될 NFC 태그를 생성합니다.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from nfc.models import NFCTag
import uuid


class Command(BaseCommand):
    help = 'NFC 태그 테스트 데이터를 생성합니다.'

    def handle(self, *args, **options):
        self.stdout.write('NFC 태그 테스트 데이터 생성을 시작합니다...')
        
        with transaction.atomic():
            # NFC 태그 데이터
            tags_data = [
                # 1층 태그
                {'code': 'TAG001', 'building': '본관', 'floor': 1, 'room': '접수처', 
                 'description': '병원 본관 1층 접수처', 'x_coord': 500, 'y_coord': 300},
                {'code': 'TAG006', 'building': '본관', 'floor': 1, 'room': '약국', 
                 'description': '병원 본관 1층 약국', 'x_coord': 300, 'y_coord': 300},
                 
                # 2층 태그 - 진료실
                {'code': 'TAG002', 'building': '본관', 'floor': 2, 'room': '내과 진료실', 
                 'description': '병원 본관 2층 내과 진료실', 'x_coord': 300, 'y_coord': 300},
                {'code': 'TAG009', 'building': '본관', 'floor': 2, 'room': '외과 진료실', 
                 'description': '병원 본관 2층 외과 진료실', 'x_coord': 700, 'y_coord': 300},
                 
                # 2층 태그 - 영상의학과
                {'code': 'TAG007', 'building': '본관', 'floor': 2, 'room': '영상의학과 접수', 
                 'description': '병원 본관 2층 영상의학과 접수', 'x_coord': 500, 'y_coord': 400},
                {'code': 'TAG003', 'building': '본관', 'floor': 2, 'room': 'X-Ray실', 
                 'description': '병원 본관 2층 X-Ray실', 'x_coord': 400, 'y_coord': 500},
                {'code': 'TAG004', 'building': '본관', 'floor': 2, 'room': 'CT실', 
                 'description': '병원 본관 2층 CT실', 'x_coord': 600, 'y_coord': 500},
                 
                # 3층 태그
                {'code': 'TAG008', 'building': '본관', 'floor': 3, 'room': '산부인과 진료실', 
                 'description': '병원 본관 3층 산부인과 진료실', 'x_coord': 300, 'y_coord': 300},
                {'code': 'TAG005', 'building': '본관', 'floor': 3, 'room': '소아과 진료실', 
                 'description': '병원 본관 3층 소아과 진료실', 'x_coord': 700, 'y_coord': 300},
                {'code': 'TAG010', 'building': '본관', 'floor': 3, 'room': '안과 진료실', 
                 'description': '병원 본관 3층 안과 진료실', 'x_coord': 500, 'y_coord': 300},
                 
                # 추가 태그 (대기실, 화장실 등)
                {'code': 'TAG011', 'building': '본관', 'floor': 1, 'room': '엘리베이터', 
                 'description': '병원 본관 1층 엘리베이터', 'x_coord': 400, 'y_coord': 400},
                {'code': 'TAG012', 'building': '본관', 'floor': 2, 'room': '엘리베이터', 
                 'description': '병원 본관 2층 엘리베이터', 'x_coord': 400, 'y_coord': 400},
                {'code': 'TAG013', 'building': '본관', 'floor': 3, 'room': '엘리베이터', 
                 'description': '병원 본관 3층 엘리베이터', 'x_coord': 400, 'y_coord': 400},
                {'code': 'TAG014', 'building': '본관', 'floor': 2, 'room': '내과 대기실', 
                 'description': '병원 본관 2층 내과 대기실', 'x_coord': 300, 'y_coord': 200},
                {'code': 'TAG015', 'building': '본관', 'floor': 3, 'room': '소아과 대기실', 
                 'description': '병원 본관 3층 소아과 대기실', 'x_coord': 700, 'y_coord': 200},
            ]
            
            created_count = 0
            for tag_data in tags_data:
                tag, created = NFCTag.objects.get_or_create(
                    code=tag_data['code'],
                    defaults={
                        'tag_uid': f"NFC_{tag_data['code']}_{uuid.uuid4().hex[:8]}",
                        **tag_data,
                        'is_active': True
                    }
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(f"  ✓ {tag.code}: {tag.get_location_display()} 생성됨")
                else:
                    self.stdout.write(f"  - {tag.code}: 이미 존재함")
            
            self.stdout.write(
                self.style.SUCCESS(f'\nNFC 태그 테스트 데이터 생성 완료! (신규 생성: {created_count}개)')
            )