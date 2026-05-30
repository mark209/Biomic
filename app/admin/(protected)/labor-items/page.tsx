import { CatalogManager } from "@/components/admin/catalog-manager";

export default function LaborItemsPage() {
  return (
    <CatalogManager
      table="labor_items"
      title="Labor Items"
      description="Maintain default labor names and prices used for future quotations."
    />
  );
}
