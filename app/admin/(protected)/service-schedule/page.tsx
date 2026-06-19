import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ServiceSchedulePage({ searchParams }: PageProps) {
  const params = new URLSearchParams();
  const resolved = await searchParams;
  Object.entries(resolved ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  });
  params.set("tab", "schedule");
  redirect(`/admin/service-desk?${params.toString()}`);
}
