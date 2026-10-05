#!/bin/bash
# Cloudflare → ERP domains 동기화. 토큰은 ERP 금고(vault_accounts, label=cloudflare_api_token)에서 psql 로 복호화해 쓴다.
# 매일 03:10 cron. 수동: bash /root/_cf_sync.sh
set -u
LOG=/root/cf_sync.log
PSQL="docker exec -i supabase-db psql -U postgres -d postgres -Atq"
log() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }

TOKEN=$($PSQL -c "select extensions.pgp_sym_decrypt(secret, current_setting('app.vault_key')) from vault_accounts where label='cloudflare_api_token' order by updated_at desc limit 1" 2>>"$LOG")
CID=$($PSQL -c "select company_id from vault_accounts where label='cloudflare_api_token' order by updated_at desc limit 1")
if [ -z "$TOKEN" ] || [ -z "$CID" ]; then log "토큰 없음 — 건너뜀"; exit 0; fi

cf() { curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "https://api.cloudflare.com/client/v4$1"; }

ZONES=$(cf "/zones?per_page=50")
if ! echo "$ZONES" | jq -e '.success' >/dev/null 2>&1; then log "zones 조회 실패: $(echo "$ZONES" | head -c 300)"; exit 1; fi
ACCT=$(echo "$ZONES" | jq -r '.result[0].account.id // empty')
REG='{}'
if [ -n "$ACCT" ]; then
  R=$(cf "/accounts/$ACCT/registrar/domains")
  if echo "$R" | jq -e '.success' >/dev/null 2>&1; then REG=$(echo "$R" | jq -c '[.result[] | {name, expires_at, auto_renew, registrar: "Cloudflare Registrar"}] | map({(.name): .}) | add // {}'); else log "registrar 조회 불가(권한 없음?) — 만료일 생략"; fi
fi

N=0
for Z in $(echo "$ZONES" | jq -r '.result[] | @base64'); do
  z() { echo "$Z" | base64 -d | jq -r "$1"; }
  ZID=$(z .id); NAME=$(z .name); STATUS=$(z .status)
  NS=$(echo "$Z" | base64 -d | jq -c '.name_servers // []')
  DNS=$(cf "/zones/$ZID/dns_records?per_page=200" | jq -c '[.result[]? | {type, name, content, proxied, ttl}]')
  EXP=$(echo "$REG" | jq -r --arg n "$NAME" '.[$n].expires_at // empty' | cut -c1-10)
  AR=$(echo "$REG" | jq -r --arg n "$NAME" '.[$n].auto_renew // empty')
  REGR=$(echo "$REG" | jq -r --arg n "$NAME" '.[$n].registrar // empty')
  # 값은 전부 psql 변수(:'x')로 넘겨 따옴표·$ 문제를 피한다
  $PSQL -v cid="$CID" -v name="$NAME" -v zid="$ZID" -v status="$STATUS" -v regr="$REGR" -v exp="$EXP" -v ar="$AR" -v ns="$NS" -v dns="$DNS" <<'SQL'
insert into domains (company_id, name, zone_id, status, registrar, expires_at, auto_renew, name_servers, dns, synced_at)
values (:'cid'::uuid, :'name', :'zid', :'status', nullif(:'regr',''), nullif(:'exp','')::date, nullif(:'ar','')::boolean,
        array(select jsonb_array_elements_text(:'ns'::jsonb)), :'dns'::jsonb, now())
on conflict (company_id, name) do update set zone_id = excluded.zone_id, status = excluded.status,
  registrar = coalesce(excluded.registrar, domains.registrar), expires_at = coalesce(excluded.expires_at, domains.expires_at),
  auto_renew = coalesce(excluded.auto_renew, domains.auto_renew), name_servers = excluded.name_servers, dns = excluded.dns, synced_at = now();
SQL
  N=$((N+1))
done
log "동기화 완료: 존 $N개"
