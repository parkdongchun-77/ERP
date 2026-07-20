// 일정 페이지 (월 기준 목록형 캘린더)
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "./view";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const to = new Date(y, m, 0).toISOString().slice(0, 10);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, event_date, start_time, memo, created_by")
    .gte("event_date", from)
    .lte("event_date", to)
    .order("event_date")
    .order("start_time");
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  return (
    <CalendarView
      me={user?.id ?? ""}
      month={month}
      events={(events ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        event_date: e.event_date,
        start_time: e.start_time,
        memo: e.memo,
        created_by: e.created_by,
      }))}
    />
  );
}
