"""
옛날 Queue 정리 스크립트
오늘 것만 남기고 전부 삭제합니다.
"""

import os
import django
import sys

# Django 설정
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nfc_hospital_system.settings')
django.setup()

from p_queue.models import Queue
from django.utils import timezone

def cleanup_old_queues():
    """오늘 것만 남기고 옛날 Queue 삭제"""

    print("=" * 60)
    print("옛날 Queue 정리 시작")
    print("=" * 60)

    # 오늘 날짜
    today = timezone.now().date()

    # 전체 Queue 개수
    total_queues = Queue.objects.all().count()
    print(f"\n📊 전체 Queue 개수: {total_queues}개")

    # 오늘 Queue 개수
    today_queues = Queue.objects.filter(created_at__date=today).count()
    print(f"📅 오늘 Queue 개수: {today_queues}개")

    # 삭제할 Queue 개수
    old_queues = Queue.objects.exclude(created_at__date=today)
    old_count = old_queues.count()
    print(f"🗑️  삭제할 Queue 개수: {old_count}개")

    if old_count > 0:
        print(f"\n⚠️  {old_count}개의 옛날 Queue를 삭제합니다...")
        old_queues.delete()
        print(f"✅ 삭제 완료!")
    else:
        print("\n✅ 삭제할 Queue가 없습니다.")

    # 최종 확인
    final_count = Queue.objects.all().count()
    print(f"\n📊 남은 Queue 개수: {final_count}개")
    print("=" * 60)

if __name__ == '__main__':
    try:
        cleanup_old_queues()
    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
