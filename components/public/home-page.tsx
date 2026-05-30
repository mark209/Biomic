import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, MapPin, Phone, ShieldCheck, Snowflake, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InquiryForm } from "./inquiry-form";

const serviceCards = [
  {
    title: "Aircon Cleaning",
    description: "Deep cleaning and sanitization to restore cooling efficiency and indoor air quality.",
    icon: Snowflake
  },
  {
    title: "Installation",
    description: "Standard and complex setup for split-type, cassette, ducted, and VRV/VRF systems.",
    icon: CheckCircle2
  },
  {
    title: "Diagnostics & Repair",
    description: "Technical troubleshooting with itemized labor, parts, and service recommendations.",
    icon: Wrench
  }
];

export function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-line bg-slate-100">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(#006590 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="page-shell relative grid min-h-[560px] items-center gap-10 py-16">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1 text-sm font-bold text-primary-800">
              <ShieldCheck className="h-4 w-4" />
              Official Service Partner
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">Authorized Daikin Service Center</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Expert maintenance, precision repair, certified installation, and a faster quotation workflow handled by trained service staff.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/request-quotation" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  <Calendar className="h-5 w-5" />
                  Book Service
                </Button>
              </Link>
              <Link href="/request-quotation" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Request Quotation
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-ink">Comprehensive HVAC Solutions</h2>
          <p className="mt-3 text-muted">Professional maintenance, installation, and diagnostic services designed for homes, offices, and commercial spaces.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {serviceCards.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-lg border border-line bg-white p-6 shadow-panel">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-lg bg-primary-100 text-primary-800">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
              <Link href="/request-quotation" className="mt-5 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary-700">
                Request service <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-slate-100">
        <div className="page-shell py-16 lg:py-24">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-ink">The Daikin Standard</h2>
            <p className="mt-4 text-muted">Factory-level care with practical dispatch and quotation tools that help staff respond faster.</p>
            <div className="mt-8 grid gap-5">
              {["Certified technicians", "Genuine OEM parts", "Clear quotation breakdowns"].map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" />
                  <div>
                    <h3 className="font-bold text-ink">{item}</h3>
                    <p className="text-sm leading-6 text-muted">Reliable service records, inquiry tracking, and quotation history in one operations portal.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell grid gap-8 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
        <div className="grid gap-5">
          <div>
            <h2 className="text-3xl font-bold text-ink">Request Service</h2>
            <p className="mt-3 text-muted">Submit the details and the service desk will review the inquiry with a generated reference number.</p>
          </div>
          <div className="rounded-lg border border-line bg-slate-100 p-5">
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-primary-700" />
              <p className="text-sm text-muted">
                <strong className="block text-ink">Operations Center</strong>
                Authorized Daikin Service Center
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Phone className="h-5 w-5 text-primary-700" />
              <p className="text-sm text-muted">
                <strong className="block text-ink">Dispatch Hotline</strong>
                1-800-DAIKIN-OPS
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-5 shadow-panel sm:p-7">
          <InquiryForm />
        </div>
      </section>
    </main>
  );
}
