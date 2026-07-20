// 전표 목록과 수동 전표(일반 분개) 입력 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createManualJournal, reverseEntry, type JournalLineInput } from "./actions";

type Entry = {
  id: string;
  entry_no: string;
  entry_date: string;
  description: string | null;
  source_type: string;
  status: string;
  total: number;
};

const SOURCE_LABEL: Record<string, string> = {
  manual: "수동",
  sale: "판매",
  purchase: "구매",
  receipt: "수금",
  payment: "지급",
  payroll: "급여",
  reversal: "역분개",
};

export function JournalView({
  entries,
  accounts,
}: {
  entries: Entry[];
  accounts: { code: string; name: string }[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const emptyLine: JournalLineInput = { account_code: "", debit: 0, credit: 0 };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ entry_date: today, description: "" });
  const [lines, setLines] = useState<JournalLineInput[]>([{ ...emptyLine }, { ...emptyLine }]);
  const [error, setError] = useState<string | null>(null);

  const debitTotal = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const creditTotal = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = lines.filter((l) => l.account_code && (l.debit > 0 || l.credit > 0));
    const { error } = await createManualJournal({ ...form, lines: valid });
    if (error) setError(error);
    else {
      setOpen(false);
      setLines([{ ...emptyLine }, { ...emptyLine }]);
      setForm({ entry_date: today, description: "" });
      setError(null);
      router.refresh();
    }
  }

  async function reverse(id: string) {
    if (!confirm("역분개 전표를 생성하시겠습니까?")) return;
    const { error } = await reverseEntry(id);
    if (error) setError(error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">전표</h1>
        <button
          onClick={() => setOpen(!open)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {open ? "닫기" : "수동 전표 입력"}
        </button>
      </div>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      {open && (
        <form onSubmit={submit} className="space-y-3 rounded border bg-white p-4">
          <div className="flex gap-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">일자</label>
              <input
                type="date"
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                className="rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">적요</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-2">계정과목</th>
                <th className="w-32 p-2">차변</th>
                <th className="w-32 p-2">대변</th>
                <th className="w-10 p-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b">
                  <td className="p-1">
                    <select
                      value={l.account_code}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i] = { ...l, account_code: e.target.value };
                        setLines(next);
                      }}
                      className="w-full rounded border px-2 py-1 text-sm"
                    >
                      <option value="">선택</option>
                      {accounts.map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min="0"
                      value={l.debit || ""}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i] = { ...l, debit: Number(e.target.value), credit: 0 };
                        setLines(next);
                      }}
                      className="w-full rounded border px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min="0"
                      value={l.credit || ""}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i] = { ...l, credit: Number(e.target.value), debit: 0 };
                        setLines(next);
                      }}
                      className="w-full rounded border px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => setLines(lines.filter((_, j) => j !== i))}
                      className="text-red-500"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setLines([...lines, { ...emptyLine }])}
              className="rounded border px-3 py-1.5 hover:bg-gray-50"
            >
              + 라인 추가
            </button>
            <div className="space-x-4">
              <span className={debitTotal === creditTotal ? "text-green-700" : "text-red-600"}>
                차변 {debitTotal.toLocaleString()} / 대변 {creditTotal.toLocaleString()}
              </span>
              <button
                disabled={debitTotal !== creditTotal || debitTotal === 0}
                className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                전표 저장
              </button>
            </div>
          </div>
        </form>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">전표번호</th>
            <th className="p-2">일자</th>
            <th className="p-2">적요</th>
            <th className="p-2">구분</th>
            <th className="p-2 text-right">금액</th>
            <th className="p-2">관리</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-400">
                전표가 없습니다.
              </td>
            </tr>
          ) : (
            entries.map((e) => (
              <tr key={e.id} className={`border-b ${e.status === "reversed" ? "text-gray-400 line-through" : ""}`}>
                <td className="p-2">{e.entry_no}</td>
                <td className="p-2">{e.entry_date}</td>
                <td className="p-2">{e.description}</td>
                <td className="p-2">{SOURCE_LABEL[e.source_type] ?? e.source_type}</td>
                <td className="p-2 text-right">{e.total.toLocaleString()}</td>
                <td className="p-2">
                  {e.status === "posted" && e.source_type === "manual" && (
                    <button onClick={() => reverse(e.id)} className="text-red-600 hover:underline">
                      역분개
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
