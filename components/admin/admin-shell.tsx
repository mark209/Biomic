"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Snowflake, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminNav } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NotificationCenter } from "./notification-center";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  const navItems = adminNav;

  return (
    <div className="min-h-screen bg-surface pb-20 lg:pb-0">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-line bg-white px-4 py-6 lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary-700 text-white">
            <Snowflake className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-extrabold text-primary-700">Daikin Ops</span>
            <span className="block text-xs font-semibold text-muted">Service Center Pro</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold transition",
                  active ? "bg-primary-50 text-primary-800 ring-1 ring-primary-100" : "text-muted hover:bg-slate-100 hover:text-ink",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button variant="ghost" className="mt-4 justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-white lg:ml-64">
        <div className="flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="focus-ring grid h-11 w-11 place-items-center rounded-md lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-extrabold text-primary-700 md:text-xl">Daikin Service Portal</h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-sm font-semibold text-muted sm:block">Operations and Quotation Management</div>
            <NotificationCenter />
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 md:px-8 lg:ml-64">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-line bg-white lg:hidden">
        {adminNav.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("grid gap-1 px-1 py-2 text-center text-[11px] font-bold", active ? "text-primary-700" : "text-muted")}>
              <Icon className="mx-auto h-5 w-5" />
              <span className="truncate">{item.label.replace("Quotation ", "Quote ")}</span>
            </Link>
          );
        })}
      </nav>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-white lg:hidden">
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <span className="font-extrabold text-primary-700">Daikin Ops</span>
            <button className="focus-ring grid h-11 w-11 place-items-center rounded-md" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="grid gap-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={`${item.href}-${item.label}-mobile`}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-3 font-bold text-muted hover:bg-primary-50 hover:text-primary-800"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <Button variant="ghost" className="mt-3 justify-start" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
