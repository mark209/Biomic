import { CatalogManager } from "@/components/admin/catalog-manager";

export default function PartsItemsPage() {
  return (
    <CatalogManager
      table="parts_items"
      title="Parts Items"
      description="Maintain default parts names and prices used for future quotations."
    />
  );
}
