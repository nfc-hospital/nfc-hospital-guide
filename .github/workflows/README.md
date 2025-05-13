# GitHub Actions Workflows

자동화 배포 및 테스트를 위한 GitHub Actions 설정 파일들을 저장합니다.

## 기본 구조
- `deploy.yml` : main 브랜치에 push 시 자동 배포
- `test.yml` : PR 발생 시 자동 테스트 실행
- `lint.yml` : 코드 스타일 검사 (선택)

## TODO
- [ ] 서비스별 변경 감지 후 선택적 배포 설정
- [ ] Secrets 변수 및 환경 설정 파일 관리
