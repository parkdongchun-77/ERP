// 견적서 페이지
import { fetchDocData } from "../doc-data";
import { DocModule } from "../doc-module";

export default async function QuotesPage() {
  const { docRows, partnerOptions, itemOptions, error } = await fetchDocData("quotes", "quote_lines");
  if (error)
    return <p className="rounded bg-red-50 p-3 text-sm text-red-600">{error.message}</p>;
  return <DocModule docType="quote" docs={docRows} partners={partnerOptions} items={itemOptions} />;
}
