// 전자결재(다단계) 요청/처리 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestApproval, decideApproval } from "./actions";

type Step = { seq: number; approver: string; approver_id: string; status: string };
type Approval = {
  id: string;
  title: string;
  content: string | null;
  requester: string;
  doc_type: string | null;
  status: string;
  current_seq: number;
  created_at: string;
  steps: Step[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "진행중",
  approved: "승인",
  rejected: "반려",
  waiting: "대기",
};
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

export function ApprovalsView({
  me,
  members,
  draftDocs,
  approvals,
}: {
  me: string;
  members: { id: string; email: string }[];
  draftDocs: { key: string; label: string }[];
  approvals: Approval[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", content: "", doc: "" });
  const [approvers, setApprovers] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);

  const myQueue = approvals.filter(
    (a) =>
      a.status === "pending" &&
      a.steps.some((s) => s.seq === a.current_seq && s.approver_id === me && s.status === "pending")
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = approvers.filter(Boolean);
    const [doc_type, doc_id] = form.doc ? form.doc.split(":") : [undefined, undefined];
    const { error } = await requestApproval({
      title: form.title,
      content: form.content,
      approvers: valid,
      doc_type: doc_type as "sale" | "purchase" | undefined,
      doc_id,
    });
    if (error) setError(error);
    else {
      setForm({ title: "", content: "", doc: "" });
      setApprovers([""]);
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

      <form onSubmit={submit} className="space-y-3 rounded border bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
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
            <label className="mb-1 block text-xs text-gray-500">연동 전표(선택)</label>
            <select
              value={form.doc}
              onChange={(e) => setForm({ ...form, doc: e.target.value })}
              className="w-44 rounded border px-2 py-1.5 text-sm"
            >
              <option value="">없음</option>
              {draftDocs.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-xs text-gray-500">결재선 (순서대로 결재됩니다)</label>
          {approvers.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-10 text-xs text-gray-400">{i + 1}차</span>
              <select
                required
                value={a}
                onChange={(e) => {
                  const next = [...approvers];
                  next[i] = e.target.value;
                  setApprovers(next);
                }}
                className="w-64 rounded border px-2 py-1.5 text-sm"
              >
                <option value="">선택</option>
                {members
                  .filter((mm) => mm.id !== me && !approvers.filter((_, j) => j !== i).includes(mm.id))
                  .map((mm) => (
                    <option key={mm.id} value={mm.id}>
                      {mm.email}
                    </option>
                  ))}
              </select>
              {approvers.length > 1 && (
                <button
                  type="button"
                  onClick={() => setApprovers(approvers.filter((_, j) => j !== i))}
                  className="text-red-500"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setApprovers([...approvers, ""])}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            + 결재자 추가
          </button>
        </div>
        <p className="text-xs text-gray-400">
          전표를 연동하면 최종 승인 시 해당 전표가 자동 확정됩니다(재고·회계 반영).
        </p>
        <div className="text-right">
          <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            결재 요청
          </button>
        </div>
      </form>

      {myQueue.length > 0 && (
        <section className="rounded border border-yellow-300 bg-yellow-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-yellow-800">내 결재 차례 ({myQueue.length})</h2>
          <ul className="space-y-2">
            {myQueue.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded border bg-white p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {a.title}
                    {a.doc_type && (
                      <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                        전표 연동
                      </span>
                    )}
                  </p>
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
            <th className="p-2">결재선</th>
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
                <td className="p-2 text-xs">
                  {a.steps.map((s) => (
                    <span
                      key={s.seq}
                      className={`mr-1 rounded px-1.5 py-0.5 ${
                        s.status === "approved"
                          ? "bg-green-50 text-green-700"
                          : s.status === "rejected"
                            ? "bg-red-50 text-red-600"
                            : s.status === "pending"
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {s.seq}. {s.approver}
                    </span>
                  ))}
                </td>
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
