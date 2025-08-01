// frontend-pwa/src/services/websocketService.js
class WebSocketService {
  constructor() {
    this.socket = null;
    this.url = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.eventHandlers = {};
  }

  // 이벤트 리스너 등록
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  // 이벤트 리스너 제거
  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  // 이벤트 발생
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  // WebSocket 연결
  connect(queueId) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket이 이미 연결되어 있습니다.');
      return;
    }

    // ✅ URL 수정: 올바른 WebSocket URL 생성
    this.url = `ws://127.0.0.1:8000/ws/queue/${queueId}/`;
    console.log(`🔄 WebSocket 연결 시도: ${this.url}`);

    try {
      this.socket = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ WebSocket 연결 실패:', error);
      this.handleReconnect();
    }
  }

  // 이벤트 핸들러 설정
  setupEventHandlers() {
    this.socket.onopen = (event) => {
      console.log('✅ WebSocket 연결 성공!');
      console.log('🔗 연결 정보:', {
        url: this.url,
        readyState: this.socket.readyState,
        protocol: this.socket.protocol
      });
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', { event });
    };

    this.socket.onclose = (event) => {
      console.log(`🔌 WebSocket 연결 해제 (코드: ${event.code})`);
      this.isConnected = false;
      this.emit('disconnected', { event });
      
      // 정상적인 연결 해제가 아닌 경우 재연결 시도
      if (event.code !== 1000 && event.code !== 1001) {
        this.handleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('💥 WebSocket 오류:', error);
      this.emit('error', { error });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket 메시지 수신:', data);
        
        this.emit('message', data);
        
        // 메시지 타입별 처리
        switch (data.type) {
          case 'connection_established':
            console.log('🎉 WebSocket 연결 확인됨');
            break;
          case 'queue_status_update':
            console.log('🔔 대기열 상태 업데이트:', data.data);
            this.emit('queueUpdate', data.data);
            break;
          case 'pong':
            console.log('🏓 Pong 수신');
            break;
          default:
            console.log('📋 기타 메시지:', data);
        }
      } catch (error) {
        console.error('❌ 메시지 파싱 오류:', error);
      }
    };
  }

  // 연결 해제
  disconnect() {
    if (this.socket) {
      console.log('🔌 WebSocket 연결 해제 요청');
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
      this.isConnected = false;
    }
  }

  // 메시지 전송
  sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('📤 메시지 전송:', message);
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket이 연결되지 않았습니다. 메시지를 전송할 수 없습니다.');
    }
  }

  // Ping 전송
  sendPing() {
    this.sendMessage({
      type: 'ping',
      timestamp: new Date().toISOString()
    });
  }

  // 재연결 처리
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${this.reconnectInterval}ms 후)`);
      
      setTimeout(() => {
        if (!this.isConnected) {
          const queueId = this.url?.split('/').slice(-2, -1)[0];
          if (queueId) {
            this.connect(queueId);
          }
        }
      }, this.reconnectInterval);
    } else {
      console.error('❌ 최대 재연결 시도 횟수를 초과했습니다.');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  // 연결 상태 확인
  getConnectionStatus() {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  // 연결 상태 반환
  isSocketConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// 싱글톤 인스턴스 생성
const websocketService = new WebSocketService();

export default websocketService;