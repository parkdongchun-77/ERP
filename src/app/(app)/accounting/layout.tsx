// 경리/회계 모듈 레이아웃
import Link from "next/link";

const TABS = [
  { name: "전표", href: "/accounting" },
  { name: "계정별원장", href: "/accounting/ledger" },
  { name: "거래처원장", href: "/accounting/partner-ledger" },
  { name: "재무보고서", href: "/accounting/reports" },
];

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-t px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            {t.name}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
