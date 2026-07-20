// 거래처 목록·등록·수정·삭제·엑셀 업로드 클라이언트 뷰
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { DataTable, type Column } from "@/components/data-table";
import { savePartner, deletePartner, bulkCreatePartners, type PartnerInput } from "./actions";

export type PartnerRow = {
  id: string;
  partner_code: string;
  name: string;
  biz_no: string | null;
  ceo_name: string | null;
  partner_type: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  customer: "매출처",
  vendor: "매입처",
  both: "매출+매입",
};

const EMPTY = {
  partner_code: "",
  name: "",
  biz_no: "",
  ceo_name: "",
  partner_type: "both",
  contact_name: "",
  phone: "",
  email: "",
};

export function PartnersView({ rows }: { rows: PartnerRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState<typeof EMPTY & { id?: string }>(EMPTY);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await savePartner(form);
    if (error) setMessage({ type: "error", text: error });
    else {
      setForm(EMPTY);
      setMessage(null);
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const { error } = await deletePartner(id);
    if (error) setMessage({ type: "error", text: error });
    else router.refresh();
  }

  async function uploadExcel(file: File) {
    const wb = XLSX.read(await file.arrayBuffer());
    const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);
    const rowsToInsert: PartnerInput[] = parsed.map((r) => ({
      partner_code: String(r["거래처코드"] ?? "").trim(),
      name: String(r["상호"] ?? "").trim(),
      biz_no: r["사업자번호"] ? String(r["사업자번호"]) : undefined,
      ceo_name: r["대표자"] ? String(r["대표자"]) : undefined,
      partner_type:
        Object.entries(TYPE_LABEL).find(([, v]) => v === String(r["구분"] ?? ""))?.[0] ?? "both",
      contact_name: r["담당자"] ? String(r["담당자"]) : undefined,
      phone: r["전화"] ? String(r["전화"]) : undefined,
      email: r["이메일"] ? String(r["이메일"]) : undefined,
    }));
    const result = await bulkCreatePartners(rowsToInsert);
    const failText = result.failures.length
      ? ` / 실패 ${result.failures.length}건: ` +
        result.failures.map((f) => `${f.row}행(${f.reason})`).join(", ")
      : "";
    setMessage({
      type: result.failures.length ? "error" : "info",
      text: `업로드 완료: 성공 ${result.success}건${failText}`,
    });
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  const columns: Column<PartnerRow>[] = [
    { key: "partner_code", label: "코드" },
    { key: "name", label: "상호" },
    { key: "biz_no", label: "사업자번호" },
    { key: "ceo_name", label: "대표자" },
    { key: "partner_type", label: "구분", render: (r) => TYPE_LABEL[r.partner_type] ?? r.partner_type },
    { key: "contact_name", label: "담당자" },
    { key: "phone", label: "전화" },
    {
      key: "id",
      label: "관리",
      render: (r) => (
        <span className="space-x-2">
          <button
            onClick={() =>
              setForm({
                id: r.id,
                partner_code: r.partner_code,
                name: r.name,
                biz_no: r.biz_no ?? "",
                ceo_name: r.ceo_name ?? "",
                partner_type: r.partner_type,
                contact_name: r.contact_name ?? "",
                phone: r.phone ?? "",
                email: r.email ?? "",
              })
            }
            className="text-blue-600 hover:underline"
          >
            수정
          </button>
          <button onClick={() => remove(r.id)} className="text-red-600 hover:underline">
            삭제
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">거래처</h1>
        <label className="cursor-pointer rounded border px-3 py-2 text-sm hover:bg-gray-50">
          엑셀 업로드
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadExcel(e.target.files[0])}
          />
        </label>
      </div>
      <p className="text-xs text-gray-400">
        엑셀 헤더: 거래처코드(필수), 상호(필수), 사업자번호, 대표자, 구분(매출처/매입처/매출+매입), 담당자, 전화, 이메일
      </p>
      {message && (
        <p
          className={`rounded p-2 text-sm ${
            message.type === "error" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded border bg-white p-4">
        {form.id && <span className="w-full text-xs text-blue-600">수정 중: {form.partner_code}</span>}
        {(
          [
            ["partner_code", "코드", "w-24"],
            ["name", "상호", "w-40"],
            ["biz_no", "사업자번호", "w-32"],
            ["ceo_name", "대표자", "w-24"],
            ["contact_name", "담당자", "w-24"],
            ["phone", "전화", "w-32"],
            ["email", "이메일", "w-40"],
          ] as const
        ).map(([key, label, width]) => (
          <div key={key}>
            <label className="mb-1 block text-xs text-gray-500">{label}</label>
            <input
              required={key === "partner_code" || key === "name"}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className={`${width} rounded border px-2 py-1.5 text-sm`}
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs text-gray-500">구분</label>
          <select
            value={form.partner_type}
            onChange={(e) => setForm({ ...form, partner_type: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          >
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {form.id ? "수정 저장" : "등록"}
        </button>
        {form.id && (
          <button
            type="button"
            onClick={() => setForm(EMPTY)}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            취소
          </button>
        )}
      </form>

      <DataTable columns={columns} rows={rows} searchPlaceholder="코드/상호/사업자번호 검색" />
    </div>
  );
}
