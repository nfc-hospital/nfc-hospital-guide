# FacilityRoute 모델 통합 Migration 가이드

## 변경 사항 요약

### 🔄 모델 통합 완료
- `hospital_navigation.models.FacilityRoute` → `nfc.models.FacilityRoute`로 통합
- 기존 필드와 새 필드를 모두 포함하여 하위 호환성 유지

### 📝 주요 변경사항

#### nfc/models.py - FacilityRoute 모델
**새로 추가된 필드:**
- `route_id` (UUIDField, PK) - 새로운 Primary Key
- `route_name` (CharField, unique) - 경로 이름
- `route_data` (JSONField) - 통합 경로 데이터
- `route_type` (CharField) - 'facility' 또는 'demo'
- `start_facility` (CharField) - 출발 시설
- `end_facility` (CharField) - 도착 시설
- `is_active` (BooleanField) - 활성 상태

**기존 필드 (하위 호환성 유지):**
- `facility_name` (CharField, nullable) - 구 버전 호환용
- `nodes` (JSONField) - 구 버전 호환용
- `edges` (JSONField) - 구 버전 호환용
- `map_id` (CharField)
- `svg_element_id` (CharField)

**자동 변환 로직 (`save()` 메서드):**
- `facility_name` → `route_name` 자동 변환
- `nodes/edges` → `route_data` 자동 변환
- 양방향 동기화 지원

#### hospital_navigation/models.py
- FacilityRoute 모델 제거
- FacilityRouteProxy 추가 (nfc.models.FacilityRoute의 Proxy)

#### hospital_navigation/admin.py
- 중복 FacilityRouteProxy 정의 제거
- models.py에서 import 사용

#### nfc/serializers.py - FacilityRouteSerializer
- 모든 필드 지원 (신규 + 기존)
- 검증 로직 추가

## 🚀 배포 시 실행 단계

### 1단계: 기존 데이터 백업
```bash
cd ~/nfc-hospital/backend/nfc_hospital_system
python manage.py dumpdata nfc.FacilityRoute > facility_routes_backup.json
```

### 2단계: Migration 생성 (로컬에서)
```bash
# 로컬 개발 환경에서 실행
python manage.py makemigrations nfc
python manage.py makemigrations hospital_navigation
```

### 3단계: Migration 검토
생성된 migration 파일을 확인하고 다음 사항을 검토:
- nfc 앱: FacilityRoute 스키마 변경
- hospital_navigation 앱: FacilityRoute 제거 (Proxy만 유지)

### 4단계: 데이터 마이그레이션 스크립트 (필요 시)
기존 FacilityRoute 데이터가 있다면, 다음 변환 필요:

```python
# nfc/migrations/XXXX_migrate_facility_route_data.py 예시

from django.db import migrations

def migrate_old_data(apps, schema_editor):
    FacilityRoute = apps.get_model('nfc', 'FacilityRoute')

    for route in FacilityRoute.objects.all():
        # route_name이 없으면 facility_name에서 생성
        if not route.route_name and route.facility_name:
            route.route_name = f"route_{route.facility_name}"

        # route_data가 비어있으면 nodes/edges로 채우기
        if not route.route_data and (route.nodes or route.edges):
            route.route_data = {
                'nodes': route.nodes or [],
                'edges': route.edges or [],
                'map_id': route.map_id or '',
                'svg_element_id': route.svg_element_id or ''
            }

        # route_type 기본값 설정
        if not route.route_type:
            route.route_type = 'facility'

        route.save()

class Migration(migrations.Migration):
    dependencies = [
        ('nfc', 'XXXX_previous_migration'),
    ]

    operations = [
        migrations.RunPython(migrate_old_data, migrations.RunPython.noop),
    ]
```

### 5단계: 배포 (EC2 서버)
```bash
# GitHub에 push 후 자동 배포
git add .
git commit -m "fix: FacilityRoute 모델 충돌 해결 및 통합"
git push origin main
```

배포 스크립트 `.github/workflows/deploy.yml`의 migration 단계에서 자동 실행됨:
```bash
$VENV_PYTHON manage.py migrate --noinput
```

## ⚠️ 주의사항

### 배포 전 확인사항
1. **로컬에서 migration 생성 필수**
   - EC2 서버에서 makemigrations 금지
   - 로컬에서 생성 후 commit

2. **기존 데이터 백업**
   - `facility_routes` 테이블 데이터 백업 필수
   - 롤백 시나리오 준비

3. **테스트 필수**
   - Staging 환경에서 먼저 테스트
   - 기존 시연 map 저장 기능 동작 확인

### 호환성 확인
- 기존 코드 7곳 모두 `from nfc.models import FacilityRoute` 사용
- Serializer 업데이트로 신규/기존 필드 모두 지원
- Admin 인터페이스 정상 동작 확인 필요

### 배포 후 검증
```bash
# SSH로 EC2 접속 후
cd ~/nfc-hospital/backend/nfc_hospital_system
source ~/nfc-hospital/backend/venv/bin/activate

# Migration 상태 확인
python manage.py showmigrations nfc hospital_navigation

# 모델 체크
python manage.py check

# 데이터 확인
python manage.py shell
>>> from nfc.models import FacilityRoute
>>> FacilityRoute.objects.count()
>>> FacilityRoute.objects.first()  # 필드 확인
```

## 🐛 문제 해결

### Migration 충돌 시
```bash
# 모든 migration 상태 확인
python manage.py showmigrations

# 특정 migration으로 롤백
python manage.py migrate nfc XXXX  # 이전 migration 번호
python manage.py migrate hospital_navigation YYYY

# Migration 재생성
rm nfc/migrations/XXXX_*.py
python manage.py makemigrations nfc
```

### 배포 실패 시 롤백
```bash
# 백업 복구
python manage.py loaddata facility_routes_backup.json

# 코드 롤백
git revert <commit-hash>
git push origin main
```

## 📊 변경 파일 목록

- ✅ `nfc/models.py` - FacilityRoute 통합 모델
- ✅ `nfc/serializers.py` - 업데이트된 Serializer
- ✅ `hospital_navigation/models.py` - FacilityRoute 제거, Proxy 추가
- ✅ `hospital_navigation/admin.py` - 중복 정의 제거
- ⏳ `nfc/migrations/XXXX_*.py` - **로컬에서 생성 필요**
- ⏳ `hospital_navigation/migrations/XXXX_*.py` - **로컬에서 생성 필요**

## ✅ 완료 체크리스트

### 로컬 작업
- [x] nfc/models.py FacilityRoute 통합
- [x] hospital_navigation/models.py FacilityRoute 제거
- [x] hospital_navigation/admin.py 충돌 해결
- [x] nfc/serializers.py 업데이트
- [ ] **migration 생성 (로컬에서 필수)**
- [ ] migration 파일 commit

### 배포 작업
- [ ] GitHub push
- [ ] 배포 자동 실행 확인
- [ ] Migration 성공 확인
- [ ] 시연 map 저장 기능 테스트
- [ ] Admin 인터페이스 동작 확인

---

**작성일**: 2025-10-19
**작성자**: Claude Code
**관련 이슈**: FacilityRoute 모델 중복 정의로 인한 배포 실패
