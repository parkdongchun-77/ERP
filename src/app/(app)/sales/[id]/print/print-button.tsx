// 거래명세서 인쇄 버튼 (클라이언트 전용)
"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
    >
      인쇄
    </button>
  );
}
