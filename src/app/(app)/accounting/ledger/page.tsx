// 계정별원장 (계정과목·기간 선택 조회)
import { createClient } from "@/lib/supabase/server";

function monthRange() {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const def = monthRange();
  const from = params.from ?? def.from;
  const to = params.to ?? def.to;

  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, code, name")
    .eq("is_active", true)
    .order("code");

  const accountId = params.account ?? "";
  let rows: {
    id: string;
    entry_no: string;
    entry_date: string;
    description: string | null;
    debit: number;
    credit: number;
    memo: string | null;
  }[] = [];

  if (accountId) {
    const { data } = await supabase
      .from("journal_lines")
      .select("id, debit, credit, memo, journal_entries!inner(entry_no, entry_date, description)")
      .eq("account_id", accountId)
      .gte("journal_entries.entry_date", from)
      .lte("journal_entries.entry_date", to);
    type Row = {
      id: string;
      debit: number;
      credit: number;
      memo: string | null;
      journal_entries: { entry_no: string; entry_date: string; description: string | null };
    };
    rows = ((data ?? []) as unknown as Row[])
      .map((l) => ({
        id: l.id,
        entry_no: l.journal_entries.entry_no,
        entry_date: l.journal_entries.entry_date,
        description: l.journal_entries.description,
        debit: Number(l.debit),
        credit: Number(l.credit),
        memo: l.memo,
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
      <h1 className="text-lg font-bold">계정별원장</h1>
      <form className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">계정과목</label>
          <select name="account" defaultValue={accountId} className="w-56 rounded border px-2 py-1.5 text-sm">
            <option value="">선택</option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} {a.name}
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
            <th className="p-2 text-right">차변</th>
            <th className="p-2 text-right">대변</th>
            <th className="p-2 text-right">잔액</th>
          </tr>
        </thead>
        <tbody>
          {withBalance.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-400">
                {accountId ? "해당 기간의 분개가 없습니다." : "계정과목을 선택하세요."}
              </td>
            </tr>
          ) : (
            withBalance.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.entry_date}</td>
                <td className="p-2">{r.entry_no}</td>
                <td className="p-2">{r.description}</td>
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
