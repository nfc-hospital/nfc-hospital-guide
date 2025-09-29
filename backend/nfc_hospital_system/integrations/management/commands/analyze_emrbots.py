"""
EMRBots 데이터셋 분석 스크립트
실제 의료 데이터의 패턴을 추출하여 대기열 데이터 생성에 활용
"""

from django.core.management.base import BaseCommand
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json

class Command(BaseCommand):
    help = 'Analyze EMRBots dataset to extract realistic hospital patterns'

    def handle(self, *args, **options):
        self.stdout.write("\n🔍 EMRBots 데이터셋 분석 시작...")
        self.stdout.write("=" * 60)

        # 데이터 경로
        data_dir = os.path.join('data', 'emrbots_100')

        # 1. Admissions 데이터 분석
        self.stdout.write("\n📊 입원 데이터 분석...")
        admissions_df = self.load_admissions(data_dir)
        admission_patterns = self.analyze_admissions(admissions_df)

        # 2. Patients 데이터 분석
        self.stdout.write("\n👥 환자 데이터 분석...")
        patients_df = self.load_patients(data_dir)
        patient_patterns = self.analyze_patients(patients_df)

        # 3. Labs 데이터 분석
        self.stdout.write("\n🧪 검사 데이터 분석...")
        labs_df = self.load_labs(data_dir)
        lab_patterns = self.analyze_labs(labs_df)

        # 4. 종합 패턴 생성
        self.stdout.write("\n📈 종합 패턴 생성...")
        combined_patterns = self.combine_patterns(
            admission_patterns,
            patient_patterns,
            lab_patterns
        )

        # 5. 패턴 저장
        self.save_patterns(combined_patterns)

        # 6. 결과 출력
        self.print_analysis_summary(combined_patterns)

    def load_admissions(self, data_dir):
        """입원 데이터 로드"""
        file_path = os.path.join(data_dir, 'AdmissionsCorePopulatedTable.txt')
        df = pd.read_csv(file_path, sep='\t', encoding='utf-8-sig')

        # 날짜 변환
        df['AdmissionStartDate'] = pd.to_datetime(df['AdmissionStartDate'])
        df['AdmissionEndDate'] = pd.to_datetime(df['AdmissionEndDate'])

        # 입원 기간 계산
        df['LengthOfStay'] = (df['AdmissionEndDate'] - df['AdmissionStartDate']).dt.total_seconds() / 3600

        self.stdout.write(f"   - {len(df)}개 입원 기록 로드 완료")
        return df

    def load_patients(self, data_dir):
        """환자 데이터 로드"""
        file_path = os.path.join(data_dir, 'PatientCorePopulatedTable.txt')
        df = pd.read_csv(file_path, sep='\t', encoding='utf-8-sig')

        # 생년월일 변환
        df['PatientDateOfBirth'] = pd.to_datetime(df['PatientDateOfBirth'])

        # 현재 나이 계산 (2024년 기준)
        df['Age'] = 2024 - df['PatientDateOfBirth'].dt.year

        self.stdout.write(f"   - {len(df)}명 환자 데이터 로드 완료")
        return df

    def load_labs(self, data_dir):
        """검사 데이터 로드 (샘플링)"""
        file_path = os.path.join(data_dir, 'LabsCorePopulatedTable.txt')

        # 파일이 크므로 샘플링하여 로드
        df = pd.read_csv(file_path, sep='\t', encoding='utf-8-sig', nrows=10000)

        # 날짜 변환
        df['LabDateTime'] = pd.to_datetime(df['LabDateTime'])

        self.stdout.write(f"   - {len(df)}개 검사 기록 샘플 로드 완료")
        return df

    def analyze_admissions(self, df):
        """입원 패턴 분석"""
        patterns = {}

        # 시간대별 입원 분포
        df['AdmissionHour'] = df['AdmissionStartDate'].dt.hour
        hourly_dist = df['AdmissionHour'].value_counts(normalize=True).sort_index()
        patterns['hourly_admission'] = hourly_dist.to_dict()

        # 요일별 입원 분포
        df['AdmissionWeekday'] = df['AdmissionStartDate'].dt.dayofweek
        weekday_dist = df['AdmissionWeekday'].value_counts(normalize=True).sort_index()
        patterns['weekday_admission'] = weekday_dist.to_dict()

        # 입원 기간 통계
        patterns['length_of_stay'] = {
            'mean': float(df['LengthOfStay'].mean()),
            'median': float(df['LengthOfStay'].median()),
            'std': float(df['LengthOfStay'].std()),
            'min': float(df['LengthOfStay'].min()),
            'max': float(df['LengthOfStay'].max()),
            'q25': float(df['LengthOfStay'].quantile(0.25)),
            'q75': float(df['LengthOfStay'].quantile(0.75))
        }

        # 월별 입원 분포
        df['AdmissionMonth'] = df['AdmissionStartDate'].dt.month
        monthly_dist = df['AdmissionMonth'].value_counts(normalize=True).sort_index()
        patterns['monthly_admission'] = monthly_dist.to_dict()

        # 재입원 패턴 (같은 환자의 여러 입원)
        readmission_counts = df.groupby('PatientID').size()
        patterns['readmission'] = {
            'single_admission': float((readmission_counts == 1).mean()),
            'multiple_admissions': float((readmission_counts > 1).mean()),
            'avg_admissions_per_patient': float(readmission_counts.mean())
        }

        return patterns

    def analyze_patients(self, df):
        """환자 패턴 분석"""
        patterns = {}

        # 성별 분포
        gender_dist = df['PatientGender'].value_counts(normalize=True)
        patterns['gender_distribution'] = gender_dist.to_dict()

        # 연령 분포
        patterns['age_distribution'] = {
            'mean': float(df['Age'].mean()),
            'median': float(df['Age'].median()),
            'std': float(df['Age'].std()),
            'min': float(df['Age'].min()),
            'max': float(df['Age'].max())
        }

        # 연령대별 분포
        age_groups = pd.cut(df['Age'], bins=[0, 18, 35, 50, 65, 100],
                           labels=['0-18', '19-35', '36-50', '51-65', '65+'])
        age_group_dist = age_groups.value_counts(normalize=True).sort_index()
        patterns['age_groups'] = age_group_dist.to_dict()

        # 결혼 상태 분포
        marital_dist = df['PatientMaritalStatus'].value_counts(normalize=True)
        patterns['marital_status'] = marital_dist.to_dict()

        return patterns

    def analyze_labs(self, df):
        """검사 패턴 분석"""
        patterns = {}

        # 시간대별 검사 분포
        df['LabHour'] = df['LabDateTime'].dt.hour
        hourly_lab_dist = df['LabHour'].value_counts(normalize=True).sort_index()
        patterns['hourly_labs'] = hourly_lab_dist.to_dict()

        # 검사 종류별 빈도
        lab_types = df['LabName'].value_counts(normalize=True).head(20)
        patterns['common_labs'] = lab_types.to_dict()

        # 환자당 평균 검사 수
        labs_per_admission = df.groupby('AdmissionID').size()
        patterns['labs_per_admission'] = {
            'mean': float(labs_per_admission.mean()),
            'median': float(labs_per_admission.median()),
            'std': float(labs_per_admission.std())
        }

        return patterns

    def combine_patterns(self, admission_patterns, patient_patterns, lab_patterns):
        """모든 패턴을 종합하여 대기열 생성용 패턴 생성"""
        combined = {
            'admissions': admission_patterns,
            'patients': patient_patterns,
            'labs': lab_patterns,
            'queue_patterns': {}
        }

        # 시간대별 혼잡도 (입원 + 검사 패턴 결합)
        hourly_congestion = {}
        for hour in range(24):
            admission_weight = admission_patterns['hourly_admission'].get(hour, 0)
            lab_weight = lab_patterns['hourly_labs'].get(hour, 0)
            # 입원과 검사를 6:4 비율로 가중 평균
            hourly_congestion[hour] = admission_weight * 0.6 + lab_weight * 0.4

        # 정규화 (최대값을 1로)
        max_congestion = max(hourly_congestion.values()) if hourly_congestion else 1
        for hour in hourly_congestion:
            hourly_congestion[hour] = hourly_congestion[hour] / max_congestion

        combined['queue_patterns']['hourly_congestion'] = hourly_congestion

        # 요일별 패턴
        weekday_patterns = {}
        for day in range(7):
            weekday_patterns[day] = admission_patterns['weekday_admission'].get(day, 0.14)  # 기본값 1/7

        combined['queue_patterns']['weekday_patterns'] = weekday_patterns

        # 부서별 매핑 (검사 종류를 부서로 매핑)
        department_mapping = {
            'METABOLIC': '진단검사의학과',
            'CBC': '진단검사의학과',
            'URINALYSIS': '진단검사의학과',
            'CARDIAC': '심장내과',
            'BLOOD': '채혈실'
        }

        dept_distribution = {}
        for lab_name, freq in lab_patterns['common_labs'].items():
            for key, dept in department_mapping.items():
                if key in lab_name.upper():
                    dept_distribution[dept] = dept_distribution.get(dept, 0) + freq
                    break

        # 기본 부서 추가
        default_depts = {
            '내과': 0.25,
            '정형외과': 0.15,
            'X-ray실': 0.10,
            'CT실': 0.08,
            'MRI실': 0.05
        }

        for dept, weight in default_depts.items():
            if dept not in dept_distribution:
                dept_distribution[dept] = weight

        # 정규화
        total = sum(dept_distribution.values())
        if total > 0:
            for dept in dept_distribution:
                dept_distribution[dept] = dept_distribution[dept] / total

        combined['queue_patterns']['department_distribution'] = dept_distribution

        # 대기시간 패턴 (입원 기간을 참조)
        los_stats = admission_patterns['length_of_stay']

        # 입원 시간을 분 단위 대기시간으로 스케일 변환 (시간 -> 분, 적절히 축소)
        combined['queue_patterns']['wait_time_patterns'] = {
            'base_wait': min(los_stats['median'] * 2, 30),  # 중앙값의 2배를 분으로, 최대 30분
            'min_wait': 5,
            'max_wait': min(los_stats['q75'] * 3, 120),  # 75분위의 3배를 분으로, 최대 120분
            'emergency_factor': 0.3,  # 응급 환자는 30% 대기시간
            'peak_multiplier': 1.5 + (los_stats['std'] / los_stats['mean'])  # 변동성 반영
        }

        # 연령별 패턴
        combined['queue_patterns']['age_patterns'] = patient_patterns['age_groups']

        # 성별 패턴
        combined['queue_patterns']['gender_patterns'] = patient_patterns['gender_distribution']

        return combined

    def save_patterns(self, patterns):
        """패턴을 JSON 파일로 저장"""
        output_dir = os.path.join('data', 'emrbots_patterns')
        os.makedirs(output_dir, exist_ok=True)

        output_file = os.path.join(output_dir, 'hospital_patterns.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(patterns, f, indent=2, ensure_ascii=False, default=str)

        self.stdout.write(f"\n💾 패턴 저장 완료: {output_file}")

    def print_analysis_summary(self, patterns):
        """분석 결과 요약 출력"""
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('📊 EMRBots 데이터 분석 요약')
        self.stdout.write('=' * 60)

        # 입원 패턴
        self.stdout.write('\n🏥 입원 패턴:')
        los = patterns['admissions']['length_of_stay']
        self.stdout.write(f"   - 평균 입원 기간: {los['mean']:.1f}시간 ({los['mean']/24:.1f}일)")
        self.stdout.write(f"   - 중앙값: {los['median']:.1f}시간")

        # 환자 패턴
        self.stdout.write('\n👥 환자 분포:')
        age_dist = patterns['patients']['age_distribution']
        self.stdout.write(f"   - 평균 연령: {age_dist['mean']:.1f}세")

        age_groups = patterns['patients']['age_groups']
        for group, ratio in age_groups.items():
            self.stdout.write(f"   - {group}세: {ratio*100:.1f}%")

        # 검사 패턴
        self.stdout.write('\n🧪 검사 패턴:')
        labs = patterns['labs']['labs_per_admission']
        self.stdout.write(f"   - 입원당 평균 검사: {labs['mean']:.1f}회")

        # 대기열 패턴
        self.stdout.write('\n⏰ 생성된 대기열 패턴:')
        queue = patterns['queue_patterns']

        # 가장 혼잡한 시간
        hourly = queue['hourly_congestion']
        peak_hour = max(hourly.items(), key=lambda x: x[1])
        self.stdout.write(f"   - 피크 시간: {peak_hour[0]}시 (혼잡도 {peak_hour[1]:.2f})")

        # 가장 한산한 시간
        quiet_hour = min(hourly.items(), key=lambda x: x[1])
        self.stdout.write(f"   - 한산한 시간: {quiet_hour[0]}시 (혼잡도 {quiet_hour[1]:.2f})")

        # 부서별 분포
        self.stdout.write('\n🏢 부서별 예상 분포:')
        dept_dist = queue['department_distribution']
        sorted_depts = sorted(dept_dist.items(), key=lambda x: x[1], reverse=True)
        for dept, ratio in sorted_depts[:5]:
            self.stdout.write(f"   - {dept}: {ratio*100:.1f}%")

        # 대기시간 패턴
        wait_patterns = queue['wait_time_patterns']
        self.stdout.write(f"\n⏱️ 대기시간 패턴:")
        self.stdout.write(f"   - 기본 대기시간: {wait_patterns['base_wait']:.0f}분")
        self.stdout.write(f"   - 최대 대기시간: {wait_patterns['max_wait']:.0f}분")
        self.stdout.write(f"   - 피크 시간 배수: {wait_patterns['peak_multiplier']:.2f}x")

        self.stdout.write('=' * 60)