// 전표 목록 + 수동 전표 입력 페이지
import { createClient } from "@/lib/supabase/server";
import { JournalView } from "./view";

export default async function JournalPage() {
  const supabase = await createClient();
  const [{ data: entries, error }, { data: accounts }] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("id, entry_no, entry_date, description, source_type, status, journal_lines(debit)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("accounts").select("code, name").eq("is_active", true).order("code"),
  ]);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  return (
    <JournalView
      entries={(entries ?? []).map((e) => ({
        id: e.id,
        entry_no: e.entry_no,
        entry_date: e.entry_date,
        description: e.description,
        source_type: e.source_type,
        status: e.status,
        total: ((e.journal_lines as { debit: number }[]) ?? []).reduce(
          (s, l) => s + Number(l.debit),
          0
        ),
      }))}
      accounts={(accounts ?? []).map((a) => ({ code: a.code, name: a.name }))}
    />
  );
}
