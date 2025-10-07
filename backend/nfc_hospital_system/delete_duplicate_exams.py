#!/usr/bin/env python
"""
중복 검사 항목을 안전하게 삭제하는 스크립트
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')
django.setup()

from appointments.models import Exam

def delete_duplicate_exams():
    """중복 검사 항목 삭제"""

    # 삭제할 exam_id 리스트
    to_delete = [
        'BLOOD01',      # blood-test로 통합
        'blood_test',   # blood-test로 통합
        'USG001',       # ultrasound로 통합
        'XRAY001',      # xray로 통합
        'EX_X-ray실',   # xray로 통합
        'exam_002',     # xray로 통합
        'EX_내과',      # internal-medicine로 통합
        'internal_med', # internal-medicine로 통합
        'CT001',        # ct_scan으로 통합
        'EX_CT실',      # ct_scan으로 통합
        'MRI001',       # mri_scan으로 통합
        'EX_MRI실',     # mri_scan으로 통합
        'exam_003',     # EKG001로 통합
    ]

    print("=" * 60)
    print("중복 검사 항목 삭제 시작")
    print("=" * 60)

    deleted_count = 0
    skipped_count = 0
    not_found_count = 0

    for exam_id in to_delete:
        try:
            exam = Exam.objects.get(exam_id=exam_id)

            # 관련 데이터 확인
            appt_count = exam.appointments.count() if hasattr(exam, 'appointments') else 0
            queue_count = exam.queues.count() if hasattr(exam, 'queues') else 0

            if appt_count == 0 and queue_count == 0:
                exam_title = exam.title
                exam.delete()
                deleted_count += 1
                print(f"✅ 삭제됨: {exam_id} ({exam_title})")
            else:
                skipped_count += 1
                print(f"⚠️  건너뜀: {exam_id} ({exam.title}) - 예약 {appt_count}개, 대기열 {queue_count}개")
        except Exam.DoesNotExist:
            not_found_count += 1
            print(f"❌ 없음: {exam_id}")
        except Exception as e:
            print(f"❌ 오류: {exam_id} - {str(e)}")

    print("\n" + "=" * 60)
    print("작업 완료 요약")
    print("=" * 60)
    print(f"✅ 삭제된 검사: {deleted_count}개")
    print(f"⚠️  건너뛴 검사: {skipped_count}개 (사용 중)")
    print(f"❌ 없는 검사: {not_found_count}개")
    print(f"📊 총 처리: {len(to_delete)}개")

    # 남은 검사 목록 확인
    remaining_exams = Exam.objects.all().order_by('department', 'title')
    print(f"\n📋 남은 검사 목록 (총 {remaining_exams.count()}개):")
    print("-" * 60)

    current_dept = None
    for exam in remaining_exams:
        if exam.department != current_dept:
            current_dept = exam.department
            print(f"\n[{current_dept}]")
        print(f"  - {exam.exam_id}: {exam.title}")

    print("\n✅ 중복 검사 정리 완료!")

if __name__ == "__main__":
    delete_duplicate_exams()