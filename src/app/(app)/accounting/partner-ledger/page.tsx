// 거래처원장 (거래처·기간 선택, 분개 내역과 누적 잔액)
import { createClient } from "@/lib/supabase/server";

function monthRange() {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
}

export default async function PartnerLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const def = monthRange();
  const from = params.from ?? def.from;
  const to = params.to ?? def.to;
  const partnerId = params.partner ?? "";

  const supabase = await createClient();
  const { data: partners } = await supabase
    .from("partners")
    .select("id, partner_code, name")
    .eq("is_active", true)
    .order("partner_code");

  let rows: {
    id: string;
    entry_no: string;
    entry_date: string;
    description: string | null;
    account: string;
    debit: number;
    credit: number;
  }[] = [];

  if (partnerId) {
    const { data } = await supabase
      .from("journal_lines")
      .select(
        "id, debit, credit, accounts(code, name), journal_entries!inner(entry_no, entry_date, description)"
      )
      .eq("partner_id", partnerId)
      .gte("journal_entries.entry_date", from)
      .lte("journal_entries.entry_date", to);
    type Row = {
      id: string;
      debit: number;
      credit: number;
      accounts: { code: string; name: string } | null;
      journal_entries: { entry_no: string; entry_date: string; description: string | null };
    };
    rows = ((data ?? []) as unknown as Row[])
      .map((l) => ({
        id: l.id,
        entry_no: l.journal_entries.entry_no,
        entry_date: l.journal_entries.entry_date,
        description: l.journal_entries.description,
        account: l.accounts ? `${l.accounts.code} ${l.accounts.name}` : "?",
        debit: Number(l.debit),
        credit: Number(l.credit),
      }))
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  }

  let running = 0;
  const withBalance = rows.map((r) => {
    running += r.debit - r.credit;
    return { ...r, balance: running };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">거래처원장</h1>
      <form className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">거래처</label>
          <select name="partner" defaultValue={partnerId} className="w-56 rounded border px-2 py-1.5 text-sm">
            <option value="">선택</option>
            {(partners ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                [{p.partner_code}] {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">시작일</label>
          <input type="date" name="from" defaultValue={from} className="rounded border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">종료일</label>
          <input type="date" name="to" defaultValue={to} className="rounded border px-2 py-1.5 text-sm" />
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          조회
        </button>
      </form>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">일자</th>
            <th className="p-2">전표번호</th>
            <th className="p-2">적요</th>
            <th className="p-2">계정과목</th>
            <th className="p-2 text-right">차변</th>
            <th className="p-2 text-right">대변</th>
            <th className="p-2 text-right">잔액</th>
          </tr>
        </thead>
        <tbody>
          {withBalance.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-6 text-center text-gray-400">
                {partnerId ? "해당 기간의 거래가 없습니다." : "거래처를 선택하세요."}
              </td>
            </tr>
          ) : (
            withBalance.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.entry_date}</td>
                <td className="p-2">{r.entry_no}</td>
                <td className="p-2">{r.description}</td>
                <td className="p-2">{r.account}</td>
                <td className="p-2 text-right">{r.debit ? r.debit.toLocaleString() : ""}</td>
                <td className="p-2 text-right">{r.credit ? r.credit.toLocaleString() : ""}</td>
                <td className="p-2 text-right font-medium">{r.balance.toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
