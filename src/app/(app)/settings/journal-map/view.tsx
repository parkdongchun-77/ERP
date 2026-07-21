// 자동분개 계정 매핑 설정 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveJournalMap } from "./actions";

type Row = { key: string; label: string; def: string; current: string };

export function JournalMapView({
  companyId,
  rows,
  accounts,
}: {
  companyId: string;
  rows: Row[];
  accounts: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function change(key: string, code: string) {
    const { error } = await saveJournalMap(companyId, key, code);
    if (error) setError(error);
    else {
      setError(null);
      setNotice("저장되었습니다. 이후 확정되는 전표부터 적용됩니다.");
      router.refresh();
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-bold">자동분개 계정 매핑</h1>
      <p className="text-sm text-gray-500">
        판매/구매/수금/지급/급여 확정 시 사용할 계정과목입니다. 비워두면 표준 기본 계정을 사용합니다. 이미 생성된 전표에는 영향이 없습니다.
      </p>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded bg-blue-50 p-2 text-sm text-blue-700">{notice}</p>}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">항목</th>
            <th className="p-2">기본 계정</th>
            <th className="p-2">사용 계정</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const defAccount = accounts.find((a) => a.code === r.def);
            return (
              <tr key={r.key} className="border-b">
                <td className="p-2">{r.label}</td>
                <td className="p-2 text-gray-500">
                  {r.def} {defAccount?.name}
                </td>
                <td className="p-2">
                  <select
                    value={r.current}
                    onChange={(e) => change(r.key, e.target.value)}
                    className="w-56 rounded border px-2 py-1.5 text-sm"
                  >
                    <option value="">기본값 사용</option>
                    {accounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} {a.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
