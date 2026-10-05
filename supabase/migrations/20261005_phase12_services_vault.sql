-- Phase 12: 서비스 대장 + 계정 금고(pgcrypto) + 도메인(Cloudflare 동기화 결과). 전부 관리자 전용.
-- 금고 키: alter database postgres set app.vault_key = '...' (별도 스크립트에서 1회 설정)
create extension if not exists pgcrypto;

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  domain text,
  registrar text,
  admin_email text,
  service_email text,
  apple_id text,
  kakao_account text,
  kakao_app_id text,
  kakao_channel text,
  social_logins text,
  db_location text,
  test_accounts text,
  notes text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists vault_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  label text not null,              -- 용도 (예: Play 콘솔, 카카오디벨로퍼스)
  site_url text,
  login_id text,
  secret bytea,                     -- pgp_sym_encrypt 결과. 평문은 어디에도 없다
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  zone_id text,
  status text,
  registrar text,
  expires_at date,
  auto_renew boolean,
  name_servers text[],
  dns jsonb,                        -- [{type,name,content,proxied,ttl}]
  synced_at timestamptz,
  notes text,
  unique (company_id, name)
);

do $$
declare t text;
begin
  foreach t in array array['services','vault_accounts','domains'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_admin', t);
    execute format('create policy %I on %I for all using (is_admin(company_id)) with check (is_admin(company_id))', t || '_admin', t);
  end loop;
end $$;

-- 목록용 뷰: secret 을 내보내지 않는다 (비밀번호 등록 여부만)
create or replace view vault_list with (security_invoker = true) as
  select id, company_id, service_id, label, site_url, login_id, notes, updated_at, (secret is not null) as has_secret
  from vault_accounts;

create or replace function vault_key() returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare k text;
begin
  k := current_setting('app.vault_key', true);
  if k is null or k = '' then raise exception '금고 키(app.vault_key)가 설정되지 않았습니다'; end if;
  return k;
end $$;
revoke all on function vault_key() from public;

-- 저장: id 가 null 이면 신규. 비밀번호가 null 이면 기존 secret 유지(빈 문자열이면 삭제).
create or replace function vault_put(p_id uuid, p_service uuid, p_label text, p_site_url text, p_login_id text, p_password text, p_notes text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_cid uuid; v_id uuid;
begin
  select company_id into v_cid from memberships where user_id = auth.uid() and role in ('owner','admin') limit 1;
  if v_cid is null then raise exception '권한이 없습니다'; end if;
  if p_label is null or p_label = '' then raise exception '용도를 입력하세요'; end if;
  if p_id is null then
    insert into vault_accounts (company_id, service_id, label, site_url, login_id, secret, notes)
      values (v_cid, p_service, p_label, nullif(p_site_url,''), nullif(p_login_id,''),
              case when p_password is null or p_password = '' then null else pgp_sym_encrypt(p_password, vault_key()) end, nullif(p_notes,''))
      returning id into v_id;
  else
    update vault_accounts set service_id = p_service, label = p_label, site_url = nullif(p_site_url,''), login_id = nullif(p_login_id,''),
      secret = case when p_password is null then secret when p_password = '' then null else pgp_sym_encrypt(p_password, vault_key()) end,
      notes = nullif(p_notes,''), updated_at = now()
      where id = p_id and company_id = v_cid returning id into v_id;
    if v_id is null then raise exception '항목을 찾을 수 없습니다'; end if;
  end if;
  return v_id;
end $$;

-- 조회: 관리자만, 클릭 시에만 호출. 서버 연동용 토큰(cloudflare_api_token)은 브라우저로 돌려주지 않는다.
create or replace function vault_get(p_id uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare r vault_accounts%rowtype;
begin
  select * into r from vault_accounts where id = p_id;
  if r.id is null then raise exception '항목을 찾을 수 없습니다'; end if;
  if not is_admin(r.company_id) then raise exception '권한이 없습니다'; end if;
  if r.label = 'cloudflare_api_token' then raise exception '서버 연동 토큰은 화면에서 볼 수 없습니다'; end if;
  if r.secret is null then return null; end if;
  return pgp_sym_decrypt(r.secret, vault_key());
end $$;

grant execute on function vault_put(uuid, uuid, text, text, text, text, text) to authenticated;
grant execute on function vault_get(uuid) to authenticated;
grant select on vault_list to authenticated;
