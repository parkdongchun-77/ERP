// 거래처 목록 페이지 (서버에서 조회 후 클라이언트 뷰에 전달)
import { createClient } from "@/lib/supabase/server";
import { PartnersView, type PartnerRow } from "./view";

export default async function PartnersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("id, partner_code, name, biz_no, ceo_name, partner_type, contact_name, phone, email")
    .order("partner_code");
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;
  return <PartnersView rows={(data ?? []) as PartnerRow[]} />;
}
