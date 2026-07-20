// 계정과목 조회 페이지 (표준 시드 기반, 대분류별 그룹 표시)
import { createClient } from "@/lib/supabase/server";

const CATEGORY_LABEL: Record<string, string> = {
  asset: "자산",
  liability: "부채",
  equity: "자본",
  revenue: "수익",
  expense: "비용",
};
const CATEGORY_ORDER = ["asset", "liability", "equity", "revenue", "expense"];

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, code, name, category, sub_category")
    .order("code");
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    rows: (data ?? []).filter((a) => a.category === cat),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">계정과목</h1>
      <p className="text-sm text-gray-500">
        회사 생성 시 표준 계정과목이 자동 등록됩니다. 총 {data?.length ?? 0}개.
      </p>
      {grouped.map((g) => (
        <section key={g.cat}>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            {CATEGORY_LABEL[g.cat]} ({g.rows.length})
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="w-24 p-2">코드</th>
                <th className="p-2">계정과목명</th>
                <th className="p-2">소분류</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="p-2">{a.code}</td>
                  <td className="p-2">{a.name}</td>
                  <td className="p-2 text-gray-500">{a.sub_category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
