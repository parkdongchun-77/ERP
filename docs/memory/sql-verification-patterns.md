# SQL 검증 패턴: begin/rollback + 가짜 auth 사용자 + 문장 분리

- 테스트 사용자: auth.users에 직접 insert 후 `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'`로 RLS 시뮬레이션. 전체를 begin...rollback으로 감싸면 원격 DB가 오염되지 않는다.
- 주의: 같은 SQL 문장 안에서는 volatile 함수(create_company 등)의 삽입 결과가 안 보인다(스냅샷). 검증 조회는 반드시 별도 문장으로.
- raise notice는 MCP execute_sql 결과로 안 돌아온다. 검증 값은 마지막 select로 반환할 것.
- \gset 등 psql 전용 문법 사용 불가.
