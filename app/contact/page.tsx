import { InquiryForm } from "@/components/public/inquiry-form";
import { PublicLayout } from "@/components/public/public-layout";

export default function ContactPage() {
  return (
    <PublicLayout>
      <main className="page-shell grid gap-8 py-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h1 className="text-4xl font-extrabold text-ink">Contact</h1>
          <p className="mt-4 text-muted">Reach the operations center or submit a service request for review.</p>
          <div className="mt-8 rounded-lg border border-line bg-slate-100 p-5 text-sm leading-7 text-muted">
            <strong className="block text-ink">Dispatch Hotline</strong>
            1-800-DAIKIN-OPS
            <strong className="mt-4 block text-ink">Support Email</strong>
            service@daikin-authorized.com
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-5 shadow-panel sm:p-7">
          <InquiryForm compact />
        </div>
      </main>
    </PublicLayout>
  );
}
