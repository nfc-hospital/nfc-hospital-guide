"""
중복 Queue 정리 스크립트
같은 user + exam 조합에 대해 중복된 Queue를 삭제하고 최신 것만 유지합니다.
"""

import os
import django
import sys

# Django 설정
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')
django.setup()

from p_queue.models import Queue
from django.db.models import Count
from django.utils import timezone

def cleanup_duplicate_queues():
    """중복 Queue 정리"""

    print("=" * 60)
    print("중복 Queue 정리 시작")
    print("=" * 60)

    # 모든 Queue 조회
    all_queues = Queue.objects.all().select_related('user', 'exam', 'appointment')
    print(f"\n📊 전체 Queue 개수: {all_queues.count()}개")

    # user + exam 조합별로 그룹화
    user_exam_combinations = {}

    for queue in all_queues:
        key = (queue.user_id, queue.exam_id)
        if key not in user_exam_combinations:
            user_exam_combinations[key] = []
        user_exam_combinations[key].append(queue)

    print(f"\n📋 고유한 user+exam 조합: {len(user_exam_combinations)}개")

    # 중복 제거
    total_deleted = 0

    for (user_id, exam_id), queues in user_exam_combinations.items():
        if len(queues) > 1:
            # 최신 Queue를 제외한 나머지 삭제
            queues_sorted = sorted(queues, key=lambda q: q.created_at, reverse=True)
            latest_queue = queues_sorted[0]
            duplicates = queues_sorted[1:]

            print(f"\n🔍 [{queues[0].user.name}] - {queues[0].exam.title}")
            print(f"   총 {len(queues)}개 Queue 발견")
            print(f"   ✅ 유지: {latest_queue.queue_id} (state: {latest_queue.state}, created: {latest_queue.created_at.strftime('%Y-%m-%d %H:%M:%S')})")

            # 중복 삭제
            for dup_queue in duplicates:
                print(f"   ❌ 삭제: {dup_queue.queue_id} (state: {dup_queue.state}, created: {dup_queue.created_at.strftime('%Y-%m-%d %H:%M:%S')})")
                dup_queue.delete()
                total_deleted += 1

    print("\n" + "=" * 60)
    print(f"✅ 정리 완료: {total_deleted}개 중복 Queue 삭제됨")
    print(f"📊 남은 Queue 개수: {Queue.objects.count()}개")
    print("=" * 60)

if __name__ == '__main__':
    try:
        cleanup_duplicate_queues()
    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
