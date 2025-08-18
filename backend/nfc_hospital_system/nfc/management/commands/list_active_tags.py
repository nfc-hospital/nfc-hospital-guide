from django.core.management.base import BaseCommand
from django.db.models import Count
from nfc.models import NFCTag, NFCTagExam, TagLog
from appointments.models import Exam
import json
from datetime import datetime, timedelta
from django.utils import timezone

class Command(BaseCommand):
    help = '활성화된 NFC 태그 목록을 출력하고 NTAG-213 인코딩 가이드를 생성합니다.'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--format',
            type=str,
            default='table',
            choices=['table', 'json', 'encoding'],
            help='출력 형식 선택 (table/json/encoding)'
        )
        parser.add_argument(
            '--active-only',
            action='store_true',
            help='활성화된 태그만 표시'
        )
        parser.add_argument(
            '--with-stats',
            action='store_true',
            help='사용 통계 포함'
        )
    
    def handle(self, *args, **options):
        format_type = options['format']
        active_only = options['active_only']
        with_stats = options['with_stats']
        
        # 태그 조회
        tags = NFCTag.objects.all()
        if active_only:
            tags = tags.filter(is_active=True)
        
        tags = tags.order_by('building', 'floor', 'room')
        
        self.stdout.write(self.style.SUCCESS(f'\n=== NFC 태그 목록 ({tags.count()}개) ===\n'))
        
        if format_type == 'table':
            self.print_table(tags, with_stats)
        elif format_type == 'json':
            self.print_json(tags)
        elif format_type == 'encoding':
            self.print_encoding_guide(tags)
    
    def print_table(self, tags, with_stats=False):
        """테이블 형식으로 출력"""
        self.stdout.write(
            f"{'No.':<4} {'Code':<20} {'Location':<30} {'Status':<10} {'UUID':<40}"
        )
        self.stdout.write("-" * 110)
        
        for idx, tag in enumerate(tags, 1):
            status = self.style.SUCCESS('✓ Active') if tag.is_active else self.style.ERROR('✗ Inactive')
            location = f"{tag.building} {tag.floor}F {tag.room}"
            
            self.stdout.write(
                f"{idx:<4} {tag.code:<20} {location:<30} {status:<10} {str(tag.tag_id):<40}"
            )
            
            if with_stats:
                # 사용 통계
                last_7_days = timezone.now() - timedelta(days=7)
                scan_count = TagLog.objects.filter(
                    tag=tag,
                    timestamp__gte=last_7_days
                ).count()
                
                # 연결된 검사
                exam_count = NFCTagExam.objects.filter(
                    tag=tag,
                    is_active=True
                ).count()
                
                self.stdout.write(
                    f"     └─ 스캔: {scan_count}회 (7일), 연결 검사: {exam_count}개"
                )
                
                # 연결된 검사 목록
                exams = NFCTagExam.objects.filter(tag=tag, is_active=True)
                for exam in exams:
                    self.stdout.write(f"        - {exam.exam_name} ({exam.exam_room})")
    
    def print_json(self, tags):
        """JSON 형식으로 출력"""
        tag_data = []
        
        for tag in tags:
            # 연결된 검사 정보
            exams = NFCTagExam.objects.filter(tag=tag, is_active=True)
            exam_list = [
                {
                    'exam_id': exam.exam_id,
                    'exam_name': exam.exam_name,
                    'exam_room': exam.exam_room
                }
                for exam in exams
            ]
            
            tag_data.append({
                'tag_id': str(tag.tag_id),
                'tag_uid': tag.tag_uid,
                'code': tag.code,
                'building': tag.building,
                'floor': tag.floor,
                'room': tag.room,
                'description': tag.description,
                'x_coord': tag.x_coord,
                'y_coord': tag.y_coord,
                'is_active': tag.is_active,
                'last_scanned_at': tag.last_scanned_at.isoformat() if tag.last_scanned_at else None,
                'exams': exam_list
            })
        
        self.stdout.write(json.dumps(tag_data, indent=2, ensure_ascii=False))
    
    def print_encoding_guide(self, tags):
        """NTAG-213 인코딩 가이드 출력"""
        self.stdout.write(self.style.WARNING('\n=== NTAG-213 인코딩 가이드 ==='))
        self.stdout.write('NTAG-213 사양: 180 bytes 사용 가능 (NDEF 헤더 제외 시 약 160 bytes)\n')
        
        for tag in tags:
            if not tag.is_active:
                continue
            
            # 연결된 검사 정보 (첫 번째만)
            exam = NFCTagExam.objects.filter(tag=tag, is_active=True).first()
            exam_id = exam.exam_id if exam else None
            
            # JSON 데이터 (최소화)
            ndef_data = {
                'c': tag.code,  # code
                'b': tag.building[:10],  # building (10자 제한)
                'f': str(tag.floor),  # floor
                'r': tag.room[:20],  # room (20자 제한)
            }
            
            if exam_id:
                ndef_data['e'] = exam_id  # exam_id
            
            json_str = json.dumps(ndef_data, ensure_ascii=False, separators=(',', ':'))
            byte_size = len(json_str.encode('utf-8'))
            
            self.stdout.write(f"\n태그: {tag.code}")
            self.stdout.write(f"위치: {tag.building} {tag.floor}층 {tag.room}")
            self.stdout.write(f"UUID: {tag.tag_id}")
            self.stdout.write(f"UID: {tag.tag_uid}")
            
            if byte_size <= 160:
                self.stdout.write(self.style.SUCCESS(f"✓ NDEF 크기: {byte_size} bytes (적합)"))
            else:
                self.stdout.write(self.style.ERROR(f"✗ NDEF 크기: {byte_size} bytes (초과!)"))
            
            self.stdout.write(f"NDEF JSON: {json_str}")
            
            # NFC Tools 앱용 인코딩 명령
            self.stdout.write(self.style.NOTICE("\nNFC Tools 앱 인코딩 방법:"))
            self.stdout.write("1. NFC Tools 앱 실행")
            self.stdout.write("2. 'Write' 탭 선택")
            self.stdout.write("3. 'Add a record' → 'Text' 선택")
            self.stdout.write(f"4. 다음 텍스트 입력: {json_str}")
            self.stdout.write("5. 'Write' 버튼으로 NTAG-213 태그에 기록")
            
            # URI 백업 (선택사항)
            backup_uri = f"https://nfc-hospital.kr/nfc/{tag.code}"
            self.stdout.write(f"\n백업 URI (선택): {backup_uri}")
            self.stdout.write("-" * 60)
        
        # 요약 통계
        self.stdout.write(self.style.SUCCESS(f"\n총 {tags.filter(is_active=True).count()}개 활성 태그 인코딩 준비 완료"))
        
        # 샘플 Python 코드
        self.stdout.write(self.style.WARNING("\n=== Python ndeflib 인코딩 예제 ==="))
        self.stdout.write("""
import ndef
import nfc

def write_tag(tag_data):
    # NDEF Text Record 생성
    text_record = ndef.TextRecord(tag_data)
    
    # NFC 리더 연결
    clf = nfc.ContactlessFrontend('usb')
    
    # 태그 쓰기
    def write(tag):
        if tag.ndef:
            tag.ndef.records = [text_record]
            return True
        return False
    
    clf.connect(rdwr={'on-connect': write})
    clf.close()

# 사용 예
tag_json = '{"c":"nfc-lobby-001","b":"본관","f":"1","r":"로비"}'
write_tag(tag_json)
        """)
    
    def get_scan_statistics(self, tag):
        """태그 스캔 통계 조회"""
        last_30_days = timezone.now() - timedelta(days=30)
        
        stats = TagLog.objects.filter(
            tag=tag,
            timestamp__gte=last_30_days
        ).aggregate(
            total_scans=Count('log_id'),
            unique_users=Count('user', distinct=True)
        )
        
        return stats