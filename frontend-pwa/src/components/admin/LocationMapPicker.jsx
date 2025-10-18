import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapIcon } from '@heroicons/react/24/outline';
import { availableMaps } from '../../data/facilityRoutes';

/**
 * LocationMapPicker - 지도 기반 환자 위치 선택 컴포넌트
 *
 * @param {Object} props
 * @param {string} props.patientId - 환자 ID
 * @param {Object} props.currentLocation - 현재 위치 { x, y, mapId, name }
 * @param {Function} props.onSave - 저장 콜백 (locationData) => void
 * @param {Function} props.onCancel - 취소 콜백
 */
const LocationMapPicker = ({ patientId, currentLocation, onSave, onCancel }) => {
  const svgContainerRef = useRef(null);

  // State
  const [selectedMapId, setSelectedMapId] = useState(currentLocation?.mapId || 'main_1f');
  const [clickedX, setClickedX] = useState(currentLocation?.x || null);
  const [clickedY, setClickedY] = useState(currentLocation?.y || null);
  const [locationName, setLocationName] = useState(currentLocation?.name || '');
  const [svgLoaded, setSvgLoaded] = useState(false);

  // SVG 로드
  const loadSvg = useCallback(async () => {
    if (!svgContainerRef.current) return;

    setSvgLoaded(false);

    try {
      const mapSrc = `/images/maps/${selectedMapId}.svg`;
      const response = await fetch(mapSrc);

      if (!response.ok) {
        throw new Error(`Failed to load SVG: ${response.statusText}`);
      }

      const svgText = await response.text();
      svgContainerRef.current.innerHTML = svgText;

      const svgElement = svgContainerRef.current.querySelector('svg');
      if (svgElement) {
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svgElement.style.pointerEvents = 'all';

        setSvgLoaded(true);
      }
    } catch (error) {
      console.error('SVG 로드 오류:', error);
      svgContainerRef.current.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-gray-500">
          <p class="text-lg font-medium">지도를 불러올 수 없습니다</p>
          <p class="text-sm mt-2">${selectedMapId}</p>
        </div>
      `;
    }
  }, [selectedMapId]);

  useEffect(() => {
    loadSvg();
  }, [loadSvg]);

  // SVG 클릭 핸들러
  const handleSvgClick = useCallback((e) => {
    const svg = svgContainerRef.current?.querySelector('svg');
    if (!svg) return;

    try {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

      setClickedX(Math.round(svgP.x));
      setClickedY(Math.round(svgP.y));

      console.log('📍 위치 클릭:', {
        x: Math.round(svgP.x),
        y: Math.round(svgP.y),
        mapId: selectedMapId
      });
    } catch (error) {
      console.error('클릭 처리 중 오류:', error);
    }
  }, [selectedMapId]);

  // 마커 렌더링
  useEffect(() => {
    if (!svgLoaded || !svgContainerRef.current) return;

    const svg = svgContainerRef.current.querySelector('svg');
    if (!svg) return;

    // 기존 마커 제거
    const existingMarkers = svg.querySelector('#location-markers');
    if (existingMarkers) {
      existingMarkers.remove();
    }

    // 마커 그룹 생성
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'location-markers');
    g.style.pointerEvents = 'none';

    // 현재 위치 마커 (파란색)
    if (currentLocation && currentLocation.mapId === selectedMapId) {
      const currentCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      currentCircle.setAttribute('cx', currentLocation.x);
      currentCircle.setAttribute('cy', currentLocation.y);
      currentCircle.setAttribute('r', '12');
      currentCircle.setAttribute('fill', '#3b82f6');
      currentCircle.setAttribute('stroke', '#ffffff');
      currentCircle.setAttribute('stroke-width', '3');
      currentCircle.setAttribute('opacity', '0.7');

      const currentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      currentText.setAttribute('x', currentLocation.x);
      currentText.setAttribute('y', currentLocation.y - 20);
      currentText.setAttribute('text-anchor', 'middle');
      currentText.setAttribute('font-size', '12');
      currentText.setAttribute('font-weight', 'bold');
      currentText.setAttribute('fill', '#1e40af');
      currentText.textContent = '현재 위치';

      g.appendChild(currentCircle);
      g.appendChild(currentText);
    }

    // 클릭한 위치 마커 (빨간색)
    if (clickedX !== null && clickedY !== null) {
      const clickedCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      clickedCircle.setAttribute('cx', clickedX);
      clickedCircle.setAttribute('cy', clickedY);
      clickedCircle.setAttribute('r', '15');
      clickedCircle.setAttribute('fill', '#ef4444');
      clickedCircle.setAttribute('stroke', '#ffffff');
      clickedCircle.setAttribute('stroke-width', '4');

      const clickedText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      clickedText.setAttribute('x', clickedX);
      clickedText.setAttribute('y', clickedY - 25);
      clickedText.setAttribute('text-anchor', 'middle');
      clickedText.setAttribute('font-size', '14');
      clickedText.setAttribute('font-weight', 'bold');
      clickedText.setAttribute('fill', '#dc2626');
      clickedText.textContent = '새 위치';

      g.appendChild(clickedCircle);
      g.appendChild(clickedText);
    }

    svg.appendChild(g);
  }, [svgLoaded, clickedX, clickedY, currentLocation, selectedMapId]);

  // 저장 핸들러
  const handleSave = () => {
    if (clickedX === null || clickedY === null) {
      alert('지도에서 위치를 선택해주세요!');
      return;
    }

    if (!locationName.trim()) {
      alert('위치 이름을 입력해주세요!');
      return;
    }

    const locationData = {
      x: clickedX,
      y: clickedY,
      mapId: selectedMapId,
      name: locationName.trim()
    };

    onSave(locationData);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 컨트롤 영역 */}
      <div className="p-4 bg-gray-50 border-b space-y-3">
        {/* 지도 선택 */}
        <div className="flex items-center gap-3">
          <MapIcon className="w-5 h-5 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">지도 선택:</label>
          <select
            value={selectedMapId}
            onChange={(e) => setSelectedMapId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            {availableMaps.map(map => (
              <option key={map.id} value={map.id}>
                {map.name}
              </option>
            ))}
          </select>
        </div>

        {/* 위치 이름 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            위치 이름
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="예: 채혈실 앞, 엘리베이터 옆"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* 좌표 정보 */}
        {clickedX !== null && clickedY !== null && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-sm">
              <span className="font-medium text-purple-900">선택한 좌표:</span>
              <span className="ml-2 text-purple-700">
                ({clickedX}, {clickedY}) - {availableMaps.find(m => m.id === selectedMapId)?.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 지도 표시 영역 */}
      <div className="flex-1 relative overflow-hidden bg-gray-100">
        <div
          ref={svgContainerRef}
          className="w-full h-full flex items-center justify-center"
          onClick={handleSvgClick}
          style={{ cursor: 'crosshair' }}
        />

        {/* 안내 메시지 */}
        {!clickedX && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700">
              📍 지도를 클릭하여 위치를 선택하세요
            </p>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={clickedX === null || clickedY === null || !locationName.trim()}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            clickedX === null || clickedY === null || !locationName.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          위치 저장
        </button>
      </div>
    </div>
  );
};

export default LocationMapPicker;
