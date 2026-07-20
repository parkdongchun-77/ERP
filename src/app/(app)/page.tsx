// 로그인 후 첫 화면인 대시보드 (위젯은 Phase 9에서 구현)
export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">대시보드</h1>
      <p className="text-sm text-gray-500">
        모듈을 왼쪽 메뉴에서 선택하세요. 위젯(매출/재고 부족/미수금/결재 대기)은 이후 단계에서 추가됩니다.
      </p>
    </div>
  );
}
