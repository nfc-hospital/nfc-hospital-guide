# backend/nfc_hospital_system/appointments/management/commands/create_initial_data.py

from django.core.management.base import BaseCommand
from appointments.models import Exam
from nfc.models import NFCTag
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = '초기 검사 및 NFC 태그 데이터를 생성합니다.'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='기존 데이터를 삭제하고 새로 생성',
        )
    
    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('기존 데이터를 삭제합니다...')
            Exam.objects.all().delete()
            NFCTag.objects.all().delete()
        
        # 검사 데이터 생성
        exams_data = [
            {
                "exam_id": "exam-blood-001",
                "title": "혈액검사",
                "preparation": "검사 8시간 전부터 금식하세요.\n물은 소량 섭취 가능합니다.",
                "department": "임상병리과",
                "estimated_duration": 10,
                "is_active": True
            },
            {
                "exam_id": "exam-xray-001", 
                "title": "흉부 X-ray",
                "preparation": "상의를 탈의하고 금속 액세서리를 제거하세요.\n임신 가능성이 있다면 미리 알려주세요.",
                "department": "영상의학과",
                "estimated_duration": 15,
                "is_active": True
            },
            {
                "exam_id": "exam-ct-001",
                "title": "복부 CT", 
                "preparation": "검사 4시간 전부터 금식하세요.\n조영제 알레르기가 있다면 미리 알려주세요.",
                "department": "영상의학과",
                "estimated_duration": 30,
                "is_active": True
            },
            {
                "exam_id": "exam-ultrasound-001",
                "title": "복부 초음파",
                "preparation": "검사 8시간 전부터 금식하세요.\n검사 1시간 전에 물 500ml를 마시세요.",
                "department": "영상의학과", 
                "estimated_duration": 20,
                "is_active": True
            },
            {
                "exam_id": "exam-mri-001",
                "title": "뇌 MRI",
                "preparation": "모든 금속 제품을 제거하세요.\n폐소공포증이 있다면 미리 알려주세요.",
                "department": "영상의학과",
                "estimated_duration": 45,
                "is_active": True
            },
            {
                "exam_id": "exam-endoscopy-001",
                "title": "위내시경",
                "preparation": "검사 12시간 전부터 금식하세요.\n틀니나 렌즈를 제거하세요.",
                "department": "소화기내과",
                "estimated_duration": 30,
                "is_active": True
            },
            {
                "exam_id": "exam-ecg-001",
                "title": "심전도 검사",
                "preparation": "특별한 준비사항은 없습니다.\n상의 탈의가 필요합니다.",
                "department": "순환기내과",
                "estimated_duration": 10,
                "is_active": True
            },
            {
                "exam_id": "exam-echo-001",
                "title": "심장 초음파",
                "preparation": "특별한 준비사항은 없습니다.\n상의 탈의가 필요합니다.",
                "department": "순환기내과", 
                "estimated_duration": 25,
                "is_active": True
            }
        ]
        
        created_exams = 0
        for exam_data in exams_data:
            exam, created = Exam.objects.get_or_create(
                exam_id=exam_data["exam_id"],
                defaults=exam_data
            )
            if created:
                created_exams += 1
                self.stdout.write(f'✓ 검사 생성: {exam.title}')
            else:
                self.stdout.write(f'- 기존 검사: {exam.title}')
        
        # NFC 태그 데이터 생성
        nfc_tags_data = [
            {
                "tag_id": "tag-entrance-001",
                "code": "04a1b2c3d4e5f6",
                "building": "본관",
                "floor": 1,
                "room": "로비",
                "description": "병원 정문 입구",
                "is_active": True
            },
            {
                "tag_id": "tag-reception-001", 
                "code": "04b2c3d4e5f6a7",
                "building": "본관",
                "floor": 1,
                "room": "원무과",
                "description": "접수 데스크",
                "is_active": True
            },
            {
                "tag_id": "tag-blood-001",
                "code": "04c3d4e5f6a7b8",
                "building": "본관",
                "floor": 2,
                "room": "채혈실",
                "description": "채혈실 입구",
                "is_active": True
            },
            {
                "tag_id": "tag-xray-001",
                "code": "04d4e5f6a7b8c9",
                "building": "본관", 
                "floor": 2,
                "room": "X-ray실",
                "description": "흉부 X-ray실 앞",
                "is_active": True
            },
            {
                "tag_id": "tag-ct-001",
                "code": "04e5f6a7b8c9da",
                "building": "본관",
                "floor": 3,
                "room": "CT실",
                "description": "CT실 대기실",
                "is_active": True
            },
            {
                "tag_id": "tag-mri-001",
                "code": "04f6a7b8c9daeb",
                "building": "본관",
                "floor": 3, 
                "room": "MRI실",
                "description": "MRI실 앞 복도",
                "is_active": True
            },
            {
                "tag_id": "tag-endoscopy-001",
                "code": "04a7b8c9daebfc",
                "building": "별관",
                "floor": 2,
                "room": "내시경실",
                "description": "내시경센터 입구",
                "is_active": True
            },
            {
                "tag_id": "tag-pharmacy-001",
                "code": "04b8c9daebfc0d",
                "building": "본관",
                "floor": 1,
                "room": "약국",
                "description": "원내 약국 앞",
                "is_active": True
            }
        ]
        
        created_tags = 0
        for tag_data in nfc_tags_data:
            tag, created = NFCTag.objects.get_or_create(
                tag_id=tag_data["tag_id"],
                defaults=tag_data
            )
            if created:
                created_tags += 1
                self.stdout.write(f'✓ NFC 태그 생성: {tag.get_location_display()}')
            else:
                self.stdout.write(f'- 기존 태그: {tag.get_location_display()}')
        
        # 요약 출력
        self.stdout.write(
            self.style.SUCCESS(
                f'\n초기 데이터 생성 완료!'
                f'\n- 검사: {created_exams}개 신규 생성 (총 {Exam.objects.count()}개)'
                f'\n- NFC 태그: {created_tags}개 신규 생성 (총 {NFCTag.objects.count()}개)'
            )
        )
        
        # 검사-태그 매핑 예시 생성
        self.create_exam_tag_mappings()
    
    def create_exam_tag_mappings(self):
        """검사와 NFC 태그 매핑 예시 생성"""
        mappings = [
            ("exam-blood-001", "tag-blood-001"),
            ("exam-xray-001", "tag-xray-001"), 
            ("exam-ct-001", "tag-ct-001"),
            ("exam-mri-001", "tag-mri-001"),
            ("exam-endoscopy-001", "tag-endoscopy-001"),
        ]
        
        mapped_count = 0
        for exam_id, tag_id in mappings:
            try:
                exam = Exam.objects.get(exam_id=exam_id)
                tag = NFCTag.objects.get(tag_id=tag_id)
                
                # exam_tags 중간 테이블이 있다면 매핑 생성
                # (모델 구조에 따라 조정 필요)
                if hasattr(exam, 'tags'):
                    exam.tags.add(tag)
                    mapped_count += 1
                    
            except (Exam.DoesNotExist, NFCTag.DoesNotExist):
                continue
        
        if mapped_count > 0:
            self.stdout.write(f'✓ 검사-태그 매핑 {mapped_count}개 생성')