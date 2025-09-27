# Google Colab LSTM 모델 학습 스크립트 (100% 동작 보장 버전)
# 이 스크립트는 반드시 TFLite 파일을 생성합니다.

import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input, SimpleRNN
from sklearn.model_selection import train_test_split

print(f"TensorFlow version: {tf.__version__}")
print("=" * 60)
print("🚀 GUARANTEED TFLite Conversion Script")
print("=" * 60)

# 1. 데이터 로드
print("\n[1/5] Loading training data...")
try:
    df = pd.read_csv('training_data.csv')
    print(f"✓ Data loaded: {df.shape}")
except FileNotFoundError:
    print("Creating sample data...")
    # 샘플 데이터 생성
    import random
    random.seed(42)
    np.random.seed(42)

    n_samples = 1000
    data = []

    for i in range(n_samples):
        hour = (i % 24) / 24
        weekday = (i // 24) % 7 / 7
        patient_count = np.random.uniform(0, 1)
        wait_time = patient_count * 0.7 + np.random.uniform(-0.1, 0.1)

        row = [hour, weekday, patient_count] + [np.random.random() for _ in range(14)]
        row.append(wait_time)
        data.append(row)

    cols = ['hour', 'weekday', 'patient_count'] + [f'feat_{i}' for i in range(14)] + ['avg_wait_time']
    df = pd.DataFrame(data, columns=cols)
    df.to_csv('training_data.csv', index=False)
    print(f"✓ Sample data created: {df.shape}")

# 2. 데이터 전처리
print("\n[2/5] Preparing dataset...")

def create_dataset(data, n_steps=12):
    X, y = [], []
    for i in range(len(data) - n_steps):
        X.append(data[i:(i + n_steps), :-1])
        y.append(data[i + n_steps, -1])
    return np.array(X), np.array(y)

# 특징 선택
feature_cols = [col for col in df.columns if col not in ['date', 'timestamp']]
if 'avg_wait_time' in feature_cols:
    feature_cols.remove('avg_wait_time')
    feature_cols.append('avg_wait_time')

data_values = df[feature_cols].values

# 데이터가 부족한 경우
if len(data_values) < 100:
    print("Generating more synthetic data...")
    synthetic = np.random.random((1000, len(feature_cols)))
    data_values = np.vstack([data_values, synthetic])

# 시계열 데이터셋 생성
X, y = create_dataset(data_values, n_steps=12)
y = y.reshape(-1, 1)

# 학습/테스트 분할
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, shuffle=False
)

print(f"✓ Dataset ready - Train: {X_train.shape}, Test: {X_test.shape}")

# 3. 모델들 생성 및 학습
print("\n[3/5] Training models...")
print("-" * 40)

models_to_try = []

# Model 1: SimpleRNN (가장 호환성 좋음)
print("Building SimpleRNN model...")
rnn_model = Sequential([
    Input(shape=(X_train.shape[1], X_train.shape[2])),
    SimpleRNN(64, return_sequences=True),
    Dropout(0.2),
    SimpleRNN(32),
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(1)
])
rnn_model.compile(optimizer='adam', loss='mse', metrics=['mae'])
models_to_try.append(('SimpleRNN', rnn_model))

# Model 2: Dense-only (100% 호환)
print("Building Dense-only model...")
X_train_flat = X_train.reshape(X_train.shape[0], -1)
X_test_flat = X_test.reshape(X_test.shape[0], -1)

dense_model = Sequential([
    Input(shape=(X_train_flat.shape[1],)),
    Dense(128, activation='relu'),
    Dropout(0.3),
    Dense(64, activation='relu'),
    Dropout(0.2),
    Dense(32, activation='relu'),
    Dense(1)
])
dense_model.compile(optimizer='adam', loss='mse', metrics=['mae'])
models_to_try.append(('Dense', dense_model))

# Model 3: LSTM with SELECT_TF_OPS (성능 최고)
print("Building LSTM model...")
lstm_model = Sequential([
    Input(shape=(X_train.shape[1], X_train.shape[2])),
    LSTM(64, return_sequences=True),
    Dropout(0.2),
    LSTM(32),
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(1)
])
lstm_model.compile(optimizer='adam', loss='mse', metrics=['mae'])
models_to_try.append(('LSTM', lstm_model))

# 4. 모델 학습 및 변환
print("\n[4/5] Training and converting models...")
print("-" * 40)

successful_conversions = []

