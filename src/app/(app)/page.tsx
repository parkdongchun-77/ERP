// 대시보드: KPI 카드, 월별 매출/매입 추이, 품목 TOP5, 매출 구성, 미수금·일정·결재 패널
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Line = { supply_amount: number; vat_amount: number };
type DocRow = { doc_date: string; lines: Line[] };

const PALETTE = ["#4f46e5", "#e11d48", "#0d9488", "#f59e0b", "#64748b"];

function fmt(n: number) {
  if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(1) + "억";
  if (Math.abs(n) >= 10000) return Math.round(n / 10000).toLocaleString() + "만";
  return n.toLocaleString();
}

function monthKey(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return d.toISOString().slice(0, 7);
}

function sumDocs(rows: DocRow[], month: string) {
  return rows
    .filter((r) => r.doc_date.startsWith(month))
    .reduce((s, r) => s + r.lines.reduce((a, l) => a + Number(l.supply_amount) + Number(l.vat_amount), 0), 0);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const from6 = monthKey(5) + "-01";
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [salesRes, purchasesRes, receivablesRes, itemsRes, stockRes, approvalsRes, eventsRes, journalsRes, itemSalesRes] =
    await Promise.all([
      supabase.from("sales").select("doc_date, lines:sales_lines(supply_amount, vat_amount)").eq("status", "confirmed").gte("doc_date", from6),
      supabase.from("purchases").select("doc_date, lines:purchase_lines(supply_amount, vat_amount)").eq("status", "confirmed").gte("doc_date", from6),
      supabase.from("partner_receivables").select("partner_name, balance").gt("balance", 0).order("balance", { ascending: false }).limit(5),
      supabase.from("items").select("id, safety_stock").gt("safety_stock", 0).eq("is_active", true),
      supabase.from("current_stock").select("item_id, qty"),
      supabase.from("approvals").select("id, current_seq, approval_steps(seq, approver, status)").eq("status", "pending"),
      supabase.from("events").select("id, title, event_date, start_time").gte("event_date", today).lte("event_date", week).order("event_date").limit(6),
      supabase.from("journal_entries").select("id, entry_no, entry_date, description, journal_lines(debit)").order("created_at", { ascending: false }).limit(5),
      supabase.from("sales").select("doc_date, sales_lines(supply_amount, vat_amount, items(name))").eq("status", "confirmed").gte("doc_date", monthKey(0) + "-01"),
    ]);

  const sales = (salesRes.data ?? []) as unknown as DocRow[];
  const purchases = (purchasesRes.data ?? []) as unknown as DocRow[];

  // 월별 추이 (최근 6개월)
  const months = [5, 4, 3, 2, 1, 0].map((o) => {
    const key = monthKey(o);
    return { key, label: Number(key.slice(5)) + "월", sales: sumDocs(sales, key), purchases: sumDocs(purchases, key) };
  });
  const maxMonthly = Math.max(1, ...months.map((m) => Math.max(m.sales, m.purchases)));

  const thisMonth = months[5];
  const lastMonth = months[4];
  const salesDelta = lastMonth.sales > 0 ? Math.round(((thisMonth.sales - lastMonth.sales) / lastMonth.sales) * 100) : null;
  const purchaseDelta = lastMonth.purchases > 0 ? Math.round(((thisMonth.purchases - lastMonth.purchases) / lastMonth.purchases) * 100) : null;

  // 미수금
  const receivables = (receivablesRes.data ?? []).map((r) => ({ name: r.partner_name as string, balance: Number(r.balance) }));
  const receivableTotal = receivables.reduce((s, r) => s + r.balance, 0);
  const maxReceivable = Math.max(1, ...receivables.map((r) => r.balance));

  // 재고 부족
  const totals = new Map<string, number>();
  for (const s of stockRes.data ?? []) totals.set(s.item_id, (totals.get(s.item_id) ?? 0) + Number(s.qty));
  const shortageCount = (itemsRes.data ?? []).filter((i) => (totals.get(i.id) ?? 0) < Number(i.safety_stock)).length;

  // 내 결재 대기
  type Step = { seq: number; approver: string; status: string };
  const myApprovals = (approvalsRes.data ?? []).filter((a) =>
    ((a.approval_steps as Step[]) ?? []).some((s) => s.seq === a.current_seq && s.approver === user?.id && s.status === "pending")
  ).length;

  // 이번달 품목별 매출 TOP5 + 도넛 구성
  type ItemLine = { supply_amount: number; vat_amount: number; items: { name: string } | null };
  const byItem = new Map<string, number>();
  for (const s of itemSalesRes.data ?? []) {
    for (const l of (s.sales_lines as unknown as ItemLine[]) ?? []) {
      const name = l.items?.name ?? "기타";
      byItem.set(name, (byItem.get(name) ?? 0) + Number(l.supply_amount) + Number(l.vat_amount));
    }
  }
  const topItems = [...byItem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxItem = Math.max(1, ...topItems.map(([, v]) => v));
  const itemTotal = topItems.reduce((s, [, v]) => s + v, 0);

  // 도넛 세그먼트 (SVG stroke-dasharray)
  const C = 2 * Math.PI * 40;
  let acc = 0;
  const donut = topItems.map(([name, value], i) => {
    const frac = itemTotal > 0 ? value / itemTotal : 0;
    const seg = { name, value, color: PALETTE[i % PALETTE.length], dash: `${frac * C} ${C}`, offset: -acc * C };
    acc += frac;
    return seg;
  });

  const events = eventsRes.data ?? [];
  const journals = (journalsRes.data ?? []).map((j) => ({
    id: j.id,
    entry_no: j.entry_no,
    entry_date: j.entry_date,
    description: j.description,
    total: ((j.journal_lines as { debit: number }[]) ?? []).reduce((s, l) => s + Number(l.debit), 0),
  }));

  const kpis = [
    { label: "이번달 매출", value: fmt(thisMonth.sales), delta: salesDelta, href: "/sales/report", grad: "from-indigo-500 to-blue-500" },
    { label: "이번달 매입", value: fmt(thisMonth.purchases), delta: purchaseDelta, href: "/purchasing/summary", grad: "from-rose-500 to-pink-500" },
    { label: "미수금 잔액", value: fmt(receivableTotal), delta: null, href: "/sales/receipts", grad: "from-teal-500 to-emerald-500" },
    { label: "재고 부족 · 결재 대기", value: `${shortageCount}건 · ${myApprovals}건`, delta: null, href: "/inventory/shortage", grad: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="space-y-5">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${k.grad}`} />
            <p className="text-xs font-medium text-gray-500">{k.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-extrabold tracking-tight text-gray-900">{k.value}</p>
              {k.delta !== null && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${k.delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                  {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta)}%
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* 좌측 2/3: 차트 */}
        <div className="space-y-5 xl:col-span-2">
          {/* 월별 매출/매입 추이 */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">월별 매출 · 매입 추이</h2>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-indigo-500" />매출</span>
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-400" />매입</span>
              </div>
            </div>
            <div className="flex h-44 items-end gap-3">
              {months.map((m) => (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-36 w-full items-end justify-center gap-1.5">
                    <div title={`매출 ${m.sales.toLocaleString()}원`} className="w-1/3 rounded-t-md bg-gradient-to-t from-indigo-600 to-blue-400" style={{ height: `${Math.max(2, (m.sales / maxMonthly) * 100)}%` }} />
                    <div title={`매입 ${m.purchases.toLocaleString()}원`} className="w-1/3 rounded-t-md bg-gradient-to-t from-rose-500 to-pink-300" style={{ height: `${Math.max(2, (m.purchases / maxMonthly) * 100)}%` }} />
                  </div>
                  <span className={`text-xs ${m.key === thisMonth.key ? "font-bold text-indigo-600" : "text-gray-400"}`}>{m.label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* 품목 TOP5 */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-gray-800">이번달 품목별 매출 TOP5</h2>
              {topItems.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">이번달 확정 매출이 없습니다.</p>
              ) : (
                <ul className="space-y-3">
                  {topItems.map(([name, value], i) => (
                    <li key={name}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-medium text-gray-700">{name}</span>
                        <span className="text-gray-500">{fmt(value)}원</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100">
                        <div className="h-2.5 rounded-full" style={{ width: `${(value / maxItem) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 매출 구성 도넛 */}
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-bold text-gray-800">이번달 매출 구성</h2>
              {itemTotal === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">데이터가 없습니다.</p>
              ) : (
                <div className="flex items-center gap-5">
                  <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                    {donut.map((d) => (
                      <circle key={d.name} cx="50" cy="50" r="40" fill="none" stroke={d.color} strokeWidth="14" strokeDasharray={d.dash} strokeDashoffset={d.offset} />
                    ))}
                    <text x="50" y="46" transform="rotate(90 50 50)" textAnchor="middle" className="fill-gray-900 text-[11px] font-bold">
                      {fmt(itemTotal)}
                    </text>
                    <text x="50" y="60" transform="rotate(90 50 50)" textAnchor="middle" className="fill-gray-400 text-[7px]">
                      부가세 포함
                    </text>
                  </svg>
                  <ul className="flex-1 space-y-1.5 text-xs">
                    {donut.map((d) => (
                      <li key={d.name} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <i className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                          {d.name}
                        </span>
                        <span className="font-medium text-gray-800">{itemTotal > 0 ? Math.round((d.value / itemTotal) * 100) : 0}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          {/* 미수금 상위 */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">미수금 상위 거래처</h2>
              <Link href="/sales/receipts" className="text-xs font-medium text-indigo-600 hover:underline">전체 보기 →</Link>
            </div>
            {receivables.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">미수금이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {receivables.map((r) => (
                  <li key={r.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-gray-700">{r.name}</span>
                      <span className="font-semibold text-rose-600">{r.balance.toLocaleString()}원</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-rose-600" style={{ width: `${(r.balance / maxReceivable) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* 우측 1/3: 일정·결재·최근 전표 */}
        <div className="space-y-5">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">다가오는 일정</h2>
              <Link href="/groupware/calendar" className="text-xs font-medium text-indigo-600 hover:underline">일정 관리 →</Link>
            </div>
            {events.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">7일 내 일정이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-indigo-600 text-white">
                      <span className="text-[10px] leading-none">{Number(e.event_date.slice(5, 7))}월</span>
                      <span className="text-sm font-bold leading-tight">{Number(e.event_date.slice(8, 10))}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">{e.title}</p>
                      {e.start_time && <p className="text-xs text-gray-400">{String(e.start_time).slice(0, 5)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">내 결재 대기</h2>
              <Link href="/groupware" className="text-xs font-medium text-indigo-600 hover:underline">결재함 →</Link>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4">
              <span className="text-3xl font-extrabold text-amber-600">{myApprovals}</span>
              <p className="text-sm text-amber-800">건의 결재가 나를 기다리고 있습니다.</p>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">최근 회계 전표</h2>
              <Link href="/accounting" className="text-xs font-medium text-indigo-600 hover:underline">전표 →</Link>
            </div>
            {journals.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">전표가 없습니다.</p>
            ) : (
              <ul className="divide-y text-sm">
                {journals.map((j) => (
                  <li key={j.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-800">{j.description ?? j.entry_no}</p>
                      <p className="text-xs text-gray-400">{j.entry_date} · {j.entry_no}</p>
                    </div>
                    <span className="ml-2 shrink-0 font-semibold text-gray-700">{fmt(j.total)}원</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
