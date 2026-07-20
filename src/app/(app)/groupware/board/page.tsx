// 게시판 페이지 (공지/자유 글 목록과 작성)
import { createClient } from "@/lib/supabase/server";
import { BoardView } from "./view";

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, content, author, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;

  return (
    <BoardView
      me={user?.id ?? ""}
      posts={(posts ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        author: p.author,
        created_at: p.created_at,
      }))}
    />
  );
}
