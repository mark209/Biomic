import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuotationBuilderPage({ searchParams }: PageProps) {
  const params = new URLSearchParams();
  const resolved = await searchParams;
  Object.entries(resolved ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  });
  params.set("action", "create");
  redirect(`/admin/quotations?${params.toString()}`);
}
