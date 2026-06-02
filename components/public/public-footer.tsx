export function PublicFooter() {
  return (
    <footer className="border-t border-[#2b2417] bg-[#080808]">
      <div className="page-shell grid gap-8 py-10 text-sm text-zinc-400 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex items-center gap-4">
          <img src="/biomic-logo.jpeg" alt="BIOMIC" className="h-14 w-14 rounded-full border border-[#caa84a]/40 object-cover" />
          <div>
            <p className="text-base font-extrabold tracking-[0.2em] text-white">BIOMIC WHIZ TRADING</p>
            <p className="mt-1">Authorized Daikin Air Conditioners Service Center</p>
            <p className="mt-1">1959 B Gerardo Tuazon St., Sampaloc, Manila</p>
          </div>
        </div>
        <div className="grid gap-1 md:text-right">
          <p>(c) 2026 BIOMIC WHIZ TRADING. All rights reserved.</p>
          <p className="font-semibold text-[#d8b84f]">Professional air conditioner service support</p>
        </div>
      </div>
    </footer>
  );
}
