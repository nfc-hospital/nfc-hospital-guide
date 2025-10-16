#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
LSTM 모델 재학습 스크립트 (실제 DB 데이터 사용)
Queue 테이블에서 시계열 데이터를 추출하여 LSTM 모델 학습
"""
import os
import numpy as np
import json
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Avg
from p_queue.models import Queue
from appointments.models import Exam
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
import matplotlib
matplotlib.use('Agg')  # GUI 없이 그래프 저장
import matplotlib.pyplot as plt


class Command(BaseCommand):
    help = 'Train LSTM model using real Queue data from database'

    # 학습할 부서 리스트 (prediction_service.py와 동일)
    DEPARTMENTS = [
        '내과', '정형외과', '진단검사의학과',
        'X-ray실', 'CT실', 'MRI실'
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--epochs',
            type=int,
            default=50,
            help='Number of training epochs (default: 50)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=32,
            help='Batch size for training (default: 32)'
        )
        parser.add_argument(
            '--seq-length',
            type=int,
            default=12,
            help='Sequence length (timesteps) for LSTM (default: 12)'
        )

    def handle(self, *args, **options):
        epochs = options['epochs']
        batch_size = options['batch_size']
        seq_length = options['seq_length']

        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("LSTM 모델 재학습 시작 (실제 DB 데이터 사용)"))
        self.stdout.write("=" * 70)

        # 1단계: 데이터 추출
        self.stdout.write("\n[1/5] Queue 테이블에서 시계열 데이터 추출 중...")
        X, y, dept_names = self.extract_training_data(seq_length)

        if len(X) == 0:
            self.stdout.write(self.style.ERROR("학습 데이터가 없습니다. Queue 테이블에 데이터를 추가하세요."))
            return

        self.stdout.write(self.style.SUCCESS(f"   추출 완료: {len(X)}개 시퀀스, {len(dept_names)}개 부서"))

        # 2단계: 데이터 전처리
        self.stdout.write("\n[2/5] 데이터 정규화 및 Train/Test 분할 중...")
        X_train, X_test, y_train, y_test, scaler_y = self.preprocess_data(X, y)
        self.stdout.write(self.style.SUCCESS(f"   Train: {len(X_train)}개, Test: {len(X_test)}개"))

        # 3단계: 모델 구축
        self.stdout.write("\n[3/5] LSTM 모델 아키텍처 구축 중...")
        model = self.build_model(input_shape=(seq_length, 11))
        model.summary(print_fn=lambda x: self.stdout.write(f"   {x}"))

        # 4단계: 모델 학습
        self.stdout.write("\n[4/5] LSTM 모델 학습 시작...")
        history = self.train_model(model, X_train, y_train, X_test, y_test, epochs, batch_size)

        # 5단계: 모델 저장 및 변환
        self.stdout.write("\n[5/5] 모델 저장 및 TFLite 변환 중...")
        self.save_and_convert_model(model, history, scaler_y, X_test, y_test)

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("LSTM 모델 재학습 완료!"))
        self.stdout.write("=" * 70)
        self.stdout.write("\n다음 단계:")
        self.stdout.write("1. python test_prediction_rule7.py 실행하여 정확도 검증")
        self.stdout.write("2. 만족스러우면 hospital_lstm_new.tflite를 hospital_lstm.tflite로 교체")
        self.stdout.write("3. Django 서버 재시작 (model_loader.py가 새 모델 로드)")

    def extract_training_data(self, seq_length):
        """Queue 테이블에서 시계열 학습 데이터 추출"""
        X = []  # 입력 시퀀스 (shape: [N, seq_length, 11])
        y = []  # 출력 타겟 (shape: [N, 1]) - 30분 후 대기시간
        dept_names = []

        # 모든 Queue 데이터 조회 (오래된 것부터)
        all_queues = Queue.objects.select_related('exam').order_by('created_at')
        total_queues = all_queues.count()

        self.stdout.write(f"   총 Queue 레코드: {total_queues}개")

        # 부서별로 시계열 데이터 생성
        for dept in self.DEPARTMENTS:
            dept_queues = all_queues.filter(exam__department=dept)
            dept_count = dept_queues.count()

            if dept_count < seq_length + 1:
                self.stdout.write(self.style.WARNING(f"   {dept}: 데이터 부족 ({dept_count}개) - 스킵"))
                continue

            self.stdout.write(f"   {dept}: {dept_count}개 레코드 처리 중...")

            # 시계열 윈도우 생성 (슬라이딩 윈도우 방식)
            dept_sequences = 0
            for i in range(dept_count - seq_length):
                try:
                    # 입력: seq_length개 시간 단계
                    input_sequence = []
                    for j in range(seq_length):
                        q = dept_queues[i + j]
                        features = self._create_feature_vector(q, dept)
                        input_sequence.append(features)

                    # 타겟: seq_length 이후 큐의 대기시간
                    target_queue = dept_queues[i + seq_length]
                    target_wait_time = target_queue.estimated_wait_time

                    # 비정상 값 필터링 (0~120분 범위)
                    if not (5 <= target_wait_time <= 120):
                        continue

                    X.append(input_sequence)
                    y.append(target_wait_time)
                    dept_names.append(dept)
                    dept_sequences += 1

                except Exception as e:
                    continue

            self.stdout.write(f"      → {dept_sequences}개 시퀀스 생성")

        return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32), dept_names

    def _create_feature_vector(self, queue, department):
        """Queue 객체에서 11개 특징 벡터 생성 (prediction_service.py와 동일)"""
        features = []

        # 기본 특징 3개
        created_time = queue.created_at
        features.append(created_time.hour / 24.0)  # 시간 정규화
        features.append(created_time.weekday() / 6.0)  # 요일 정규화
        features.append(min(queue.estimated_wait_time / 60.0, 1.0))  # 대기시간 정규화

        # 부서 원핫 인코딩 8개
        if department in self.DEPARTMENTS:
            dept_idx = self.DEPARTMENTS.index(department)
        else:
            dept_idx = 0

        for i in range(8):  # 8개 부서 슬롯
            features.append(1.0 if i == dept_idx else 0.0)

        return features

    def preprocess_data(self, X, y):
        """데이터 정규화 및 Train/Test 분할"""
        # Train/Test 분할 (80/20)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, shuffle=True
        )

        # y (타겟) 정규화 (0-120분 → 0-1)
        scaler_y = MinMaxScaler(feature_range=(0, 1))
        y_train = scaler_y.fit_transform(y_train.reshape(-1, 1)).flatten()
        y_test = scaler_y.transform(y_test.reshape(-1, 1)).flatten()

        # X는 이미 정규화되어 있음 (create_feature_vector에서 처리)

        return X_train, X_test, y_train, y_test, scaler_y

    def build_model(self, input_shape):
        """LSTM 모델 아키텍처 구축"""
        model = Sequential([
            LSTM(64, activation='relu', return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(32, activation='relu'),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')  # 출력: 0~1 (정규화된 대기시간)
        ])

        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )

        return model

    def train_model(self, model, X_train, y_train, X_test, y_test, epochs, batch_size):
        """모델 학습 실행"""
        # 콜백 설정
        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        )

        checkpoint_path = 'ml_models/hospital_lstm_checkpoint.h5'
        model_checkpoint = ModelCheckpoint(
            checkpoint_path,
            monitor='val_loss',
            save_best_only=True,
            verbose=1
        )

        # 학습 진행
        history = model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stopping, model_checkpoint],
            verbose=1
        )

        return history

    def save_and_convert_model(self, model, history, scaler_y, X_test, y_test):
        """모델 저장 및 TFLite 변환"""
        base_dir = 'ml_models'
        os.makedirs(base_dir, exist_ok=True)

        # 1. Keras 모델 저장
        keras_path = f'{base_dir}/hospital_lstm_new.h5'
        model.save(keras_path)
        self.stdout.write(f"   Keras 모델 저장: {keras_path}")

        # 2. TFLite 변환
        tflite_path = f'{base_dir}/hospital_lstm_new.tflite'
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS,  # TFLite 기본 연산
            tf.lite.OpsSet.SELECT_TF_OPS      # TensorFlow 연산 허용 (LSTM용)
        ]
        converter._experimental_lower_tensor_list_ops = False  # 동적 텐서 허용
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        tflite_model = converter.convert()

        with open(tflite_path, 'wb') as f:
            f.write(tflite_model)
        self.stdout.write(f"   TFLite 모델 변환: {tflite_path}")

        # 3. Scaler 저장
        scaler_params = {
            'min_': float(scaler_y.min_[0]),
            'scale_': float(scaler_y.scale_[0]),
            'data_min_': float(scaler_y.data_min_[0]),
            'data_max_': float(scaler_y.data_max_[0]),
            'data_range_': float(scaler_y.data_range_[0])
        }
        scaler_path = f'{base_dir}/scaler_y.json'
        with open(scaler_path, 'w') as f:
            json.dump(scaler_params, f, indent=2)
        self.stdout.write(f"   Scaler 파라미터 저장: {scaler_path}")

        # 4. 학습 곡선 그래프 저장
        self._plot_training_history(history, f'{base_dir}/training_history.png')

        # 5. 평가 지표 저장
        self._evaluate_and_save_metrics(model, X_test, y_test, scaler_y, f'{base_dir}/model_metrics.json')

    def _plot_training_history(self, history, save_path):
        """학습 곡선 그래프 생성"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

        # Loss
        ax1.plot(history.history['loss'], label='Train Loss')
        ax1.plot(history.history['val_loss'], label='Val Loss')
        ax1.set_title('Model Loss')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Loss (MSE)')
        ax1.legend()
        ax1.grid(True)

        # MAE
        ax2.plot(history.history['mae'], label='Train MAE')
        ax2.plot(history.history['val_mae'], label='Val MAE')
        ax2.set_title('Model MAE')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('MAE')
        ax2.legend()
        ax2.grid(True)

        plt.tight_layout()
        plt.savefig(save_path, dpi=150)
        self.stdout.write(f"   학습 곡선 저장: {save_path}")

    def _evaluate_and_save_metrics(self, model, X_test, y_test, scaler_y, save_path):
        """모델 평가 지표 계산 및 저장"""
        # 예측
        y_pred = model.predict(X_test, verbose=0)

        # 역정규화
        y_test_original = scaler_y.inverse_transform(y_test.reshape(-1, 1)).flatten()
        y_pred_original = scaler_y.inverse_transform(y_pred).flatten()

        # 지표 계산
        mae = np.mean(np.abs(y_test_original - y_pred_original))
        rmse = np.sqrt(np.mean((y_test_original - y_pred_original) ** 2))
        mape = np.mean(np.abs((y_test_original - y_pred_original) / y_test_original)) * 100

        # 정확도 구간별 카운트
        errors = np.abs(y_test_original - y_pred_original)
        within_5min = np.sum(errors <= 5) / len(errors) * 100
        within_10min = np.sum(errors <= 10) / len(errors) * 100

        metrics = {
            'test_samples': int(len(y_test)),
            'mae': float(mae),
            'rmse': float(rmse),
            'mape': float(mape),
            'within_5min': float(within_5min),
            'within_10min': float(within_10min),
            'min_error': float(np.min(errors)),
            'max_error': float(np.max(errors)),
            'mean_actual': float(np.mean(y_test_original)),
            'mean_predicted': float(np.mean(y_pred_original))
        }

        with open(save_path, 'w') as f:
            json.dump(metrics, f, indent=2)

        # 콘솔 출력
        self.stdout.write("\n   모델 평가 지표 (Test Set):")
        self.stdout.write(f"      MAE (평균 절대 오차): {mae:.2f}분")
        self.stdout.write(f"      RMSE (평균 제곱근 오차): {rmse:.2f}분")
        self.stdout.write(f"      MAPE (평균 절대 백분율 오차): {mape:.1f}%")
        self.stdout.write(f"      5분 이내 정확도: {within_5min:.1f}%")
        self.stdout.write(f"      10분 이내 정확도: {within_10min:.1f}%")
        self.stdout.write(f"   지표 저장: {save_path}")
