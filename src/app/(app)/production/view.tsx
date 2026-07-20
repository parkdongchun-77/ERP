// BOM 등록·조회 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBom, deleteBom } from "./actions";

type Option = { id: string; label: string };
type BomRow = {
  id: string;
  product_item_id: string;
  product: string;
  lines: { material_item_id: string; material: string; qty_per: number }[];
};

export function BomView({
  boms,
  products,
  materials,
}: {
  boms: BomRow[];
  products: Option[];
  materials: Option[];
}) {
  const router = useRouter();
  const emptyLine = { material_item_id: "", qty_per: 1 };
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [lines, setLines] = useState<typeof emptyLine[]>([{ ...emptyLine }]);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = lines.filter((l) => l.material_item_id && l.qty_per > 0);
    const { error } = await saveBom({ product_item_id: productId, lines: valid });
    if (error) setError(error);
    else {
      setOpen(false);
      setProductId("");
      setLines([{ ...emptyLine }]);
      setError(null);
      router.refresh();
    }
  }

  function startEdit(b: BomRow) {
    setProductId(b.product_item_id);
    setLines(b.lines.map((l) => ({ material_item_id: l.material_item_id, qty_per: l.qty_per })));
    setOpen(true);
  }

  async function remove(id: string) {
    if (!confirm("BOM을 삭제하시겠습니까?")) return;
    const { error } = await deleteBom(id);
    if (error) setError(error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">BOM (소요량)</h1>
        <button
          onClick={() => setOpen(!open)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {open ? "닫기" : "BOM 등록"}
        </button>
      </div>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      {open && (
        <form onSubmit={submit} className="space-y-3 rounded border bg-white p-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">제품(반제품)</label>
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-64 rounded border px-2 py-1.5 text-sm"
            >
              <option value="">선택</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {lines.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={l.material_item_id}
                onChange={(e) => {
                  const next = [...lines];
                  next[i] = { ...l, material_item_id: e.target.value };
                  setLines(next);
                }}
                className="w-64 rounded border px-2 py-1.5 text-sm"
              >
                <option value="">자재 선택</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={l.qty_per}
                onChange={(e) => {
                  const next = [...lines];
                  next[i] = { ...l, qty_per: Number(e.target.value) };
                  setLines(next);
                }}
                className="w-28 rounded border px-2 py-1.5 text-right text-sm"
              />
              <span className="text-xs text-gray-400">제품 1단위당 소요량</span>
              <button
                type="button"
                onClick={() => setLines(lines.filter((_, j) => j !== i))}
                className="text-red-500"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setLines([...lines, { ...emptyLine }])}
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              + 자재 추가
            </button>
            <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              저장
            </button>
          </div>
        </form>
      )}

      {boms.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-400">등록된 BOM이 없습니다.</p>
      ) : (
        boms.map((b) => (
          <div key={b.id} className="rounded border bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-medium">{b.product}</h2>
              <span className="space-x-2 text-sm">
                <button onClick={() => startEdit(b)} className="text-blue-600 hover:underline">
                  수정
                </button>
                <button onClick={() => remove(b.id)} className="text-red-600 hover:underline">
                  삭제
                </button>
              </span>
            </div>
            <ul className="space-y-1 text-sm text-gray-600">
              {b.lines.map((l) => (
                <li key={l.material_item_id}>
                  {l.material} × {l.qty_per.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
