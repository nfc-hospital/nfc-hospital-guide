import tensorflow as tf
import numpy as np
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


class LSTMPredictor:
    """싱글톤 패턴으로 구현된 LSTM 모델 예측기"""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.initialize()
        return cls._instance

    def initialize(self):
        """TFLite 모델 초기화"""
        try:
            # 모델 경로 직접 설정 (settings 의존 제거)
            base_dir = Path(__file__).resolve().parent.parent.parent
            model_path = os.path.join(base_dir, 'ml_models', 'hospital_lstm.tflite')

            if not os.path.exists(model_path):
                logger.error(f"Model file not found at: {model_path}")
                self.interpreter = None
                return

            self.interpreter = tf.lite.Interpreter(model_path=model_path)
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()

            # 모델 정보 로깅
            logger.info(f"✅ LSTM TFLite model loaded from: {model_path}")
            logger.info(f"Input shape: {self.input_details[0]['shape']}")
            logger.info(f"Output shape: {self.output_details[0]['shape']}")

        except Exception as e:
            self.interpreter = None
            logger.error(f"❌ Error loading LSTM TFLite model: {e}")

    def predict(self, input_data):
        """입력 데이터로부터 대기 시간 예측"""
        if not self.interpreter:
            logger.error("Model not loaded, returning error")
            return {'error': 'Model not loaded'}

        try:
            # 입력 데이터 형태와 타입 확인 및 변환
            expected_shape = self.input_details[0]['shape']
            logger.debug(f"Expected shape: {expected_shape}, Input shape: {input_data.shape}")

            if list(input_data.shape) != list(expected_shape):
                # 배치 크기가 1이 아닐 경우 조정
                if len(expected_shape) == 3 and input_data.shape[1:] == tuple(expected_shape[1:]):
                    pass  # OK
                else:
                    logger.warning(f"Input shape mismatch. Expected {expected_shape}, got {input_data.shape}. Attempting to reshape.")
                    input_data = np.reshape(input_data, expected_shape)

            input_data = np.float32(input_data)
            self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
            self.interpreter.invoke()
            output = self.interpreter.get_tensor(self.output_details[0]['index'])

            logger.debug(f"Raw model output: {output}")

            # 새 모델은 이미 분 단위로 예측 (단일 출력)
            # output shape이 (1, 1)인 경우 - 30분 후 예측값
            if output.shape == (1, 1):
                # 단일 출력 모델 - 직접 대기시간 예측
                predicted_wait_time = float(output[0][0])
                # 모델이 정규화된 값을 반환할 수 있으므로 스케일 확인
                if predicted_wait_time <= 1.0:  # 0~1로 정규화된 경우
                    predicted_wait_time = int(predicted_wait_time * 60)  # 최대 60분으로 스케일
                else:
                    predicted_wait_time = int(predicted_wait_time)  # 이미 분 단위
            else:
                # 예상치 못한 출력 형태
                logger.warning(f"Unexpected output shape: {output.shape}")
                predicted_wait_time = 0

            # 혼잡도 계산 (0~1로 정규화)
            congestion = min(predicted_wait_time / 60.0, 1.0)  # 60분을 최대로 가정

            logger.debug(f"Predicted wait time: {predicted_wait_time} minutes, congestion: {congestion}")

            return {
                'predicted_wait_time': max(0, min(predicted_wait_time, 120)),  # 0~120분 범위 제한
                'congestion_level': float(np.clip(congestion, 0, 1))
            }

        except Exception as e:
            logger.error(f"❌ Error during prediction: {e}", exc_info=True)
            return {'error': str(e)}


# 싱글톤 인스턴스 생성
predictor = LSTMPredictor()