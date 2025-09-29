"""
Enhanced CSV export with time-series features for LSTM training
Includes rolling averages, cross-department correlations, and special event indicators
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Avg, Count, Q, Sum, StdDev
from p_queue.models import Queue, QueueStatusLog
from appointments.models import Exam
from datetime import datetime, timedelta
import csv
import os
import numpy as np
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Export enhanced queue data to CSV with time-series features for LSTM training'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='lstm_enhanced_training.csv',
            help='Output CSV filename'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days to export (default: 90)'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=5,
            help='Time interval in minutes (default: 5)'
        )

    def handle(self, *args, **options):
        output_file = options['output']
        days = options['days']
        interval = options['interval']

        self.stdout.write(f"\n📊 Enhanced CSV Export for LSTM Training")
        self.stdout.write(f"   - Period: Last {days} days")
        self.stdout.write(f"   - Interval: {interval} minutes")
        self.stdout.write(f"   - Output: {output_file}")

        # Get date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Fetch all queue data
        self.stdout.write("\n📥 Loading queue data...")
        queues = Queue.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).select_related('exam').order_by('created_at')

        self.stdout.write(f"   Found {queues.count():,} queue records")

        # Process into time-series data
        self.stdout.write("\n⚙️ Processing time-series features...")
        time_series_data = self.process_time_series(queues, interval)

        # Add advanced features
        self.stdout.write("\n🔧 Adding advanced features...")
        enhanced_data = self.add_advanced_features(time_series_data)

        # Export to CSV
        self.stdout.write("\n💾 Exporting to CSV...")
        self.export_to_csv(enhanced_data, output_file)

        self.stdout.write(self.style.SUCCESS(f"\n✅ Export complete: {output_file}"))
        self.print_export_summary(enhanced_data, output_file)

    def process_time_series(self, queues, interval):
        """Process queues into time-series format with specified interval"""
        time_series = {}
        departments = list(Exam.objects.values_list('department', flat=True).distinct())

        # Initialize time slots
        for queue in queues:
            # Round to interval
            time_slot = queue.created_at.replace(
                minute=(queue.created_at.minute // interval) * interval,
                second=0,
                microsecond=0
            )

            if time_slot not in time_series:
                time_series[time_slot] = {
                    'timestamp': time_slot,
                    'date': time_slot.date(),
                    'hour': time_slot.hour,
                    'minute': time_slot.minute,
                    'weekday': time_slot.weekday(),
                    'month': time_slot.month,
                    'day_of_month': time_slot.day,
                    'week_of_year': time_slot.isocalendar()[1],
                    'is_weekend': time_slot.weekday() >= 5,
                    'is_holiday': self.is_holiday(time_slot.date()),
                    'season': self.get_season(time_slot.date()),
                    'departments': {}
                }

                # Initialize department data
                for dept in departments:
                    time_series[time_slot]['departments'][dept] = {
                        'waiting_count': 0,
                        'called_count': 0,
                        'in_progress_count': 0,
                        'completed_count': 0,
                        'total_wait_time': 0,
                        'urgent_count': 0,
                        'normal_count': 0,
                        'queue_numbers': []
                    }

            # Update department statistics
            dept = queue.exam.department
            if dept in time_series[time_slot]['departments']:
                dept_data = time_series[time_slot]['departments'][dept]

                # Count by state
                if queue.state == 'waiting':
                    dept_data['waiting_count'] += 1
                    dept_data['total_wait_time'] += queue.estimated_wait_time
                elif queue.state == 'called':
                    dept_data['called_count'] += 1
                elif queue.state == 'in_progress':
                    dept_data['in_progress_count'] += 1
                elif queue.state == 'completed':
                    dept_data['completed_count'] += 1

                # Count by priority
                if queue.priority == 'urgent':
                    dept_data['urgent_count'] += 1
                else:
                    dept_data['normal_count'] += 1

                dept_data['queue_numbers'].append(queue.queue_number)

        return time_series

    def add_advanced_features(self, time_series):
        """Add advanced features for better LSTM training"""
        enhanced_data = []
        sorted_times = sorted(time_series.keys())

        # Convert to DataFrame for easier manipulation
        df_data = []
        for time_slot in sorted_times:
            row = {
                'timestamp': time_slot,
                'date': time_series[time_slot]['date'],
                'hour': time_series[time_slot]['hour'],
                'minute': time_series[time_slot]['minute'],
                'weekday': time_series[time_slot]['weekday'],
                'month': time_series[time_slot]['month'],
                'day_of_month': time_series[time_slot]['day_of_month'],
                'week_of_year': time_series[time_slot]['week_of_year'],
                'is_weekend': int(time_series[time_slot]['is_weekend']),
                'is_holiday': int(time_series[time_slot]['is_holiday']),
                'season_code': self.encode_season(time_series[time_slot]['season'])
            }

            # Flatten department data
            for dept, dept_data in time_series[time_slot]['departments'].items():
                prefix = f'{dept}_'
                row[f'{prefix}waiting'] = dept_data['waiting_count']
                row[f'{prefix}called'] = dept_data['called_count']
                row[f'{prefix}in_progress'] = dept_data['in_progress_count']
                row[f'{prefix}completed'] = dept_data['completed_count']
                row[f'{prefix}avg_wait'] = (
                    dept_data['total_wait_time'] / max(dept_data['waiting_count'], 1)
                )
                row[f'{prefix}urgent_ratio'] = (
                    dept_data['urgent_count'] / max(
                        dept_data['urgent_count'] + dept_data['normal_count'], 1
                    )
                )
                row[f'{prefix}congestion'] = min(dept_data['waiting_count'] / 20.0, 1.0)

            df_data.append(row)

        df = pd.DataFrame(df_data)

        # Add rolling features
        self.stdout.write("   Adding rolling averages...")
        window_sizes = [3, 6, 12, 24]  # 15min, 30min, 1hr, 2hr for 5-min intervals

        for dept in time_series[sorted_times[0]]['departments'].keys():
            for window in window_sizes:
                col_name = f'{dept}_waiting'
                if col_name in df.columns:
                    # Rolling mean
                    df[f'{col_name}_ma_{window}'] = df[col_name].rolling(
                        window=window, min_periods=1
                    ).mean()

                    # Rolling std
                    df[f'{col_name}_std_{window}'] = df[col_name].rolling(
                        window=window, min_periods=1
                    ).std().fillna(0)

                    # Rolling max/min
                    df[f'{col_name}_max_{window}'] = df[col_name].rolling(
                        window=window, min_periods=1
                    ).max()
                    df[f'{col_name}_min_{window}'] = df[col_name].rolling(
                        window=window, min_periods=1
                    ).min()

        # Add lag features (previous time slots)
        self.stdout.write("   Adding lag features...")
        lag_periods = [1, 6, 12, 24]  # 5min, 30min, 1hr, 2hr ago

        for dept in time_series[sorted_times[0]]['departments'].keys():
            for lag in lag_periods:
                col_name = f'{dept}_waiting'
                if col_name in df.columns:
                    df[f'{col_name}_lag_{lag}'] = df[col_name].shift(lag).fillna(0)

                col_name = f'{dept}_avg_wait'
                if col_name in df.columns:
                    df[f'{col_name}_lag_{lag}'] = df[col_name].shift(lag).fillna(0)

        # Add difference features (change from previous period)
        self.stdout.write("   Adding difference features...")
        for dept in time_series[sorted_times[0]]['departments'].keys():
            col_name = f'{dept}_waiting'
            if col_name in df.columns:
                df[f'{col_name}_diff'] = df[col_name].diff().fillna(0)
                df[f'{col_name}_pct_change'] = df[col_name].pct_change().fillna(0)

        # Add cross-department correlations
        self.stdout.write("   Adding cross-department features...")
        main_depts = ['내과', '정형외과', '응급의학과']
        imaging_depts = ['X-ray실', 'CT실', 'MRI실']

        for main_dept in main_depts:
            main_col = f'{main_dept}_waiting'
            if main_col in df.columns:
                for img_dept in imaging_depts:
                    img_col = f'{img_dept}_waiting'
                    if img_col in df.columns:
                        # Correlation feature (ratio)
                        df[f'{main_dept}_to_{img_dept}_ratio'] = (
                            df[main_col] / (df[img_col] + 1)
                        )

        # Add time-based cyclical features
        self.stdout.write("   Adding cyclical time features...")
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['weekday_sin'] = np.sin(2 * np.pi * df['weekday'] / 7)
        df['weekday_cos'] = np.cos(2 * np.pi * df['weekday'] / 7)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

        # Add peak hour indicators
        df['is_morning_peak'] = ((df['hour'] >= 9) & (df['hour'] <= 11)).astype(int)
        df['is_afternoon_peak'] = ((df['hour'] >= 14) & (df['hour'] <= 16)).astype(int)
        df['is_lunch_time'] = ((df['hour'] >= 12) & (df['hour'] <= 13)).astype(int)

        # Add special event indicators
        self.stdout.write("   Adding special event indicators...")
        df['days_to_weekend'] = df['weekday'].apply(
            lambda x: min(5 - x, 7 - x) if x < 5 else 0
        )

        # Add previous same-time statistics (same time yesterday/last week)
        self.stdout.write("   Adding historical same-time features...")
        periods_per_day = (24 * 60) // 5  # 5-minute intervals per day

        for dept in time_series[sorted_times[0]]['departments'].keys()[:3]:  # Top 3 depts only
            col_name = f'{dept}_waiting'
            if col_name in df.columns:
                # Same time yesterday
                df[f'{col_name}_yesterday'] = df[col_name].shift(periods_per_day).fillna(0)
                # Same time last week
                df[f'{col_name}_lastweek'] = df[col_name].shift(periods_per_day * 7).fillna(0)

        # Convert back to list of dictionaries
        enhanced_data = df.to_dict('records')

        return enhanced_data

    def is_holiday(self, date):
        """Check if date is a holiday"""
        holidays = [
            (1, 1),   # New Year
            (2, 10), (2, 11), (2, 12),  # Lunar New Year (approximate)
            (3, 1),   # March 1st Movement Day
            (5, 5),   # Children's Day
            (6, 6),   # Memorial Day
            (8, 15),  # Liberation Day
            (9, 28), (9, 29), (9, 30),  # Chuseok (approximate)
            (10, 3),  # National Foundation Day
            (10, 9),  # Hangul Day
            (12, 25)  # Christmas
        ]

        for month, day in holidays:
            if date.month == month and date.day == day:
                return True
        return False

    def get_season(self, date):
        """Get season for date"""
        month = date.month
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'fall'

    def encode_season(self, season):
        """Encode season as numeric"""
        seasons = {'winter': 0, 'spring': 1, 'summer': 2, 'fall': 3}
        return seasons.get(season, 0)

    def export_to_csv(self, data, output_file):
        """Export enhanced data to CSV"""
        if not data:
            self.stdout.write(self.style.WARNING("   No data to export"))
            return

        # Create output directory
        os.makedirs('data', exist_ok=True)
        output_path = os.path.join('data', output_file)

        # Get all field names
        fieldnames = set()
        for row in data:
            fieldnames.update(row.keys())
        fieldnames = sorted(list(fieldnames))

        # Write CSV
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for row in data:
                # Clean NaN and inf values
                cleaned_row = {}
                for key, value in row.items():
                    if isinstance(value, float):
                        if np.isnan(value) or np.isinf(value):
                            cleaned_row[key] = 0
                        else:
                            cleaned_row[key] = round(value, 4)
                    else:
                        cleaned_row[key] = value
                writer.writerow(cleaned_row)

        self.stdout.write(f"   Exported {len(data)} rows to {output_path}")

    def print_export_summary(self, data, output_file):
        """Print export summary"""
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('📊 Enhanced Export Summary')
        self.stdout.write('=' * 60)

        output_path = os.path.join('data', output_file)

        if data:
            # Basic statistics
            self.stdout.write(f'Total Records: {len(data):,}')
            self.stdout.write(f'Total Features: {len(data[0].keys())}')
            self.stdout.write(f'File Size: {os.path.getsize(output_path) / 1024:.1f} KB')

            # Feature categories
            feature_categories = {
                'Time Features': 0,
                'Department Features': 0,
                'Rolling Features': 0,
                'Lag Features': 0,
                'Difference Features': 0,
                'Cross-Department': 0,
                'Cyclical Features': 0,
                'Special Events': 0
            }

            for key in data[0].keys():
                if any(x in key for x in ['hour', 'minute', 'weekday', 'month', 'date', 'time']):
                    feature_categories['Time Features'] += 1
                elif any(x in key for x in ['waiting', 'called', 'progress', 'completed']):
                    if 'ma_' in key or 'std_' in key or 'max_' in key or 'min_' in key:
                        feature_categories['Rolling Features'] += 1
                    elif 'lag_' in key:
                        feature_categories['Lag Features'] += 1
                    elif 'diff' in key or 'pct_change' in key:
                        feature_categories['Difference Features'] += 1
                    else:
                        feature_categories['Department Features'] += 1
                elif 'ratio' in key:
                    feature_categories['Cross-Department'] += 1
                elif any(x in key for x in ['sin', 'cos']):
                    feature_categories['Cyclical Features'] += 1
                elif any(x in key for x in ['holiday', 'weekend', 'peak', 'special']):
                    feature_categories['Special Events'] += 1

            self.stdout.write('\n📈 Feature Distribution:')
            for category, count in feature_categories.items():
                if count > 0:
                    self.stdout.write(f'   {category}: {count}')

            # Date range
            timestamps = [row['timestamp'] for row in data if 'timestamp' in row]
            if timestamps:
                min_date = min(timestamps)
                max_date = max(timestamps)
                self.stdout.write(f'\n📅 Date Range:')
                self.stdout.write(f'   From: {min_date}')
                self.stdout.write(f'   To: {max_date}')
                self.stdout.write(f'   Duration: {(max_date - min_date).days} days')

        self.stdout.write('=' * 60)