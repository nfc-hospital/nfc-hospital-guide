import tensorflow as tf
from django.conf import settings
import numpy as np
import logging

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
            self.interpreter = tf.lite.Interpreter(model_path=settings.LSTM_MODEL_PATH)
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            logger.info("✅ LSTM TFLite model loaded successfully.")
        except Exception as e:
            self.interpreter = None
            logger.error(f"❌ Error loading LSTM TFLite model: {e}")

    def predict(self, input_data):
        """입력 데이터로부터 대기 시간 예측"""
        if not self.interpreter:
            return {'error': 'Model not loaded'}

        try:
            # 입력 데이터 형태와 타입 확인 및 변환
            expected_shape = self.input_details[0]['shape']
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

            # 실제 대기 시간으로 변환 (모델은 0~1 사이 값 예측) - 90분을 최대값으로 가정
            predicted_wait_time = int(output[0][0] * 90)

            return {
                'predicted_wait_time': max(0, predicted_wait_time),  # 음수 방지
                'congestion_level': float(np.clip(output[0][0], 0, 1))
            }

        except Exception as e:
            logger.error(f"❌ Error during prediction: {e}")
            return {'error': str(e)}


# 싱글톤 인스턴스 생성
predictor = LSTMPredictor()