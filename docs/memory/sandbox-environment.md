# Cowork 샌드박스에서는 supabase.co 접속과 마운트 폴더 npm install이 불가

- 프록시가 supabase.co를 403으로 차단 → dev 서버/E2E/API 프로브 불가. DB 검증은 Supabase MCP의 execute_sql로 대체(begin...rollback 패턴).
- 마운트 폴더(outputs)에서 npm install 실패 → ~/build 네이티브 경로에 rsync 후 설치·빌드하고 소스만 동기화.
- git 락 파일 삭제가 막히면 allow_cowork_file_delete 권한 요청 후 find .git -name "*.lock" -delete.
- bash 호출당 45초 제한, 백그라운드 프로세스는 호출 간 유지 안 됨.
