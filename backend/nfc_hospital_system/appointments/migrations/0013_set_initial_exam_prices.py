from django.db import migrations

def set_initial_prices(apps, schema_editor):
    """검사별 초기 가격 설정"""
    Exam = apps.get_model('appointments', 'Exam')

    # 검사별 가격 매핑 (가격, 보험적용률)
    price_map = {
        '혈액검사': (15000, 0.80),
        'X-ray': (25000, 0.70),
        'CT': (150000, 0.70),
        'MRI': (500000, 0.70),
        '내과진료': (20000, 0.90),
        '심전도': (30000, 0.80),
        '초음파': (80000, 0.70),
        '소변검사': (10000, 0.80),
        '대장내시경': (200000, 0.70),
        '위내시경': (150000, 0.70),
        '유방촬영': (40000, 0.70),
        '골밀도': (35000, 0.70),
    }

    updated_count = 0

    for exam in Exam.objects.all():
        price_set = False

        # 검사명에 키워드가 포함되어 있으면 해당 가격 적용
        for keyword, (price, coverage) in price_map.items():
            if keyword in exam.title:
                exam.base_price = price
                exam.insurance_coverage = coverage
                exam.save()
                updated_count += 1
                price_set = True
                print(f"Updated {exam.title}: {price}원 (보험 {int(coverage*100)}%)")
                break

        # 매핑되지 않은 검사는 기본값 유지
        if not price_set:
            print(f"Using default price for {exam.title}: {exam.base_price}원")

    print(f"Total updated exams: {updated_count}")

def reverse_initial_prices(apps, schema_editor):
    """마이그레이션 되돌리기 시 기본값으로 복원"""
    Exam = apps.get_model('appointments', 'Exam')

    for exam in Exam.objects.all():
        exam.base_price = 25000
        exam.insurance_coverage = 0.70
        exam.save()

class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0012_exam_base_price_exam_insurance_coverage_and_more'),
    ]

    operations = [
        migrations.RunPython(
            set_initial_prices,
            reverse_code=reverse_initial_prices,
        ),
    ]