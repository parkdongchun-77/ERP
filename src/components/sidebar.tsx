// 좌측 모듈 트리 사이드바 (이카운트식 모듈 구조)
import Link from "next/link";

const MODULES = [
  { name: "대시보드", href: "/" },
  { name: "기준정보", href: "/master" },
  { name: "재고/유통", href: "/inventory" },
  { name: "영업/판매", href: "/sales" },
  { name: "구매/발주", href: "/purchasing" },
  { name: "경리/회계", href: "/accounting" },
  { name: "생산/제조", href: "/production" },
  { name: "인사/급여", href: "/payroll" },
  { name: "그룹웨어", href: "/groupware" },
];

export function Sidebar({ companyName }: { companyName: string }) {
  return (
    <aside className="flex w-56 flex-col border-r bg-white">
      <div className="border-b p-4">
        <p className="truncate text-sm font-bold">{companyName}</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {MODULES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {m.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
