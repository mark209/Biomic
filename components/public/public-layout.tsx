import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
