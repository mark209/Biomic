import { redirect } from "next/navigation";

export default function PartsItemsPage() {
  redirect("/admin/item-library?tab=parts");
}
