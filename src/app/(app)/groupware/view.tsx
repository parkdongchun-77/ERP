// 전자결재 요청/처리 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestApproval, decideApproval } from "./actions";

type Approval = {
  id: string;
  title: string;
  content: string | null;
  requester: string;
  approver: string;
  approver_id: string;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

export function ApprovalsView({
  me,
  members,
  approvals,
}: {
  me: string;
  members: { id: string; email: string }[];
  approvals: Approval[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", content: "", approver: "" });
  const [error, setError] = useState<string | null>(null);

  const myQueue = approvals.filter((a) => a.approver_id === me && a.status === "pending");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await requestApproval(form);
    if (error) setError(error);
    else {
      setForm({ title: "", content: "", approver: "" });
      setError(null);
      router.refresh();
    }
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    const { error } = await decideApproval(id, decision);
    if (error) setError(error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">전자결재</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded border bg-white p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">제목</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">내용</label>
          <input
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">결재자</label>
          <select
            required
            value={form.approver}
            onChange={(e) => setForm({ ...form, approver: e.target.value })}
            className="w-48 rounded border px-2 py-1.5 text-sm"
          >
            <option value="">선택</option>
            {members
              .filter((mm) => mm.id !== me)
              .map((mm) => (
                <option key={mm.id} value={mm.id}>
                  {mm.email}
                </option>
              ))}
          </select>
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          결재 요청
        </button>
      </form>

      {myQueue.length > 0 && (
        <section className="rounded border border-yellow-300 bg-yellow-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-yellow-800">
            내 결재 대기 ({myQueue.length})
          </h2>
          <ul className="space-y-2">
            {myQueue.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded border bg-white p-3 text-sm">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-gray-500">
                    기안: {a.requester} · {a.content}
                  </p>
                </div>
                <span className="space-x-2">
                  <button
                    onClick={() => decide(a.id, "approved")}
                    className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => decide(a.id, "rejected")}
                    className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                  >
                    반려
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-2">제목</th>
            <th className="p-2">기안자</th>
            <th className="p-2">결재자</th>
            <th className="p-2">상태</th>
            <th className="p-2">기안일</th>
          </tr>
        </thead>
        <tbody>
          {approvals.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-6 text-center text-gray-400">
                결재 문서가 없습니다.
              </td>
            </tr>
          ) : (
            approvals.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-2">{a.title}</td>
                <td className="p-2">{a.requester}</td>
                <td className="p-2">{a.approver}</td>
                <td className="p-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </td>
                <td className="p-2">{new Date(a.created_at).toLocaleDateString("ko-KR")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
