import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/public-layout";

const services = ["Aircon Cleaning", "Chemical Cleaning", "Diagnostics & Repair", "Installation", "Annual Maintenance Contract"];

export default function ServicesPage() {
  return (
    <PublicLayout>
      <main className="page-shell py-14">
        <h1 className="text-4xl font-extrabold text-ink">Services</h1>
        <p className="mt-4 max-w-2xl text-muted">Certified Daikin service support for residential, commercial, and light industrial cooling systems.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <div key={service} className="rounded-lg border border-line bg-white p-6 shadow-panel">
              <CheckCircle2 className="h-6 w-6 text-primary-700" />
              <h2 className="mt-4 text-xl font-bold text-ink">{service}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Request a service inquiry and the operations team can prepare the proper quotation breakdown.</p>
            </div>
          ))}
        </div>
        <Link href="/request-quotation">
          <Button className="mt-8">
            Request quotation <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </main>
    </PublicLayout>
  );
}
