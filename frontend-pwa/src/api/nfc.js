import { api } from './client';

/**
 * NFC API 관련 모든 함수들을 관리하는 모듈
 */

/**
 * 비로그인 사용자용 NFC 태그 정보 조회
 * @param {string} tagId - NFC 태그 ID
 * @returns {Promise} 공개 위치 정보 및 시설 안내
 */
export const fetchPublicNFCInfo = async (tagId) => {
  try {
    const response = await api.post('nfc/public-info/', { tag_id: tagId });
    const responseData = response.data || response;
    
    return {
      success: true,
      data: responseData
    };
  } catch (error) {
    console.error('Public NFC info fetch error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch NFC tag information'
    };
  }
};

// NDEF 레코드 타입별 파싱 헬퍼
const parseNDEFRecord = (record) => {
  const decoder = new TextDecoder();
  
  // 레코드 타입 판별
  const recordType = decoder.decode(record.recordType);
  
  try {
    switch (recordType) {
      case 'T': // Text Record
        // DataView 객체인지 확인
        if (record.data instanceof DataView) {
          // 텍스트 레코드 파싱 (첫 바이트는 언어 코드 길이)
          const langCodeLength = record.data.getUint8(0);
          const textData = new Uint8Array(record.data.buffer, record.data.byteOffset + 1 + langCodeLength);
          return {
            type: 'text',
            data: decoder.decode(textData)
          };
        } else {
          // ArrayBuffer나 다른 형태의 데이터
          const view = new DataView(record.data);
          const langCodeLength = view.getUint8(0);
          const textData = new Uint8Array(record.data, 1 + langCodeLength);
          return {
            type: 'text',
            data: decoder.decode(textData)
          };
        }
        
      case 'U': // URI Record
        let prefixByte, uriData;
        
        if (record.data instanceof DataView) {
          prefixByte = record.data.getUint8(0);
          uriData = new Uint8Array(record.data.buffer, record.data.byteOffset + 1);
        } else {
          const view = new DataView(record.data);
          prefixByte = view.getUint8(0);
          uriData = new Uint8Array(record.data, 1);
        }
        
        // URI 접두사 디코딩
        const uriPrefixes = [
          '', 'http://www.', 'https://www.', 'http://', 'https://',
          'tel:', 'mailto:', 'ftp://anonymous:anonymous@', 'ftp://ftp.',
          'ftps://', 'sftp://', 'smb://', 'nfs://', 'ftp://', 'dav://',
          'news:', 'telnet://', 'imap:', 'rtsp://', 'urn:', 'pop:', 'sip:',
          'sips:', 'tftp:', 'btspp://', 'btl2cap://', 'btgoep://', 'tcpobex://',
          'irdaobex://', 'file://', 'urn:epc:id:', 'urn:epc:tag:', 'urn:epc:pat:',
          'urn:epc:raw:', 'urn:epc:', 'urn:nfc:'
        ];
        
        const prefix = uriPrefixes[prefixByte] || '';
        
        return {
          type: 'uri',
          data: prefix + decoder.decode(uriData)
        };
        
      default:
        // 알 수 없는 타입은 원시 데이터로 반환
        let rawData;
        if (record.data instanceof DataView) {
          rawData = new Uint8Array(record.data.buffer, record.data.byteOffset, record.data.byteLength);
        } else {
          rawData = new Uint8Array(record.data);
        }
        
        return {
          type: 'unknown',
          recordType: recordType,
          data: decoder.decode(rawData)
        };
    }
  } catch (error) {
    console.warn('NDEF 레코드 파싱 실패, 기본 처리 사용:', error);
    // 파싱에 실패하면 기본적으로 텍스트로 처리
    return {
      type: 'text',
      data: record.data ? decoder.decode(new Uint8Array(record.data)) : ''
    };
  }
};

// NDEF 메시지 전체 파싱
export const parseNDEFMessage = (message) => {
  if (!message || !message.records) {
    return null;
  }
  
  const parsedRecords = [];
  
  for (const record of message.records) {
    try {
      const parsed = parseNDEFRecord(record);
      parsedRecords.push(parsed);
    } catch (error) {
      console.warn('NDEF 레코드 파싱 실패:', error);
    }
  }
  
  return parsedRecords;
};

// 인증 상태 확인
const isAuthenticated = () => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

/**
 * NFC 태그 스캔 후 백엔드에 전송
 * @param {string} serialNumber - NFC 태그 시리얼 번호
 * @param {object} ndefMessage - NDEF 메시지 객체
 * @returns {Promise} API 응답
 */
