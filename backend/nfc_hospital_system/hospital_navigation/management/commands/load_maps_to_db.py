"""
SVG 지도 파일들을 HospitalMap 데이터베이스에 로드하는 Django 관리 명령
"""

import os
from django.core.management.base import BaseCommand
from django.conf import settings
from hospital_navigation.models import HospitalMap


class Command(BaseCommand):
    help = 'SVG 지도 파일들을 HospitalMap 데이터베이스에 로드합니다'

    def handle(self, *args, **options):
        maps_dir = os.path.join(settings.BASE_DIR, 'static', 'maps')
        
        if not os.path.exists(maps_dir):
            self.stdout.write(self.style.ERROR(f'지도 디렉토리를 찾을 수 없습니다: {maps_dir}'))
            return
        
        # 지도 파일 정보 매핑 (파일명 -> 건물, 층)
        map_configs = {
            'main_1f.svg': {'building': 'main', 'floor': 1, 'width': 900, 'height': 600},
            'main_2f.svg': {'building': 'main', 'floor': 2, 'width': 900, 'height': 600},
            'cancer_1f.svg': {'building': 'cancer', 'floor': 1, 'width': 900, 'height': 600},
            'cancer_2f.svg': {'building': 'cancer', 'floor': 2, 'width': 900, 'height': 600},
            'annex_1f.svg': {'building': 'annex', 'floor': 1, 'width': 900, 'height': 600},
            'overview_main_1f.svg': {'building': 'main', 'floor': 1, 'width': 1200, 'height': 800},
            'overview_main_2f.svg': {'building': 'main', 'floor': 2, 'width': 1200, 'height': 800},
            'overview_cancer_2f.svg': {'building': 'cancer', 'floor': 2, 'width': 1200, 'height': 800},
        }
        
        loaded_count = 0
        updated_count = 0
        
        for filename, config in map_configs.items():
            svg_path = os.path.join(maps_dir, filename)
            
            # interactive 버전도 체크
            if not os.path.exists(svg_path):
                interactive_filename = filename.replace('.svg', '.interactive.svg')
                interactive_path = os.path.join(maps_dir, interactive_filename)
                if os.path.exists(interactive_path):
                    svg_path = interactive_path
                    filename = interactive_filename
            
            if not os.path.exists(svg_path):
                self.stdout.write(self.style.WARNING(f'파일을 찾을 수 없습니다: {filename}'))
                continue
            
            # SVG 파일 내용 읽기
            try:
                with open(svg_path, 'r', encoding='utf-8') as f:
                    svg_content = f.read()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'{filename} 읽기 실패: {e}'))
                continue
            
            # 데이터베이스에 저장 또는 업데이트
            hospital_map, created = HospitalMap.objects.update_or_create(
                building=config['building'],
                floor=config['floor'],
                defaults={
                    'svg_data': svg_content,
                    'width': config.get('width', 900),
                    'height': config.get('height', 600),
                    'scale': 1.0,
                    'metadata': {
                        'filename': filename,
                        'type': 'overview' if 'overview' in filename else 'detail',
                        'interactive': 'interactive' in filename
                    },
                    'is_active': True
                }
            )
            
            if created:
                loaded_count += 1
                self.stdout.write(self.style.SUCCESS(f'✅ 생성: {hospital_map}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f'✅ 업데이트: {hospital_map}'))
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n완료! 새로 생성: {loaded_count}개, 업데이트: {updated_count}개'
            )
        )
        
        # 전체 지도 목록 출력
        self.stdout.write('\n📍 현재 데이터베이스의 지도 목록:')
        for map_obj in HospitalMap.objects.filter(is_active=True).order_by('building', 'floor'):
            svg_size = len(map_obj.svg_data) if map_obj.svg_data else 0
            self.stdout.write(
                f'  - {map_obj}: SVG 크기={svg_size} bytes, '
                f'크기={map_obj.width}x{map_obj.height}'
            )