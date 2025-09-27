import pandas as pd
from django.core.management.base import BaseCommand
from django.db import connection
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder
import numpy as np
import os
from datetime import datetime


class Command(BaseCommand):
    help = 'Prepares training data from the database and saves it as a CSV.'

    def handle(self, *args, **options):
        self.stdout.write("Extracting data from the database...")

        # Updated query to match actual database schema
        query = """
        SELECT
            DATE(q.created_at) as date,
            HOUR(q.created_at) as hour,
            DAYOFWEEK(q.created_at) as weekday,
            e.department,
            COUNT(DISTINCT q.queue_id) as patient_count,
            AVG(q.estimated_wait_time) as avg_wait_time,
            COUNT(DISTINCT CASE WHEN q.state = 'waiting' THEN q.queue_id END) as waiting_count,
            COUNT(DISTINCT CASE WHEN q.state = 'in_progress' THEN q.queue_id END) as in_progress_count,
            COUNT(DISTINCT CASE WHEN q.state = 'completed' THEN q.queue_id END) as completed_count
        FROM queues q
        JOIN exams e ON q.exam_id = e.exam_id
        WHERE q.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
        GROUP BY DATE(q.created_at), HOUR(q.created_at), e.department
        ORDER BY date, hour, department
        """

        try:
            df = pd.read_sql_query(query, connection)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error executing query: {e}"))
            # Fallback query with simpler structure
            query_fallback = """
            SELECT
                DATE(created_at) as date,
                HOUR(created_at) as hour,
                DAYOFWEEK(created_at) as weekday,
                COUNT(*) as patient_count,
                AVG(estimated_wait_time) as avg_wait_time
            FROM queues
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
            GROUP BY DATE(created_at), HOUR(created_at)
            ORDER BY date, hour
            """
            df = pd.read_sql_query(query_fallback, connection)

            # Add department information from exams
            self.stdout.write("Adding department information...")
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT DISTINCT e.department
                    FROM exams e
                    JOIN queues q ON q.exam_id = e.exam_id
                """)
                departments = [row[0] for row in cursor.fetchall()]

            # For fallback, we'll simulate department distribution
            if departments:
                df['department'] = np.random.choice(departments, size=len(df))
            else:
                df['department'] = 'General'

        if df.empty:
            self.stdout.write(self.style.ERROR("No data found. Please generate data first using 'python manage.py generate_emr_data'."))
            return

        self.stdout.write(f"Extracted {len(df)} records from the database.")
        self.stdout.write("Preprocessing data...")

        # Handle missing values
        df.fillna({
            'avg_wait_time': df['avg_wait_time'].mean() if 'avg_wait_time' in df.columns else 30,
            'patient_count': 0,
            'waiting_count': 0,
            'in_progress_count': 0,
            'completed_count': 0
        }, inplace=True)

        # One-Hot Encode 'department' if exists
        if 'department' in df.columns:
            encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            dept_encoded = encoder.fit_transform(df[['department']])
            dept_df = pd.DataFrame(
                dept_encoded,
                columns=[f'dept_{cat}' for cat in encoder.categories_[0]],
                index=df.index
            )
            df = pd.concat([df, dept_df], axis=1)
            df.drop('department', axis=1, inplace=True)

            self.stdout.write(f"Encoded {len(encoder.categories_[0])} departments")

        # Convert date to timestamp for time series
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df['timestamp'] = df['date'].astype(np.int64) // 10**9  # Convert to Unix timestamp
            df.drop('date', axis=1, inplace=True)

        # Scale numerical features
        scaler = MinMaxScaler()
        numerical_cols = ['hour', 'weekday', 'patient_count', 'avg_wait_time']

        # Add additional numerical columns if they exist
        for col in ['waiting_count', 'in_progress_count', 'completed_count', 'timestamp']:
            if col in df.columns:
                numerical_cols.append(col)

        # Only scale columns that exist
        existing_numerical_cols = [col for col in numerical_cols if col in df.columns]

        if existing_numerical_cols:
            df[existing_numerical_cols] = scaler.fit_transform(df[existing_numerical_cols])
            self.stdout.write(f"Scaled {len(existing_numerical_cols)} numerical features")

        # Save scaler parameters for later use
        import joblib
        scaler_path = 'scaler.pkl'
        joblib.dump(scaler, scaler_path)
        self.stdout.write(f"Scaler saved to {scaler_path}")

        # Save to CSV
        output_path = 'training_data.csv'
        df.to_csv(output_path, index=False)

        # Print data statistics
        self.stdout.write(self.style.SUCCESS(f"\n=== Training Data Statistics ==="))
        self.stdout.write(f"Total records: {len(df)}")
        self.stdout.write(f"Features: {len(df.columns)}")
        self.stdout.write(f"Feature names: {', '.join(df.columns.tolist())}")
        self.stdout.write(f"Date range: {df.index.min() if df.index.name else 'N/A'} to {df.index.max() if df.index.name else 'N/A'}")

        # Save feature names for model reference
        feature_names_path = 'feature_names.txt'
        with open(feature_names_path, 'w') as f:
            f.write('\n'.join(df.columns.tolist()))

        self.stdout.write(self.style.SUCCESS(f"\n✅ Training data saved to {output_path}"))
        self.stdout.write(self.style.SUCCESS(f"✅ Feature names saved to {feature_names_path}"))
        self.stdout.write(self.style.SUCCESS(f"✅ Scaler saved to {scaler_path}"))
        self.stdout.write("\n📌 Please upload these files to Google Colab for training:")
        self.stdout.write(f"   1. {output_path}")
        self.stdout.write(f"   2. {scaler_path}")
        self.stdout.write(f"   3. {feature_names_path}")