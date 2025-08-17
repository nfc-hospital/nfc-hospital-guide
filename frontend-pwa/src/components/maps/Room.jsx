import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * 개별 방을 나타내는 React 컴포넌트
 * SVG path 요소를 React 방식으로 관리
 */
const Room = ({ 
  roomId,
  roomData,
  pathData,
  fillColor = '#e2e8f0',
  onRoomClick,
  onRoomHover,
  isSelected = false,
  isHighlighted = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    console.log('Room clicked:', roomId);
    if (onRoomClick) {
      onRoomClick(roomId, roomData);
    }
  };

  const handleMouseEnter = (e) => {
    setIsHovered(true);
    if (onRoomHover) {
      onRoomHover(roomId, roomData, true, e);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onRoomHover) {
      onRoomHover(roomId, roomData, false);
    }
  };

  // 상태에 따른 스타일 결정
  const getFillColor = () => {
    if (isSelected) return '#3b82f6';
    if (isHighlighted) return '#ef4444';
    if (isHovered) return '#94a3b8';
    return fillColor;
  };

  const getOpacity = () => {
    if (isHovered || isSelected || isHighlighted) return 0.8;
    return 1;
  };

  const getStrokeWidth = () => {
    if (isSelected || isHighlighted) return 3;
    if (isHovered) return 2;
    return 1;
  };

  return (
    <>
      {pathData.type === 'rect' ? (
        <rect
          x={pathData.x}
          y={pathData.y}
          width={pathData.width}
          height={pathData.height}
          className="map-room"
          fill={getFillColor()}
          stroke={isSelected || isHighlighted ? '#1e40af' : '#64748b'}
          strokeWidth={getStrokeWidth()}
          opacity={getOpacity()}
          style={{
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-room-id={roomId}
        >
          <title>{roomData.name}</title>
        </rect>
      ) : pathData.type === 'circle' ? (
        <circle
          cx={pathData.cx}
          cy={pathData.cy}
          r={pathData.r}
          className="map-room"
          fill={getFillColor()}
          stroke={isSelected || isHighlighted ? '#1e40af' : '#64748b'}
          strokeWidth={getStrokeWidth()}
          opacity={getOpacity()}
          style={{
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-room-id={roomId}
        >
          <title>{roomData.name}</title>
        </circle>
      ) : (
        <path
          d={pathData.d}
          className="map-room"
          fill={getFillColor()}
          stroke={isSelected || isHighlighted ? '#1e40af' : '#64748b'}
          strokeWidth={getStrokeWidth()}
          opacity={getOpacity()}
          style={{
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-room-id={roomId}
        >
          <title>{roomData.name}</title>
        </path>
      )}
    </>
  );
};

Room.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomData: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
    node_id: PropTypes.string
  }).isRequired,
  pathData: PropTypes.oneOfType([
    PropTypes.shape({
      type: PropTypes.oneOf(['rect']),
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired
    }),
    PropTypes.shape({
      type: PropTypes.oneOf(['circle']),
      cx: PropTypes.number.isRequired,
      cy: PropTypes.number.isRequired,
      r: PropTypes.number.isRequired
    }),
    PropTypes.shape({
      type: PropTypes.oneOf(['path']),
      d: PropTypes.string.isRequired
    })
  ]).isRequired,
  fillColor: PropTypes.string,
  onRoomClick: PropTypes.func,
  onRoomHover: PropTypes.func,
  isSelected: PropTypes.bool,
  isHighlighted: PropTypes.bool
};

export default Room;