export const scanNFCTag = async (serialNumber, ndefMessage = null) => {
  try {
    // NDEF 메시지 파싱
    const parsedData = parseNDEFMessage(ndefMessage);
    
    // 파싱된 데이터에서 위치 정보 추출
    let location = null;
    let tagData = {};
    
    if (parsedData && parsedData.length > 0) {
      // 텍스트 레코드에서 위치 정보 찾기
      const textRecord = parsedData.find(r => r.type === 'text');
      if (textRecord) {
        // JSON 형식인지 확인
        try {
          const jsonData = JSON.parse(textRecord.data);
          location = jsonData.location || jsonData.room || null;
          tagData = jsonData;
        } catch {
          // JSON이 아니면 텍스트 그대로 사용
          location = textRecord.data;
          tagData.text = textRecord.data;
        }
      }
      
      // URI 레코드 처리
      const uriRecord = parsedData.find(r => r.type === 'uri');
      if (uriRecord) {
        tagData.uri = uriRecord.data;
      }
    }
    
    // 요청 데이터 구성
    const requestData = {
      tag_id: serialNumber,  // 백엔드 API 형식에 맞춤
      serialNumber,
      tagData,
      timestamp: new Date().toISOString(),
      location,
      parsedRecords: parsedData
    };
    
    console.log('📡 NFC 스캔 데이터 전송:', requestData);
    
    // 로그인 상태에 따른 엔드포인트 선택
    if (isAuthenticated()) {
      // 로그인 상태: 개인화된 정보 제공
      const response = await api.post('nfc/scan/', requestData);
      
      // 스캔 로그 기록 (비동기, 실패해도 무시)
      // 백엔드에 실제 구현된 엔드포인트가 없으므로 임시 비활성화
      // api.post('/nfc/scan-log', {
      //   tag_id: serialNumber,
      //   action_type: 'scan',
      //   timestamp: requestData.timestamp
      // }).catch(err => console.warn('스캔 로그 기록 실패:', err));
      
      // API 응답 구조 표준화
      const responseData = response.data || response;
      return {
        success: true,
        authenticated: true,
        data: responseData
      };
    } else {
      // 비로그인 상태: 공개 정보만 제공
      const response = await api.post('nfc/public-info/', requestData);
      
      // API 응답 구조 표준화
      const responseData = response.data || response;
      return {
        success: true,
        authenticated: false,
        data: responseData
      };
    }
  } catch (error) {
    console.error('❌ NFC API 호출 실패:', error);
    
    // 오프라인이거나 네트워크 오류 시 로컬 처리
    if (!navigator.onLine || error.message?.includes('Network')) {
      return {
        success: false,
        offline: true,
        error: '네트워크 연결이 없습니다. 오프라인 모드로 작동합니다.',
        data: {
          // 오프라인 시 기본 데이터
          location: location || '알 수 없는 위치',
          message: '네트워크 연결 후 자세한 정보를 확인하세요.'
        }
      };
    }
    
    throw error;
  }
};

/**
 * NFC 태그 정보 조회 (태그 ID로)
 * @param {string} tagId - NFC 태그 ID
 * @returns {Promise} 태그 정보
 */
export const getTagInfo = async (tagId) => {
  try {
    // URL 경로 수정: /nfc/tags/{tagId}/ (슬래시 없음)
    const response = await api.get(`nfc/tags/${tagId}`);
    return response;
  } catch (error) {
    console.error('태그 정보 조회 실패:', error);
    throw error;
  }
};

/**
 * QR 코드 백업 생성
 * @param {string} tagId - NFC 태그 ID
 * @returns {Promise} QR 코드 데이터
 */
export const getQRBackup = async (tagId) => {
  try {
    const response = await api.get(`nfc/qr-backup/${tagId}`);
    return response;
  } catch (error) {
    console.error('QR 백업 생성 실패:', error);
    throw error;
  }
};

/**
 * 태그 기반 위치 안내 정보 조회
 * @param {string} tagId - NFC 태그 ID
 * @param {string} destination - 목적지 (선택)
 * @returns {Promise} 위치 안내 정보
 */
export const getLocationGuide = async (tagId, destination = null) => {
  try {
    const params = { tag_id: tagId };
    if (destination) {
      params.destination = destination;
    }
    
    const response = await api.post('navigation/route', params);
    return response;
  } catch (error) {
    console.error('위치 안내 조회 실패:', error);
    throw error;
  }
};

/**
 * 태그 스캔 후 대기열 체크인
 * @param {string} tagId - NFC 태그 ID
 * @param {string} appointmentId - 예약 ID
 * @returns {Promise} 체크인 결과
 */
export const checkInWithTag = async (tagId, appointmentId) => {
  try {
    const response = await api.post('queue/checkin', {
      tag_id: tagId,
      appointment_id: appointmentId,
      timestamp: new Date().toISOString()
    });
    return response;
  } catch (error) {
    console.error('체크인 실패:', error);
    throw error;
  }
};

export default {
  parseNDEFMessage,
  scanNFCTag,
  getTagInfo,
  getQRBackup,
  getLocationGuide,
  checkInWithTag
};