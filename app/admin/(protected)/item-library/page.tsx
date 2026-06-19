import { Suspense } from "react";
import { ItemLibraryWorkspace } from "@/components/admin/item-library-workspace";

export default function ItemLibraryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading item library...</p>}>
      <ItemLibraryWorkspace />
    </Suspense>
  );
}
