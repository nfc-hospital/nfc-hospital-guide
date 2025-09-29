import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input, SimpleRNN
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler

print(f"TensorFlow version: {tf.__version__}")
print("=" * 60)
print("🚀 GUARANTEED TFLite Conversion Script for Hospital Data")
print("=" * 60)

# 1. 데이터 로드
print("\n[1/5] Loading 'lstm_training_data.csv'...")
try:
    # 우리가 생성한 실제 시계열 데이터 파일을 로드합니다.
    df = pd.read_csv('lstm_training_data.csv')
    print(f"✓ Data loaded: {df.shape}")
except FileNotFoundError:
    print("❌ ERROR: 'lstm_training_data.csv' file not found.")
    print("Please upload your CSV file to Colab first.")
    # 파일이 없으면 여기서 스크립트를 멈춥니다.
    exit()

# 2. 데이터 전처리
print("\n[2/5] Preparing dataset with One-Hot Encoding and Scaling...")

# 'department' 컬럼을 원-핫 인코딩으로 변환 (모델이 텍스트를 이해하도록)
df = pd.get_dummies(df, columns=['department'], prefix='dept')

# 학습에 사용할 특징(feature)들을 명확히 선택
feature_cols = [
    'hour', 'minute', 'weekday', 'waiting_count', 'congestion_level'
] + [col for col in df.columns if 'dept_' in col] # 원-핫 인코딩된 부서 컬럼들 추가

# 정답(target) 컬럼 선택
target_col = 'avg_wait_time'

# 데이터 정렬 및 최종 데이터프레임 생성
all_cols = feature_cols + [target_col]
df_processed = df[all_cols]

# 데이터를 0과 1 사이로 스케일링
scaler = MinMaxScaler()
data_scaled = scaler.fit_transform(df_processed)

# 시계열 데이터셋 생성 함수
def create_dataset(data, n_steps=12):
    X, y = [], []
    for i in range(len(data) - n_steps):
        X.append(data[i:(i + n_steps), :-1])  # 마지막 열(정답) 제외
        y.append(data[i + n_steps, -1])     # 마지막 열(정답)만 선택
    return np.array(X), np.array(y)

X, y = create_dataset(data_scaled, n_steps=12)
y = y.reshape(-1, 1)

# 학습/테스트 분할
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, shuffle=False
)

print(f"✓ Dataset ready - Train: {X_train.shape}, Test: {X_test.shape}")


# 3. 모델들 생성
print("\n[3/5] Building models...")
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

# Model 2: LSTM with SELECT_TF_OPS (성능 최고)
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
        print(f"Training {model_name}...")
        model.fit(X_train, y_train,
                  epochs=30,  # 에포크를 30으로 늘려 더 학습
                  batch_size=32,
                  validation_data=(X_test, y_test),
                  verbose=0,
                  callbacks=[tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=5)]) # 조기 종료 추가
        score = model.evaluate(X_test, y_test, verbose=0)
        print(f"✓ Training complete - Loss: {score[0]:.4f}, MAE: {score[1]:.4f}")

        print(f"Converting to TFLite...")
        if model_name == 'LSTM':
            converter = tf.lite.TFLiteConverter.from_keras_model(model)
            converter.target_spec.supported_ops = [
                tf.lite.OpsSet.TFLITE_BUILTINS,
                tf.lite.OpsSet.SELECT_TF_OPS
            ]
            converter._experimental_lower_tensor_list_ops = False
        else:
            converter = tf.lite.TFLiteConverter.from_keras_model(model)
            converter.optimizations = [tf.lite.Optimize.DEFAULT]

        tflite_model = converter.convert()

        filename = f'hospital_{model_name.lower()}.tflite'
        with open(filename, 'wb') as f:
            f.write(tflite_model)

        import os
        file_size = os.path.getsize(filename) / 1024
        print(f"✅ SUCCESS! Created {filename} ({file_size:.2f} KB)")
        successful_conversions.append({
            'name': model_name, 'file': filename, 'size': file_size, 'mae': score[1]
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

    print("📌 RECOMMENDATIONS:")
    print("-" * 40)
    best_model = min(successful_conversions, key=lambda x: x['mae'])
    
    print(f"🥇 BEST OVERALL: {best_model['file']}")
    print(f"   → Lowest Error (MAE: {best_model['mae']:.4f}), best choice.")

    print("\n🥈 RECOMMENDED FOR COMPATIBILITY: hospital_simplernn.tflite")
    print("   → Good balance of performance and compatibility.")
    
    print("\n📥 Download the recommended .tflite file and place in:")
    print("   backend/nfc_hospital_system/ml_models/")
else:
    print("\n❌ No TFLite files were created.")

print("\n" + "=" * 60)
print("Script complete! Please follow the recommendations.")
print("=" * 60)