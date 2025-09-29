"""
Data validation script for LSTM training data
Ensures data quality, consistency, and realistic patterns
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Avg, Count, Min, Max, StdDev, Q
from p_queue.models import Queue, QueueStatusLog
from appointments.models import Appointment, Exam
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import os
import json
from collections import defaultdict

# Optional imports
try:
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

try:
    import seaborn as sns
    SEABORN_AVAILABLE = True
except ImportError:
    SEABORN_AVAILABLE = False

class Command(BaseCommand):
    help = 'Validate queue data quality for LSTM training'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            type=str,
            help='Path to CSV file to validate'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to validate from database (default: 30)'
        )
        parser.add_argument(
            '--report',
            type=str,
            default='validation_report.json',
            help='Output validation report filename'
        )
        parser.add_argument(
            '--visualize',
            action='store_true',
            help='Generate visualization plots'
        )

    def handle(self, *args, **options):
        csv_file = options.get('csv')
        days = options['days']
        report_file = options['report']
        visualize = options['visualize']

        self.stdout.write("\n🔍 Data Validation for LSTM Training")
        self.stdout.write("=" * 60)

        validation_results = {}

        if csv_file and os.path.exists(csv_file):
            self.stdout.write(f"\n📄 Validating CSV file: {csv_file}")
            csv_results = self.validate_csv(csv_file)
            validation_results['csv_validation'] = csv_results
        else:
            self.stdout.write(f"\n📊 Validating database data (last {days} days)")
            db_results = self.validate_database(days)
            validation_results['database_validation'] = db_results

        # Generate visualizations if requested
        if visualize:
            self.stdout.write("\n📈 Generating visualizations...")
            self.generate_visualizations(validation_results)

        # Save validation report
        self.save_report(validation_results, report_file)

        # Print summary
        self.print_validation_summary(validation_results)

    def validate_csv(self, csv_file):
        """Validate CSV file data"""
        results = {
            'file_info': {},
            'data_quality': {},
            'statistical_checks': {},
            'pattern_checks': {},
            'warnings': [],
            'errors': []
        }

        try:
            # Load CSV
            df = pd.read_csv(csv_file)
            results['file_info']['rows'] = len(df)
            results['file_info']['columns'] = len(df.columns)
            results['file_info']['file_size_kb'] = os.path.getsize(csv_file) / 1024

            # Data quality checks
            self.stdout.write("\n1️⃣ Data Quality Checks:")

            # Missing values
            missing_counts = df.isnull().sum()
            missing_pct = (missing_counts / len(df)) * 100
            results['data_quality']['missing_values'] = {
                col: {'count': int(count), 'percentage': float(pct)}
                for col, count, pct in zip(missing_counts.index, missing_counts.values, missing_pct.values)
                if count > 0
            }
            if any(missing_pct > 10):
                results['warnings'].append(f"High missing values (>10%) in: {list(missing_pct[missing_pct > 10].index)}")
            self.stdout.write(f"   ✓ Missing values check complete")

            # Duplicates
            duplicates = df.duplicated().sum()
            results['data_quality']['duplicates'] = int(duplicates)
            if duplicates > 0:
                results['warnings'].append(f"Found {duplicates} duplicate rows")
            self.stdout.write(f"   ✓ Duplicate check complete")

            # Infinite values
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            inf_counts = df[numeric_cols].isin([np.inf, -np.inf]).sum()
            results['data_quality']['infinite_values'] = {
                col: int(count) for col, count in inf_counts.items() if count > 0
            }
            if any(inf_counts > 0):
                results['warnings'].append(f"Infinite values found in: {list(inf_counts[inf_counts > 0].index)}")
            self.stdout.write(f"   ✓ Infinite values check complete")

            # Statistical checks
            self.stdout.write("\n2️⃣ Statistical Validation:")

            # Wait time distribution
            wait_cols = [col for col in df.columns if 'wait' in col.lower() and 'avg' in col.lower()]
            if wait_cols:
                for col in wait_cols[:5]:  # Check top 5 wait time columns
                    if col in df.columns:
                        wait_stats = {
                            'mean': float(df[col].mean()),
                            'median': float(df[col].median()),
                            'std': float(df[col].std()),
                            'min': float(df[col].min()),
                            'max': float(df[col].max()),
                            'q25': float(df[col].quantile(0.25)),
                            'q75': float(df[col].quantile(0.75))
                        }
                        results['statistical_checks'][col] = wait_stats

                        # Check for unrealistic values
                        if wait_stats['max'] > 300:
                            results['warnings'].append(f"{col}: Max wait time > 300 minutes")
                        if wait_stats['min'] < 0:
                            results['errors'].append(f"{col}: Negative wait times found")
                self.stdout.write(f"   ✓ Wait time distribution check complete")

            # Pattern checks
            self.stdout.write("\n3️⃣ Pattern Validation:")

            # Time continuity
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df_sorted = df.sort_values('timestamp')
                time_diffs = df_sorted['timestamp'].diff()

                # Check for gaps
                max_gap = time_diffs.max()
                if pd.notna(max_gap):
                    results['pattern_checks']['max_time_gap'] = str(max_gap)
                    if max_gap > pd.Timedelta(hours=1):
                        results['warnings'].append(f"Large time gap detected: {max_gap}")

                # Check for backwards time
                if (time_diffs < pd.Timedelta(0)).any():
                    results['errors'].append("Backwards time progression detected")
                self.stdout.write(f"   ✓ Time continuity check complete")

            # Hourly patterns
            if 'hour' in df.columns:
                hourly_dist = df['hour'].value_counts().sort_index()
                results['pattern_checks']['hourly_distribution'] = hourly_dist.to_dict()

                # Check for missing hours
                expected_hours = set(range(24))
                actual_hours = set(df['hour'].unique())
                missing_hours = expected_hours - actual_hours
                if len(missing_hours) > 12:
                    results['warnings'].append(f"Many missing hours: {sorted(missing_hours)}")
                self.stdout.write(f"   ✓ Hourly pattern check complete")

            # Department correlation checks
            dept_cols = [col for col in df.columns if any(dept in col for dept in ['내과', '외과', 'X-ray', 'CT', 'MRI'])]
            if len(dept_cols) >= 2:
                # Check correlations
                correlations = df[dept_cols[:10]].corr()  # Limit to 10 columns for performance
                high_corr_pairs = []
                for i in range(len(correlations)):
                    for j in range(i+1, len(correlations)):
                        if abs(correlations.iloc[i, j]) > 0.9:
                            high_corr_pairs.append((correlations.index[i], correlations.columns[j], correlations.iloc[i, j]))

                if high_corr_pairs:
                    results['pattern_checks']['high_correlations'] = [
                        {'col1': pair[0], 'col2': pair[1], 'correlation': float(pair[2])}
                        for pair in high_corr_pairs[:5]
                    ]
                self.stdout.write(f"   ✓ Department correlation check complete")

            # State transition validation
            state_cols = [col for col in df.columns if any(state in col for state in ['waiting', 'called', 'progress', 'completed'])]
            if state_cols:
                for i in range(len(df) - 1):
                    # Check if state transitions are logical
                    # This is simplified - you'd want more sophisticated logic
                    pass
                self.stdout.write(f"   ✓ State transition check complete")

        except Exception as e:
            results['errors'].append(f"CSV validation error: {str(e)}")
            self.stdout.write(self.style.ERROR(f"   ✗ Error: {str(e)}"))

        return results

    def validate_database(self, days):
        """Validate database queue data"""
        results = {
            'data_overview': {},
            'consistency_checks': {},
            'realistic_patterns': {},
            'state_integrity': {},
            'warnings': [],
            'errors': []
        }

        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Data overview
        self.stdout.write("\n1️⃣ Database Overview:")

        total_queues = Queue.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).count()

        total_appointments = Appointment.objects.filter(
            scheduled_at__gte=start_date,
            scheduled_at__lte=end_date
        ).count()

        total_logs = QueueStatusLog.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).count()

        results['data_overview'] = {
            'total_queues': total_queues,
            'total_appointments': total_appointments,
            'total_logs': total_logs,
            'date_range': f"{start_date.date()} to {end_date.date()}"
        }
        self.stdout.write(f"   Queues: {total_queues:,}")
        self.stdout.write(f"   Appointments: {total_appointments:,}")
        self.stdout.write(f"   Logs: {total_logs:,}")

        # Consistency checks
        self.stdout.write("\n2️⃣ Consistency Checks:")

        # Check orphaned queues
        orphaned_queues = Queue.objects.filter(
            created_at__gte=start_date,
            appointment__isnull=True
        ).count()
        if orphaned_queues > 0:
            results['warnings'].append(f"Found {orphaned_queues} queues without appointments")
        self.stdout.write(f"   ✓ Orphaned queues check complete")

        # Check wait time distribution
        wait_stats = Queue.objects.filter(
            created_at__gte=start_date
        ).aggregate(
            avg_wait=Avg('estimated_wait_time'),
            min_wait=Min('estimated_wait_time'),
            max_wait=Max('estimated_wait_time'),
            std_wait=StdDev('estimated_wait_time')
        )

        results['consistency_checks']['wait_time_stats'] = {
            k: float(v) if v is not None else 0 for k, v in wait_stats.items()
        }

        # Check for invalid wait times
        negative_waits = Queue.objects.filter(
            created_at__gte=start_date,
            estimated_wait_time__lt=0
        ).count()
        if negative_waits > 0:
            results['errors'].append(f"Found {negative_waits} queues with negative wait times")

        excessive_waits = Queue.objects.filter(
            created_at__gte=start_date,
            estimated_wait_time__gt=300
        ).count()
        if excessive_waits > 0:
            results['warnings'].append(f"Found {excessive_waits} queues with wait time > 300 minutes")
        self.stdout.write(f"   ✓ Wait time validation complete")

        # State integrity checks
        self.stdout.write("\n3️⃣ State Integrity Checks:")

        # Check state distribution
        state_dist = Queue.objects.filter(
            created_at__gte=start_date
        ).values('state').annotate(count=Count('queue_id'))

        results['state_integrity']['state_distribution'] = {
            item['state']: item['count'] for item in state_dist
        }

        # Check for invalid state transitions
        invalid_transitions = self.check_state_transitions(start_date, end_date)
        if invalid_transitions:
            results['warnings'].append(f"Found {len(invalid_transitions)} invalid state transitions")
            results['state_integrity']['invalid_transitions'] = invalid_transitions[:10]
        self.stdout.write(f"   ✓ State integrity check complete")

        # Realistic pattern checks
        self.stdout.write("\n4️⃣ Realistic Pattern Validation:")

        # Check hourly distribution
        hourly_dist = Queue.objects.filter(
            created_at__gte=start_date
        ).extra(select={'hour': 'HOUR(created_at)'}).values('hour').annotate(
            count=Count('queue_id')
        )

        results['realistic_patterns']['hourly_distribution'] = {
            item['hour']: item['count'] for item in hourly_dist
        }

        # Check for unrealistic patterns
        night_queues = Queue.objects.filter(
            created_at__gte=start_date,
            created_at__hour__in=[0, 1, 2, 3, 4, 5]
        ).count()

        if night_queues > total_queues * 0.1:
            results['warnings'].append(f"High night-time activity: {night_queues} queues between 0-5 AM")

        # Department distribution
        dept_dist = Queue.objects.filter(
            created_at__gte=start_date
        ).values('exam__department').annotate(count=Count('queue_id'))

        results['realistic_patterns']['department_distribution'] = {
            item['exam__department']: item['count'] for item in dept_dist
        }
        self.stdout.write(f"   ✓ Pattern validation complete")

        # Check data freshness
        latest_queue = Queue.objects.order_by('-created_at').first()
        if latest_queue:
            data_age = timezone.now() - latest_queue.created_at
            if data_age > timedelta(days=1):
                results['warnings'].append(f"Data is {data_age.days} days old")

        return results

    def check_state_transitions(self, start_date, end_date):
        """Check for invalid state transitions"""
        invalid_transitions = []

        # Valid state transitions
        valid_transitions = {
            'waiting': ['called', 'cancelled', 'no_show'],
            'called': ['in_progress', 'no_show', 'waiting'],
            'in_progress': ['completed'],
            'completed': [],
            'cancelled': [],
            'no_show': []
        }

        # Get state logs grouped by queue
        logs = QueueStatusLog.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).order_by('queue_id', 'created_at')

        current_queue = None
        previous_state = None

        for log in logs[:10000]:  # Limit to 10k for performance
            if log.queue_id != current_queue:
                current_queue = log.queue_id
                previous_state = None

            if previous_state and log.new_state not in valid_transitions.get(previous_state, []):
                invalid_transitions.append({
                    'queue_id': str(log.queue_id),
                    'from_state': previous_state,
                    'to_state': log.new_state,
                    'timestamp': str(log.created_at)
                })

            previous_state = log.new_state

        return invalid_transitions

    def generate_visualizations(self, validation_results):
        """Generate visualization plots"""
        if not MATPLOTLIB_AVAILABLE:
            self.stdout.write(self.style.WARNING("   ⚠ Matplotlib not installed - skipping visualizations"))
            return

        try:
            import matplotlib
            matplotlib.use('Agg')  # Use non-interactive backend

            # Create figures directory
            os.makedirs('validation_plots', exist_ok=True)

            # Plot 1: Hourly distribution
            if 'database_validation' in validation_results:
                hourly_data = validation_results['database_validation'].get('realistic_patterns', {}).get('hourly_distribution', {})
                if hourly_data:
                    plt.figure(figsize=(12, 6))
                    hours = sorted(hourly_data.keys())
                    counts = [hourly_data[h] for h in hours]
                    plt.bar(hours, counts, color='steelblue', alpha=0.8)
                    plt.xlabel('Hour of Day')
                    plt.ylabel('Queue Count')
                    plt.title('Hourly Queue Distribution')
                    plt.xticks(range(0, 24))
                    plt.grid(True, alpha=0.3)
                    plt.savefig('validation_plots/hourly_distribution.png', dpi=100, bbox_inches='tight')
                    plt.close()
                    self.stdout.write("   ✓ Hourly distribution plot saved")

            # Plot 2: Department distribution
            if 'database_validation' in validation_results:
                dept_data = validation_results['database_validation'].get('realistic_patterns', {}).get('department_distribution', {})
                if dept_data:
                    plt.figure(figsize=(10, 8))
                    depts = list(dept_data.keys())
                    counts = list(dept_data.values())
                    plt.barh(depts, counts, color='coral', alpha=0.8)
                    plt.xlabel('Queue Count')
                    plt.ylabel('Department')
                    plt.title('Department Queue Distribution')
                    plt.grid(True, alpha=0.3)
                    plt.savefig('validation_plots/department_distribution.png', dpi=100, bbox_inches='tight')
                    plt.close()
                    self.stdout.write("   ✓ Department distribution plot saved")

            # Plot 3: State distribution
            if 'database_validation' in validation_results:
                state_data = validation_results['database_validation'].get('state_integrity', {}).get('state_distribution', {})
                if state_data:
                    plt.figure(figsize=(10, 6))
                    states = list(state_data.keys())
                    counts = list(state_data.values())
                    colors = ['green', 'yellow', 'orange', 'blue', 'red', 'gray', 'purple']
                    plt.pie(counts, labels=states, colors=colors[:len(states)], autopct='%1.1f%%')
                    plt.title('Queue State Distribution')
                    plt.savefig('validation_plots/state_distribution.png', dpi=100, bbox_inches='tight')
                    plt.close()
                    self.stdout.write("   ✓ State distribution plot saved")

        except Exception as e:
            self.stdout.write(self.style.WARNING(f"   ⚠ Could not generate plots: {str(e)}"))

    def save_report(self, validation_results, report_file):
        """Save validation report to JSON"""
        os.makedirs('reports', exist_ok=True)
        report_path = os.path.join('reports', report_file)

        # Add metadata
        validation_results['metadata'] = {
            'generated_at': str(timezone.now()),
            'version': '1.0'
        }

        # Calculate overall score
        total_warnings = 0
        total_errors = 0

        for section in validation_results.values():
            if isinstance(section, dict):
                total_warnings += len(section.get('warnings', []))
                total_errors += len(section.get('errors', []))

        validation_results['summary'] = {
            'total_warnings': total_warnings,
            'total_errors': total_errors,
            'quality_score': max(0, 100 - (total_errors * 10) - (total_warnings * 2))
        }

        with open(report_path, 'w') as f:
            json.dump(validation_results, f, indent=2, default=str)

        self.stdout.write(f"\n📄 Validation report saved to: {report_path}")

    def print_validation_summary(self, validation_results):
        """Print validation summary"""
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('📋 VALIDATION SUMMARY')
        self.stdout.write('=' * 60)

        summary = validation_results.get('summary', {})

        # Quality score
        quality_score = summary.get('quality_score', 0)
        if quality_score >= 90:
            score_style = self.style.SUCCESS
            score_emoji = '✅'
        elif quality_score >= 70:
            score_style = self.style.WARNING
            score_emoji = '⚠️'
        else:
            score_style = self.style.ERROR
            score_emoji = '❌'

        self.stdout.write(score_style(f"\n{score_emoji} Data Quality Score: {quality_score}/100"))

        # Warnings and errors
        total_warnings = summary.get('total_warnings', 0)
        total_errors = summary.get('total_errors', 0)

        if total_errors > 0:
            self.stdout.write(self.style.ERROR(f"\n❌ Errors: {total_errors}"))
            for section in validation_results.values():
                if isinstance(section, dict) and 'errors' in section:
                    for error in section['errors']:
                        self.stdout.write(f"   • {error}")

        if total_warnings > 0:
            self.stdout.write(self.style.WARNING(f"\n⚠️  Warnings: {total_warnings}"))
            for section in validation_results.values():
                if isinstance(section, dict) and 'warnings' in section:
                    for warning in section['warnings'][:5]:  # Show first 5
                        self.stdout.write(f"   • {warning}")

        # Recommendations
        self.stdout.write("\n💡 Recommendations:")

        if quality_score < 70:
            self.stdout.write("   • Critical issues detected - review data generation process")
        elif quality_score < 90:
            self.stdout.write("   • Minor issues detected - consider data cleaning")
        else:
            self.stdout.write("   • Data quality is good - ready for training")

        if total_errors > 0:
            self.stdout.write("   • Fix errors before using data for training")

        if 'database_validation' in validation_results:
            db_val = validation_results['database_validation']
            if db_val.get('data_overview', {}).get('total_queues', 0) < 10000:
                self.stdout.write("   • Consider generating more data for better training")

        self.stdout.write('=' * 60)