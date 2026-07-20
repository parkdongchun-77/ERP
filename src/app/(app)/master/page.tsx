// 기준정보 진입 시 품목 화면으로 이동
import { redirect } from "next/navigation";

export default function MasterIndexPage() {
  redirect("/master/items");
}
