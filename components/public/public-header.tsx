"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/#services", label: "Services" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
  { href: "/#inquiry", label: "Book Service" }
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#2b2417] bg-[#080808]/95 backdrop-blur">
      <div className="page-shell flex h-20 items-center justify-between">
        <Link href="/" className="flex min-h-11 items-center gap-3 text-lg font-extrabold text-white">
          <img src="/biomic-logo.jpeg" alt="BIOMIC" className="h-12 w-12 rounded-full border border-[#caa84a]/40 object-cover" />
          <span className="tracking-[0.18em]">BIOMIC WHIZ</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-11 items-center px-1.5 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300 hover:text-[#d8b84f]">
              {item.label}
            </Link>
          ))}
          <Button className="border border-[#d8b84f]/60 bg-transparent text-[#f4d56d] hover:bg-[#d8b84f] hover:text-black" onClick={() => (window.location.href = "/admin/login")}>
            Portal Login
          </Button>
        </nav>
        <button type="button" className="focus-ring rounded-md p-2.5 text-zinc-200 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-[9999] min-h-screen bg-[#080808] text-white shadow-[0_30px_80px_rgba(0,0,0,0.85)] md:hidden">
          <div className="flex h-20 items-center justify-between border-b border-[#2b2417] bg-[#080808] px-4">
            <Link href="/" className="flex items-center gap-3" onClick={closeMenu}>
              <img src="/biomic-logo.jpeg" alt="BIOMIC" className="h-12 w-12 rounded-full border border-[#caa84a]/40 object-cover" />
              <span className="font-extrabold tracking-[0.18em] text-white">BIOMIC WHIZ</span>
            </Link>
            <button type="button" className="focus-ring rounded-md border border-[#2b2417] bg-[#111111] p-2.5 text-zinc-200" onClick={closeMenu} aria-label="Close menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="grid gap-2 bg-[#080808] p-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-[#2b2417] bg-[#111111] px-4 py-4 text-base font-semibold uppercase tracking-[0.14em] text-zinc-100 hover:border-[#d8b84f]/50 hover:text-[#f4d56d]"
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/admin/login" onClick={closeMenu} className="mt-2 flex min-h-12 items-center justify-center rounded-md bg-[#d8b84f] px-3 py-3 text-center font-bold uppercase tracking-[0.14em] text-black">
              Portal Login
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
