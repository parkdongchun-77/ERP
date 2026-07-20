// 재무보고서 (합계잔액시산표, 손익계산서, 재무상태표)
import { createClient } from "@/lib/supabase/server";

type TbRow = {
  account_id: string;
  code: string;
  name: string;
  category: string;
  sub_category: string;
  debit_total: number;
  credit_total: number;
  balance: number;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const params = await searchParams;
  const to = params.to ?? new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trial_balance", { p_to: to });
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;
  const rows = ((data ?? []) as TbRow[]).map((r) => ({
    ...r,
    debit_total: Number(r.debit_total),
    credit_total: Number(r.credit_total),
    balance: Number(r.balance),
  }));

  const debitSum = rows.reduce((s, r) => s + r.debit_total, 0);
  const creditSum = rows.reduce((s, r) => s + r.credit_total, 0);
  const balanced = debitSum === creditSum;

  const revenue = rows.filter((r) => r.category === "revenue");
  const expense = rows.filter((r) => r.category === "expense");
  const revenueTotal = revenue.reduce((s, r) => s + -r.balance, 0);
  const expenseTotal = expense.reduce((s, r) => s + r.balance, 0);
  const netIncome = revenueTotal - expenseTotal;

  const asset = rows.filter((r) => r.category === "asset");
  const liability = rows.filter((r) => r.category === "liability");
  const equity = rows.filter((r) => r.category === "equity");
  const assetTotal = asset.reduce((s, r) => s + r.balance, 0);
  const liabilityTotal = liability.reduce((s, r) => s + -r.balance, 0);
  const equityTotal = equity.reduce((s, r) => s + -r.balance, 0) + netIncome;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">재무보고서</h1>
        <form className="flex items-end gap-2">
          <input type="date" name="to" defaultValue={to} className="rounded border px-2 py-1.5 text-sm" />
          <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            기준일 조회
          </button>
        </form>
      </div>

      {!balanced && (
        <p className="rounded bg-red-50 p-3 text-sm font-medium text-red-600">
          경고: 시산표 차변({debitSum.toLocaleString()})과 대변({creditSum.toLocaleString()})이 일치하지 않습니다.
        </p>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          합계잔액시산표 (차변 {debitSum.toLocaleString()} = 대변 {creditSum.toLocaleString()})
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2">코드</th>
              <th className="p-2">계정과목</th>
              <th className="p-2 text-right">차변합계</th>
              <th className="p-2 text-right">대변합계</th>
              <th className="p-2 text-right">잔액</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.account_id} className="border-b">
                <td className="p-2">{r.code}</td>
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-right">{r.debit_total.toLocaleString()}</td>
                <td className="p-2 text-right">{r.credit_total.toLocaleString()}</td>
                <td className="p-2 text-right font-medium">{r.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">손익계산서</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {revenue.map((r) => (
                <tr key={r.account_id} className="border-b">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-right">{(-r.balance).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-b bg-gray-50 font-medium">
                <td className="p-2">수익 합계</td>
                <td className="p-2 text-right">{revenueTotal.toLocaleString()}</td>
              </tr>
              {expense.map((r) => (
                <tr key={r.account_id} className="border-b">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-right">{r.balance.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-b bg-gray-50 font-medium">
                <td className="p-2">비용 합계</td>
                <td className="p-2 text-right">{expenseTotal.toLocaleString()}</td>
              </tr>
              <tr className="bg-blue-50 font-bold">
                <td className="p-2">당기순이익</td>
                <td className={`p-2 text-right ${netIncome < 0 ? "text-red-600" : ""}`}>
                  {netIncome.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">재무상태표</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {asset.map((r) => (
                <tr key={r.account_id} className="border-b">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-right">{r.balance.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-b bg-gray-50 font-medium">
                <td className="p-2">자산 합계</td>
                <td className="p-2 text-right">{assetTotal.toLocaleString()}</td>
              </tr>
              {liability.map((r) => (
                <tr key={r.account_id} className="border-b">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-right">{(-r.balance).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-b bg-gray-50 font-medium">
                <td className="p-2">부채 합계</td>
                <td className="p-2 text-right">{liabilityTotal.toLocaleString()}</td>
              </tr>
              <tr className="border-b bg-gray-50 font-medium">
                <td className="p-2">자본 합계(당기순이익 포함)</td>
                <td className="p-2 text-right">{equityTotal.toLocaleString()}</td>
              </tr>
              <tr className="bg-blue-50 font-bold">
                <td className="p-2">부채와 자본 합계</td>
                <td className="p-2 text-right">{(liabilityTotal + equityTotal).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
