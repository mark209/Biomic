import { redirect } from "next/navigation";

export default function LaborItemsPage() {
  redirect("/admin/item-library?tab=labor");
}
