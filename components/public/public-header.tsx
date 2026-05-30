"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Snowflake, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/request-quotation", label: "Request Quotation" }
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="page-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-extrabold text-primary-700">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary-700 text-white">
            <Snowflake className="h-5 w-5" />
          </span>
          Daikin Service
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-11 items-center px-1.5 text-sm font-semibold text-muted hover:text-primary-700">
              {item.label}
            </Link>
          ))}
          <Button variant="secondary" onClick={() => (window.location.href = "/admin/login")}>
            Portal Login
          </Button>
        </nav>
        <button className="focus-ring rounded-md p-2.5 text-muted md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-[90] bg-white md:hidden">
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <span className="font-extrabold text-primary-700">Daikin Service</span>
            <button className="focus-ring rounded-md p-2.5" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="grid gap-1 p-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-3 text-base font-semibold text-ink hover:bg-primary-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/admin/login" className="mt-2 flex min-h-11 items-center justify-center rounded-md bg-primary-700 px-3 py-3 text-center font-bold text-white">
              Portal Login
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
