import { PublicLayout } from "@/components/public/public-layout";

export default function AboutPage() {
  return (
    <PublicLayout>
      <main className="page-shell grid gap-10 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h1 className="text-4xl font-extrabold text-ink">About the Service Center</h1>
          <p className="mt-4 leading-7 text-muted">
            This authorized service center supports existing customers with maintenance, diagnostics, installation, and quotation workflows designed for fast internal review.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white p-6 shadow-panel">
          <h2 className="text-xl font-bold text-primary-800">Operations-first service</h2>
          <p className="mt-3 leading-7 text-muted">
            The portal keeps customer records, inquiry history, labor rates, parts rates, service templates, and quotation snapshots organized for staff.
          </p>
        </div>
      </main>
    </PublicLayout>
  );
}
