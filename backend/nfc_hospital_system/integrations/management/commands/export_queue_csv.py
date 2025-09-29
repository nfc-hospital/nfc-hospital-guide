"""
Simple command to export Queue data directly to CSV
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from p_queue.models import Queue
from appointments.models import Exam
from datetime import datetime, timedelta
import csv
import os


class Command(BaseCommand):
    help = 'Export Queue data directly to CSV for LSTM training'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='lstm_training_data.csv',
            help='Output CSV filename'
        )

    def handle(self, *args, **options):
        output_file = options['output']

        self.stdout.write(f"\n📦 Queue 데이터를 CSV로 직접 추출 중...")

        # 모든 Queue 데이터 가져오기 (최근 30일)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)

        queues = Queue.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).select_related('exam').order_by('created_at')

        self.stdout.write(f"   총 {queues.count()}개 Queue 데이터 발견")

        # CSV 파일 생성
        output_path = os.path.join('data', output_file)
        os.makedirs('data', exist_ok=True)

        with open(output_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
            fieldnames = [
                'timestamp', 'date', 'hour', 'minute', 'weekday',
                'department', 'waiting_count', 'avg_wait_time',
                'state', 'queue_number', 'priority', 'congestion_level'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            # 부서별로 시간대별 집계
            time_slots = {}

            for queue in queues:
                # 5분 단위로 시간 슬롯 생성
                time_slot = queue.created_at.replace(
                    minute=(queue.created_at.minute // 5) * 5,
                    second=0,
                    microsecond=0
                )

                dept = queue.exam.department
                key = (time_slot, dept)

                if key not in time_slots:
                    time_slots[key] = {
                        'waiting_count': 0,
                        'total_wait_time': 0,
                        'completed': 0,
                        'called': 0
                    }

                # 상태별 카운트
                if queue.state in ['waiting', 'called']:
                    time_slots[key]['waiting_count'] += 1
                    time_slots[key]['total_wait_time'] += queue.estimated_wait_time
                elif queue.state == 'completed':
                    time_slots[key]['completed'] += 1
                elif queue.state == 'called':
                    time_slots[key]['called'] += 1

            # CSV 작성
            row_count = 0
            for (time_slot, dept), data in sorted(time_slots.items()):
                avg_wait = data['total_wait_time'] / max(data['waiting_count'], 1)

                writer.writerow({
                    'timestamp': time_slot.isoformat(),
                    'date': time_slot.date(),
                    'hour': time_slot.hour,
                    'minute': time_slot.minute,
                    'weekday': time_slot.weekday(),
                    'department': dept,
                    'waiting_count': data['waiting_count'],
                    'avg_wait_time': round(avg_wait, 1),
                    'state': 'mixed',  # 집계 데이터
                    'queue_number': 0,  # 집계 데이터
                    'priority': 'normal',
                    'congestion_level': min(data['waiting_count'] / 20.0, 1.0)
                })
                row_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"\n✅ CSV 파일 생성 완료: {output_path}")
        )
        self.stdout.write(f"   총 {row_count}개 레코드 저장")
        self.stdout.write(f"   파일 크기: {os.path.getsize(output_path) / 1024:.1f} KB")