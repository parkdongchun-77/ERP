// 일정 목록·등록 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent, deleteEvent } from "../actions";

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  memo: string | null;
  created_by: string;
};

export function CalendarView({
  me,
  month,
  events,
}: {
  me: string;
  month: string;
  events: EventRow[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ title: "", event_date: today, start_time: "", memo: "" });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createEvent(form);
    if (error) setError(error);
    else {
      setForm({ ...form, title: "", memo: "" });
      setError(null);
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("일정을 삭제하시겠습니까?")) return;
    const { error } = await deleteEvent(id);
    if (error) setError(error);
    else router.refresh();
  }

  const grouped = new Map<string, EventRow[]>();
  for (const e of events) {
    const list = grouped.get(e.event_date) ?? [];
    list.push(e);
    grouped.set(e.event_date, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">일정</h1>
        <form className="flex items-end gap-2">
          <input type="month" name="month" defaultValue={month} className="rounded border px-2 py-1.5 text-sm" />
          <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">이동</button>
        </form>
      </div>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded border bg-white p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">제목</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">날짜</label>
          <input
            type="date"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">시간</label>
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">메모</label>
          <input
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          일정 등록
        </button>
      </form>

      {grouped.size === 0 ? (
        <p className="p-6 text-center text-sm text-gray-400">이번 달 일정이 없습니다.</p>
      ) : (
        [...grouped.entries()].map(([date, list]) => (
          <div key={date} className="rounded border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              {date} ({["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()]})
            </h2>
            <ul className="space-y-1 text-sm">
              {list.map((e) => (
                <li key={e.id} className="flex items-center justify-between border-b py-1">
                  <span>
                    {e.start_time && (
                      <span className="mr-2 text-xs text-gray-400">{e.start_time.slice(0, 5)}</span>
                    )}
                    {e.title}
                    {e.memo && <span className="ml-2 text-xs text-gray-400">{e.memo}</span>}
                  </span>
                  {e.created_by === me && (
                    <button onClick={() => remove(e.id)} className="text-xs text-red-500 hover:underline">
                      삭제
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
