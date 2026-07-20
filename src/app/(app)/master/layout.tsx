// 기준정보 모듈 레이아웃. 하위 마스터 간 탭 내비게이션 제공
import Link from "next/link";

const TABS = [
  { name: "품목", href: "/master/items" },
  { name: "거래처", href: "/master/partners" },
  { name: "창고", href: "/master/warehouses" },
  { name: "부서", href: "/master/departments" },
  { name: "사원", href: "/master/employees" },
  { name: "계정과목", href: "/master/accounts" },
];

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
