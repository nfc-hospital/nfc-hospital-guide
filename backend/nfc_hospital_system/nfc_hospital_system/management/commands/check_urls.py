from django.core.management.base import BaseCommand
from django.urls import get_resolver
from django.conf import settings
import re

class Command(BaseCommand):
    help = 'JWT 토큰 관련 URL이 올바르게 등록되었는지 확인'

    def handle(self, *args, **options):
        resolver = get_resolver()
        
        # JWT 관련 URL들을 찾기
        jwt_urls = []
        queue_urls = []
        
        def extract_patterns(urlpatterns, prefix=''):
            for pattern in urlpatterns:
                if hasattr(pattern, 'url_patterns'):
                    # Include된 URL 패턴들
                    new_prefix = prefix + pattern.pattern.regex.pattern
                    extract_patterns(pattern.url_patterns, new_prefix)
                else:
                    # 개별 URL 패턴
                    full_pattern = prefix + pattern.pattern.regex.pattern
                    
                    # JWT 관련 URL 찾기
                    if 'token' in full_pattern or 'auth' in full_pattern:
                        jwt_urls.append(full_pattern)
                    
                    # Queue realtime-data URL 찾기
                    if 'queue' in full_pattern and 'realtime-data' in full_pattern:
                        queue_urls.append(full_pattern)

        extract_patterns(resolver.url_patterns)
        
        self.stdout.write(self.style.SUCCESS('=== JWT 관련 URL 목록 ==='))
        for url in jwt_urls:
            cleaned_url = re.sub(r'[()^$]', '', url).replace('\\', '')
            self.stdout.write(f'  ✅ {cleaned_url}')
        
        self.stdout.write(self.style.SUCCESS('\n=== Queue realtime-data URL 목록 ==='))
        for url in queue_urls:
            cleaned_url = re.sub(r'[()^$]', '', url).replace('\\', '')
            self.stdout.write(f'  ✅ {cleaned_url}')
        
        # 특정 URL들이 등록되었는지 확인
        expected_urls = [
            '/api/v1/auth/token/refresh/',
            '/api/v1/queue/admin/realtime-data/'
        ]
        
        self.stdout.write(self.style.SUCCESS('\n=== 중요한 URL 확인 ==='))
        for expected_url in expected_urls:
            found = any(expected_url.replace('/', '').replace('-', '') in url.replace('/', '').replace('-', '') for url in jwt_urls + queue_urls)
            status = '✅ 등록됨' if found else '❌ 누락됨'
            self.stdout.write(f'  {status}: {expected_url}')
        
        # JWT 설정 정보 출력
        self.stdout.write(self.style.SUCCESS('\n=== JWT 설정 확인 ==='))
        jwt_settings = getattr(settings, 'SIMPLE_JWT', {})
        self.stdout.write(f'  USER_ID_FIELD: {jwt_settings.get("USER_ID_FIELD", "NOT_SET")}')
        self.stdout.write(f'  AUTH_HEADER_TYPES: {jwt_settings.get("AUTH_HEADER_TYPES", "NOT_SET")}')
        self.stdout.write(f'  AUTH_TOKEN_CLASSES: {jwt_settings.get("AUTH_TOKEN_CLASSES", "NOT_SET")}')