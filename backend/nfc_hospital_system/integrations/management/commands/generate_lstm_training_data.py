"""
Django management command to extract Queue data into CSV format for LSTM training.
Converts Queue model data with realistic wait times into time-series format.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Avg, Count, Q, F
from p_queue.models import Queue, QueueStatusLog
from appointments.models import Exam, Appointment
from datetime import datetime, timedelta
import csv
import os
import pandas as pd


class Command(BaseCommand):
    help = 'Extract Queue data into CSV format for LSTM model training'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days of data to extract (default: 90)'
        )
        parser.add_argument(
            '--output',
            type=str,
            default='lstm_training_data.csv',
            help='Output CSV filename (default: lstm_training_data.csv)'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=5,
            help='Time interval in minutes for aggregation (default: 5)'
        )

    def handle(self, *args, **options):
        days = options['days']
        output_file = options['output']
        interval = options['interval']

        self.stdout.write(f"\n🔄 Queue 데이터를 CSV로 추출 중...")
        self.stdout.write(f"   기간: 최근 {days}일")
        self.stdout.write(f"   간격: {interval}분")
        self.stdout.write(f"   출력: {output_file}\n")

        # 시작 및 종료 시간 설정
        end_time = timezone.now()
        start_time = end_time - timedelta(days=days)

        # 모든 부서 가져오기
        departments = list(Exam.objects.values_list('department', flat=True).distinct())

        if not departments:
            self.stdout.write(self.style.ERROR("❌ Exam 데이터가 없습니다. generate_emr_data를 먼저 실행하세요."))
            return

        self.stdout.write(f"📊 발견된 부서: {', '.join(departments)}")

        # CSV 데이터 준비
        csv_data = []

        # 시간대별로 데이터 집계
        current_time = start_time
        total_intervals = int((end_time - start_time).total_seconds() / (interval * 60))
        processed = 0

        while current_time < end_time:
            interval_end = current_time + timedelta(minutes=interval)

            for dept in departments:
                try:
                    # 해당 시간대의 대기 인원 수
                    waiting_count = Queue.objects.filter(
                        exam__department=dept,
                        state__in=['waiting', 'called'],
                        created_at__lte=interval_end,
                        updated_at__gte=current_time
                    ).count()

                    # 평균 대기 시간 (estimated_wait_time 사용)
                    avg_wait = Queue.objects.filter(
                        exam__department=dept,
                        created_at__lte=interval_end,
                        updated_at__gte=current_time
                    ).aggregate(avg=Avg('estimated_wait_time'))['avg'] or 0

                    # 완료된 환자 수 (처리량)
                    completed = Queue.objects.filter(
                        exam__department=dept,
                        state='completed',
                        updated_at__gte=current_time,
                        updated_at__lt=interval_end
                    ).count()

                    # 새로 들어온 환자 수
                    new_patients = Queue.objects.filter(
                        exam__department=dept,
                        created_at__gte=current_time,
                        created_at__lt=interval_end
                    ).count()

                    # 호출된 환자 수
                    called = Queue.objects.filter(
                        exam__department=dept,
                        state='called',
                        called_at__gte=current_time,
                        called_at__lt=interval_end
                    ).count()

                    # 특별 우선순위 환자 비율
                    priority_ratio = Queue.objects.filter(
                        exam__department=dept,
                        priority__in=['urgent', 'emergency'],
                        created_at__lte=interval_end,
                        updated_at__gte=current_time
                    ).count() / max(waiting_count, 1)
                except Exception as e:
                    # DB 연결 오류 시 기본값 사용
                    self.stdout.write(f"   ⚠️ {dept} 데이터 처리 오류: {e}")
                    waiting_count = 0
                    avg_wait = 0
                    completed = 0
                    new_patients = 0
                    called = 0
                    priority_ratio = 0

                # CSV 행 추가
                csv_data.append({
                    'timestamp': current_time.isoformat(),
                    'date': current_time.date(),
                    'hour': current_time.hour,
                    'minute': current_time.minute,
                    'weekday': current_time.weekday(),  # 0=월, 6=일
                    'department': dept,
                    'waiting_count': waiting_count,
                    'avg_wait_time': round(avg_wait, 1),  # 실제 대기시간!
                    'completed_count': completed,
                    'new_patients': new_patients,
                    'called_count': called,
                    'priority_ratio': round(priority_ratio, 3),
                    'congestion_level': min(waiting_count / 20.0, 1.0),  # 0~1 정규화
                })

            current_time = interval_end
            processed += 1

            # 진행 상황 표시
            if processed % 100 == 0:
                progress = (processed / total_intervals) * 100
                self.stdout.write(f"   진행: {progress:.1f}% ({processed}/{total_intervals})")

        # CSV 파일로 저장
        if csv_data:
            # DataFrame으로 변환
            df = pd.DataFrame(csv_data)

            # 통계 요약
            self.stdout.write(f"\n📊 데이터 요약:")
            self.stdout.write(f"   총 레코드: {len(df):,}")
            self.stdout.write(f"   부서 수: {df['department'].nunique()}")
            self.stdout.write(f"   시간 범위: {df['timestamp'].min()} ~ {df['timestamp'].max()}")
            self.stdout.write(f"\n   평균 대기시간 통계:")

            dept_stats = df.groupby('department')['avg_wait_time'].agg(['mean', 'min', 'max'])
            for dept, row in dept_stats.iterrows():
                self.stdout.write(
                    f"     {dept}: 평균 {row['mean']:.1f}분 "
                    f"(최소 {row['min']:.1f}분, 최대 {row['max']:.1f}분)"
                )

            # 0이 아닌 대기시간 비율 확인
            non_zero_ratio = (df['avg_wait_time'] > 0).mean() * 100
            self.stdout.write(f"\n   ✅ 유효한 대기시간 비율: {non_zero_ratio:.1f}%")

            # CSV 저장
            output_path = os.path.join('data', output_file)
            os.makedirs('data', exist_ok=True)
            df.to_csv(output_path, index=False, encoding='utf-8-sig')

            self.stdout.write(
                self.style.SUCCESS(f"\n✅ CSV 파일 생성 완료: {output_path}")
            )
            self.stdout.write(f"   파일 크기: {os.path.getsize(output_path) / 1024:.1f} KB")

            # 샘플 데이터 출력
            self.stdout.write(f"\n📋 샘플 데이터 (처음 5행):")
            sample_df = df.head()
            for _, row in sample_df.iterrows():
                self.stdout.write(
                    f"   {row['timestamp'][:16]} | {row['department']:6} | "
                    f"대기: {row['waiting_count']:2}명 | "
                    f"평균: {row['avg_wait_time']:5.1f}분"
                )

        else:
            self.stdout.write(
                self.style.ERROR("❌ 추출할 Queue 데이터가 없습니다.")
            )
            self.stdout.write("   generate_emr_data 명령을 먼저 실행하세요:")
            self.stdout.write("   python manage.py generate_emr_data --days 90")