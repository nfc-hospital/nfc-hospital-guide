from django.core.management.base import BaseCommand
from nfc.models import NFCTag

class Command(BaseCommand):
    help = '개발용 샘플 NFC 태그 생성'

    def handle(self, *args, **options):
        # 샘플 태그 데이터
        sample_tags = [
            {
                'code': 'nfc-xray-001',
                'tag_uid': 'UID-XRAY-001',
                'building': '본관',
                'floor': 1,
                'room': 'X-ray실',
                'description': '본관 1층 X-ray 검사실',
                'x_coord': 100.0,
                'y_coord': 200.0
            },
            {
                'code': 'nfc-ct-001',
                'tag_uid': 'UID-CT-001',
                'building': '본관',
                'floor': 2,
                'room': 'CT실',
                'description': '본관 2층 CT 검사실',
                'x_coord': 150.0,
                'y_coord': 250.0
            },
            {
                'code': 'nfc-mri-001',
                'tag_uid': 'UID-MRI-001',
                'building': '별관',
                'floor': 1,
                'room': 'MRI실',
                'description': '별관 1층 MRI 검사실',
                'x_coord': 200.0,
                'y_coord': 300.0
            },
            {
                'code': 'nfc-ultrasound-001',
                'tag_uid': 'UID-ULTRASOUND-001',
                'building': '본관',
                'floor': 3,
                'room': '초음파실',
                'description': '본관 3층 초음파 검사실',
                'x_coord': 120.0,
                'y_coord': 350.0
            },
            {
                'code': 'nfc-bloodtest-001',
                'tag_uid': 'UID-BLOODTEST-001',
                'building': '본관',
                'floor': 1,
                'room': '채혈실',
                'description': '본관 1층 채혈실',
                'x_coord': 80.0,
                'y_coord': 180.0
            }
        ]

        created_count = 0
        for tag_data in sample_tags:
            tag, created = NFCTag.objects.update_or_create(
                code=tag_data['code'],
                defaults=tag_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✅ 생성됨: {tag.code} - {tag.get_location_display()}'))
            else:
                self.stdout.write(self.style.WARNING(f'⚠️ 이미 존재: {tag.code} - {tag.get_location_display()}'))

        self.stdout.write(self.style.SUCCESS(f'\n총 {created_count}개의 새로운 태그가 생성되었습니다.'))
        self.stdout.write(self.style.SUCCESS(f'전체 태그 수: {NFCTag.objects.count()}개'))