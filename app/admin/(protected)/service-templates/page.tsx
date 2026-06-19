import { redirect } from "next/navigation";

export default function ServiceTemplatesPage() {
  redirect("/admin/item-library?tab=templates");
}
