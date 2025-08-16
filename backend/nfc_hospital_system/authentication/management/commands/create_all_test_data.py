# authentication/management/commands/create_all_test_data.py
from django.core.management.base import BaseCommand
from authentication.models import User
from appointments.models import Exam
from nfc.models import NFCTag, NFCTagExam
from datetime import datetime
import uuid


class Command(BaseCommand):
    help = 'Cypress 테스트를 위한 모든 테스트 데이터 생성'

    def handle(self, *args, **options):
        self.stdout.write('테스트 데이터 생성을 시작합니다...\n')
        
        # 1. 테스트 사용자 생성
        self.stdout.write('1. 테스트 사용자 생성...')
        test_user, created = User.objects.get_or_create(
            phone_number='010-1234-5678',
            defaults={
                'name': '테스트환자5678',
                'birth_date': datetime.strptime('19900101', '%Y%m%d').date(),
                'email': 'test5678@example.com',
                'role': 'patient'
            }
        )
        self.stdout.write(self.style.SUCCESS(
            f'   테스트 사용자 {"생성됨" if created else "이미 존재"}: {test_user.user_id}'
        ))
        
        # 2. 검사 종류 생성
        self.stdout.write('\n2. 검사 데이터 생성...')
        exams_data = [
            {
                'exam_id': 'xray',
                'title': 'X선 촬영',
                'description': '흉부 X선 촬영 검사',
                'department': '영상의학과',
                'building': '본관',
                'floor': '2F',
                'room': '201호',
                'average_duration': 15,
                'buffer_time': 5,
                'x_coord': 100.0,
                'y_coord': 200.0
            },
            {
                'exam_id': 'blood-test',
                'title': '혈액검사',
                'description': '일반 혈액 검사',
                'department': '진단검사의학과',
                'building': '본관',
                'floor': '1F',
                'room': '105호',
                'average_duration': 10,
                'buffer_time': 5,
                'x_coord': 150.0,
                'y_coord': 100.0
            },
            {
                'exam_id': 'ultrasound',
                'title': '초음파검사',
                'description': '복부 초음파 검사',
                'department': '영상의학과',
                'building': '본관',
                'floor': '3F',
                'room': '305호',
                'average_duration': 30,
                'buffer_time': 10,
                'x_coord': 200.0,
                'y_coord': 300.0
            },
            {
                'exam_id': 'internal-medicine',
                'title': '내과 진료',
                'description': '내과 전문의 진료',
                'department': '내과',
                'building': '본관',
                'floor': '4F',
                'room': '401호',
                'average_duration': 20,
                'buffer_time': 10,
                'x_coord': 250.0,
                'y_coord': 400.0
            }
        ]
        
        for exam_data in exams_data:
            exam, created = Exam.objects.get_or_create(
                exam_id=exam_data['exam_id'],
                defaults=exam_data
            )
            self.stdout.write(self.style.SUCCESS(
                f'   {exam.title} {"생성됨" if created else "이미 존재"}'
            ))
        
        # 3. NFC 태그 생성
        self.stdout.write('\n3. NFC 태그 생성...')
        nfc_tags_data = [
            # 공통 구역
            {'tag_id': 'nfc-lobby-001', 'location': '로비', 'building': '본관', 'floor': 1, 'room': '로비'},
            {'tag_id': 'nfc-reception-001', 'location': '접수창구', 'building': '본관', 'floor': 1, 'room': '접수'},
            {'tag_id': 'nfc-corridor-001', 'location': '복도', 'building': '본관', 'floor': 1, 'room': '복도'},
            {'tag_id': 'nfc-payment-001', 'location': '수납창구', 'building': '본관', 'floor': 1, 'room': '수납'},
            {'tag_id': 'nfc-pharmacy-001', 'location': '약국', 'building': '본관', 'floor': 1, 'room': '약국'},
            {'tag_id': 'nfc-exit-001', 'location': '출구', 'building': '본관', 'floor': 1, 'room': '출구'},
            
            # 검사실별
            {'tag_id': 'nfc-xray-001', 'location': 'X선실', 'building': '본관', 'floor': 2, 'room': '201호'},
            {'tag_id': 'nfc-blood-test-001', 'location': '채혈실', 'building': '본관', 'floor': 1, 'room': '105호'},
            {'tag_id': 'nfc-ultrasound-001', 'location': '초음파실', 'building': '본관', 'floor': 3, 'room': '305호'},
            {'tag_id': 'nfc-internal-medicine-001', 'location': '내과진료실', 'building': '본관', 'floor': 4, 'room': '401호'},
        ]
        
        for tag_data in nfc_tags_data:
            nfc_tag, created = NFCTag.objects.get_or_create(
                code=tag_data['tag_id'],
                defaults={
                    'tag_uid': str(uuid.uuid4()),
                    'building': tag_data['building'],
                    'floor': tag_data['floor'],
                    'room': tag_data['room'],
                    'description': f"{tag_data['location']} NFC 태그",
                    'x_coord': 0.0,
                    'y_coord': 0.0,
                    'is_active': True
                }
            )
            self.stdout.write(self.style.SUCCESS(
                f'   {tag_data["location"]} NFC 태그 {"생성됨" if created else "이미 존재"}'
            ))
        
        # 4. NFC 태그와 검사 연결
        self.stdout.write('\n4. NFC 태그와 검사 매핑...')
        mappings = [
            ('nfc-xray-001', 'xray'),
            ('nfc-blood-test-001', 'blood-test'),
            ('nfc-ultrasound-001', 'ultrasound'),
            ('nfc-internal-medicine-001', 'internal-medicine'),
        ]
        
        for tag_code, exam_id in mappings:
            try:
                tag = NFCTag.objects.get(code=tag_code)
                exam = Exam.objects.get(exam_id=exam_id)
                
                mapping, created = NFCTagExam.objects.get_or_create(
                    tag=tag,
                    exam=exam,
                    defaults={
                        'exam_name': exam.title,
                        'exam_room': exam.room,
                        'is_active': True
                    }
                )
                self.stdout.write(self.style.SUCCESS(
                    f'   {tag_code} - {exam_id} 매핑 {"생성됨" if created else "이미 존재"}'
                ))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'   매핑 오류: {e}'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ 모든 테스트 데이터가 생성되었습니다!'))
        self.stdout.write('\n테스트 정보:')
        self.stdout.write(f'  - 전화번호: 010-1234-5678 (뒷자리: 5678)')
        self.stdout.write(f'  - 생년월일: 1990-01-01 (입력시: 900101)')
        self.stdout.write(f'  - 검사: X선, 혈액검사, 초음파, 내과진료')
        self.stdout.write(f'  - NFC 태그: 10개 (로비, 접수, 각 검사실 등)\n')