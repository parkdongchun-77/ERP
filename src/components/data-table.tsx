// 검색·정렬·페이지네이션을 갖춘 공통 데이터 테이블 (전 모듈 목록 화면에서 재사용)
"use client";

import { useMemo, useState } from "react";

export type Column<T> = {
  key: keyof T & string;
  label: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  pageSize = 20,
  searchPlaceholder = "검색",
}: {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = q
      ? rows.filter((r) =>
          columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q))
        )
      : rows;
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), "ko");
        return sortAsc ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, columns, query, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(current * pageSize, (current + 1) * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div>
      <div className="mb-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder={searchPlaceholder}
          className="w-64 rounded border px-3 py-2 text-sm"
        />
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key)}
                className="cursor-pointer select-none p-2 hover:bg-gray-100"
              >
                {c.label}
                {sortKey === c.key && (sortAsc ? " ↑" : " ↓")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-gray-400">
                데이터가 없습니다.
              </td>
            </tr>
          ) : (
            pageRows.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                {columns.map((c) => (
                  <td key={c.key} className="p-2">
                    {c.render ? c.render(row) : String(row[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>
          총 {filtered.length}건 · {current + 1}/{pageCount} 페이지
        </span>
        <div className="space-x-2">
          <button
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            이전
          </button>
          <button
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
