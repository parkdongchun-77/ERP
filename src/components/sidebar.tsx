// 좌측 모듈 트리 사이드바. 역할과 permissions 설정에 따라 메뉴를 필터링한다
import Link from "next/link";

export const MODULES = [
  { key: "dashboard", name: "대시보드", href: "/" },
  { key: "master", name: "기준정보", href: "/master" },
  { key: "inventory", name: "재고/유통", href: "/inventory" },
  { key: "sales", name: "영업/판매", href: "/sales" },
  { key: "purchasing", name: "구매/발주", href: "/purchasing" },
  { key: "accounting", name: "경리/회계", href: "/accounting" },
  { key: "production", name: "생산/제조", href: "/production" },
  { key: "payroll", name: "인사/급여", href: "/payroll" },
  { key: "groupware", name: "그룹웨어", href: "/groupware" },
];

export function Sidebar({
  companyName,
  role,
  hiddenModules,
}: {
  companyName: string;
  role: string;
  hiddenModules: string[];
}) {
  const isAdmin = ["owner", "admin"].includes(role);
  const visible = MODULES.filter((m) => !hiddenModules.includes(m.key));
  return (
    <aside className="flex w-56 flex-col border-r bg-white">
      <div className="border-b p-4">
        <p className="truncate text-sm font-bold">{companyName}</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {visible.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {m.name}
          </Link>
        ))}
      </nav>
      {isAdmin && (
        <div className="border-t p-2">
          <Link
            href="/settings/members"
            className="block rounded px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            설정 · 멤버 관리
          </Link>
        </div>
      )}
    </aside>
  );
}
