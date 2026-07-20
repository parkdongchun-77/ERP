// 게시판 목록·작성 클라이언트 뷰
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPost, deletePost } from "../actions";

type Post = {
  id: string;
  title: string;
  content: string | null;
  author: string;
  created_at: string;
};

export function BoardView({ me, posts }: { me: string; posts: Post[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", content: "" });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createPost(form);
    if (error) setError(error);
    else {
      setForm({ title: "", content: "" });
      setError(null);
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const { error } = await deletePost(id);
    if (error) setError(error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">게시판</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="space-y-2 rounded border bg-white p-4">
        <input
          required
          placeholder="제목"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <textarea
          placeholder="내용"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={3}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <div className="text-right">
          <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            등록
          </button>
        </div>
      </form>

      {posts.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-400">게시글이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded border bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{p.title}</h2>
                <span className="space-x-2 text-xs text-gray-400">
                  <span>{new Date(p.created_at).toLocaleString("ko-KR")}</span>
                  {p.author === me && (
                    <button onClick={() => remove(p.id)} className="text-red-500 hover:underline">
                      삭제
                    </button>
                  )}
                </span>
              </div>
              {p.content && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{p.content}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