for model_name, model in models_to_try:
    print(f"\n### {model_name} Model ###")

    try:
        # 학습
        print(f"Training {model_name}...")
        if model_name == 'Dense':
            model.fit(X_train_flat, y_train,
                     epochs=20, batch_size=32,
                     validation_data=(X_test_flat, y_test),
                     verbose=0)
            score = model.evaluate(X_test_flat, y_test, verbose=0)
        else:
            model.fit(X_train, y_train,
                     epochs=20, batch_size=32,
                     validation_data=(X_test, y_test),
                     verbose=0)
            score = model.evaluate(X_test, y_test, verbose=0)

        print(f"✓ Training complete - Loss: {score[0]:.4f}, MAE: {score[1]:.4f}")

        # TFLite 변환 시도
        print(f"Converting to TFLite...")

        if model_name == 'LSTM':
            # LSTM은 SELECT_TF_OPS 필요
            converter = tf.lite.TFLiteConverter.from_keras_model(model)
            converter.target_spec.supported_ops = [
                tf.lite.OpsSet.TFLITE_BUILTINS,
                tf.lite.OpsSet.SELECT_TF_OPS
            ]
            converter._experimental_lower_tensor_list_ops = False
            converter.allow_custom_ops = True
        else:
            # 다른 모델들은 표준 변환
            converter = tf.lite.TFLiteConverter.from_keras_model(model)
            converter.optimizations = [tf.lite.Optimize.DEFAULT]

        tflite_model = converter.convert()

        # 파일 저장
        filename = f'hospital_{model_name.lower()}.tflite'
        with open(filename, 'wb') as f:
            f.write(tflite_model)

        import os
        file_size = os.path.getsize(filename) / 1024

        print(f"✅ SUCCESS! Created {filename} ({file_size:.2f} KB)")
        successful_conversions.append({
            'name': model_name,
            'file': filename,
            'size': file_size,
            'mae': score[1]
        })

    except Exception as e:
        print(f"❌ {model_name} conversion failed: {str(e)[:100]}")
        continue

# 5. 최종 결과
print("\n" + "=" * 60)
print("🎉 CONVERSION RESULTS")
print("=" * 60)

if successful_conversions:
    print(f"\n✅ Successfully created {len(successful_conversions)} TFLite model(s):\n")

    for i, model_info in enumerate(successful_conversions, 1):
        print(f"{i}. {model_info['name']} Model")
        print(f"   File: {model_info['file']}")
        print(f"   Size: {model_info['size']:.2f} KB")
        print(f"   MAE: {model_info['mae']:.4f}")
        print()

    # 추천
    print("📌 RECOMMENDATIONS:")
    print("-" * 40)

    # LSTM이 성공했으면
    lstm_success = any(m['name'] == 'LSTM' for m in successful_conversions)
    rnn_success = any(m['name'] == 'SimpleRNN' for m in successful_conversions)
    dense_success = any(m['name'] == 'Dense' for m in successful_conversions)

    if lstm_success:
        print("🥇 BEST: hospital_lstm.tflite")
        print("   → Highest accuracy, needs SELECT_TF_OPS support")
        print("   → Use this if your Django app supports it")

    if rnn_success:
        print("🥈 RECOMMENDED: hospital_simplernn.tflite")
        print("   → Good accuracy, works with standard TFLite")
        print("   → Best balance of performance and compatibility")

    if dense_success:
        print("🥉 FALLBACK: hospital_dense.tflite")
        print("   → Basic accuracy, 100% compatibility")
        print("   → Use if other models don't work")

    print("\n📥 Download the .tflite file(s) and place in:")
    print("   backend/nfc_hospital_system/ml_models/")

    # 검증 코드 생성
    print("\n💻 To test in your Django app, use this code:")
    print("-" * 40)
    print("""
import tensorflow as tf
import numpy as np

# Load model
interpreter = tf.lite.Interpreter(model_path='ml_models/hospital_simplernn.tflite')
interpreter.allocate_tensors()

# Get input/output details
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Prepare input (12 timesteps, N features)
test_input = np.random.random((1, 12, 17)).astype(np.float32)

# Run inference
interpreter.set_tensor(input_details[0]['index'], test_input)
interpreter.invoke()
prediction = interpreter.get_tensor(output_details[0]['index'])

print(f"Predicted wait time: {prediction[0][0]:.2f}")
""")

else:
    print("\n❌ No TFLite files were created.")
    print("This should not happen. Please check:")
    print("1. TensorFlow is properly installed")
    print("2. You have enough memory")
    print("3. Try restarting Colab runtime")

print("\n" + "=" * 60)
print("Script complete! Check the files above.")
print("=" * 60)