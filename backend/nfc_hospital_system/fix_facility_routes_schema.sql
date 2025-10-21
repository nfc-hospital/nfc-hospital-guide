-- ========================================
-- FacilityRoute 테이블 스키마 업그레이드 SQL
-- ========================================
-- 이 스크립트는 facility_routes 테이블에 새 컬럼들을 추가합니다.
-- MySQL에서 직접 실행하거나 Django 마이그레이션으로 실행할 수 있습니다.

-- 1. route_id 컬럼 추가 (UUID를 문자열로 저장)
ALTER TABLE facility_routes
ADD COLUMN route_id CHAR(36) NULL UNIQUE
COMMENT '경로 ID (UUID)';

-- 2. 기존 데이터에 UUID 생성 (MySQL UUID 함수 사용)
UPDATE facility_routes
SET route_id = UUID()
WHERE route_id IS NULL;

-- 3. route_id를 NOT NULL로 변경
ALTER TABLE facility_routes
MODIFY COLUMN route_id CHAR(36) NOT NULL UNIQUE;

-- 4. route_name 컬럼 추가
ALTER TABLE facility_routes
ADD COLUMN route_name VARCHAR(200) NULL
COMMENT '경로 이름';

-- 5. 기존 데이터의 route_name 채우기 (facility_name 복사)
UPDATE facility_routes
SET route_name = COALESCE(facility_name, CONCAT('route_', id, '_legacy'))
WHERE route_name IS NULL;

-- 6. route_name을 UNIQUE NOT NULL로 변경
ALTER TABLE facility_routes
MODIFY COLUMN route_name VARCHAR(200) NOT NULL UNIQUE;

-- 7. facility_name을 nullable로 변경 (하위 호환성)
ALTER TABLE facility_routes
MODIFY COLUMN facility_name VARCHAR(100) NULL
COMMENT '시설명 (구 버전 - 하위 호환용)';

-- 8. route_data 컬럼 추가 (JSON 타입)
ALTER TABLE facility_routes
ADD COLUMN route_data JSON NULL DEFAULT (JSON_OBJECT())
COMMENT '경로 데이터 (Map Editor에서 생성)';

-- 9. route_type 컬럼 추가
ALTER TABLE facility_routes
ADD COLUMN route_type VARCHAR(20) NOT NULL DEFAULT 'facility'
COMMENT '경로 타입 (facility/demo)';

-- 10. start_facility 컬럼 추가
ALTER TABLE facility_routes
ADD COLUMN start_facility VARCHAR(200) NOT NULL DEFAULT ''
COMMENT '출발 시설';

-- 11. end_facility 컬럼 추가
ALTER TABLE facility_routes
ADD COLUMN end_facility VARCHAR(200) NOT NULL DEFAULT ''
COMMENT '도착 시설';

-- 12. is_active 컬럼 추가
ALTER TABLE facility_routes
ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1
COMMENT '활성 상태';

-- 13. created_by 컬럼 추가 (외래키)
ALTER TABLE facility_routes
ADD COLUMN created_by_id CHAR(36) NULL
COMMENT '생성자 user_id';

-- 14. created_by 외래키 제약조건 추가
ALTER TABLE facility_routes
ADD CONSTRAINT fk_facility_routes_created_by
FOREIGN KEY (created_by_id) REFERENCES users(user_id)
ON DELETE SET NULL;

-- 15. 인덱스 추가
CREATE INDEX idx_facility_routes_route_name ON facility_routes(route_name);
CREATE INDEX idx_facility_routes_route_type ON facility_routes(route_type);
CREATE INDEX idx_facility_routes_is_active ON facility_routes(is_active);
CREATE INDEX idx_facility_routes_route_id ON facility_routes(route_id);

-- 완료 메시지
SELECT 'facility_routes 테이블 스키마 업그레이드 완료!' AS status;
