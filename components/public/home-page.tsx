import Link from "next/link";
import { ArrowRight, Calendar, ClipboardCheck, Facebook, Mail, MapPin, Phone, ShieldCheck, Snowflake, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InquiryForm } from "./inquiry-form";

const facebookUrl = "https://www.facebook.com/people/Biomic-Whiz/pfbid02PNs8zZwW5siHXHmTu7XophkcC9ndLnwvJ4HKeLHvBz3dpTBjWivsf1sEFw8W2smAl/";

const contactNumbers = ["0917-317-7077", "0917-143-5344", "0927-6061-886", "0999-559-0930", "0915-729-7077", "8241-7227"];

const serviceCards = [
  {
    title: "Aircon Cleaning",
    description: "Deep cleaning service to improve cooling efficiency, airflow, and indoor comfort.",
    icon: Snowflake
  },
  {
    title: "Aircon Repair",
    description: "Professional repair support for cooling issues, leaks, noise, and system faults.",
    icon: Wrench
  },
  {
    title: "Aircon Installation",
    description: "Technical installation support for residential and commercial air conditioning units.",
    icon: ClipboardCheck
  },
  {
    title: "Preventive Maintenance",
    description: "Scheduled maintenance to help reduce breakdowns and maintain reliable operation.",
    icon: ShieldCheck
  },
  {
    title: "Troubleshooting and Diagnostics",
    description: "Inspection and diagnostic service to identify issues before repair or quotation.",
    icon: Wrench
  },
  {
    title: "Parts and Service Quotation",
    description: "Clear service assessment and quotation support for labor, parts, and recommended work.",
    icon: ClipboardCheck
  }
];

const reasons = [
  "Authorized Daikin service center",
  "Experienced aircon technicians",
  "Residential and commercial service support",
  "Clear quotation process",
  "Reliable scheduling",
  "Professional customer assistance"
];

const process = [
  "Send Inquiry",
  "Schedule Inspection or Service",
  "Receive Service Assessment / Quotation",
  "Technician Performs the Work",
  "Completion and Customer Confirmation"
];

export function HomePage() {
  return (
    <main className="bg-[#080808] text-white">
      <section className="relative isolate overflow-hidden border-b border-[#2b2417] bg-[#080808]">
        <div
          className="absolute inset-0 -z-10 opacity-45"
          style={{
            backgroundImage:
              "linear-gradient(135deg, transparent 0 46%, rgba(216,184,79,0.18) 46% 47%, transparent 47% 100%), radial-gradient(circle at 72% 25%, rgba(216,184,79,0.12), transparent 30%)"
          }}
        />
        <div className="absolute right-0 top-0 -z-10 h-full w-1/2 opacity-20 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" style={{ backgroundImage: "repeating-linear-gradient(120deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 28px)" }} />
        <div className="page-shell relative grid min-h-[calc(100vh-5rem)] items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-extrabold uppercase tracking-[0.22em] text-[#d8b84f]">BIOMIC WHIZ TRADING</p>
            <h1 className="text-5xl font-black uppercase leading-[0.95] tracking-normal text-white sm:text-6xl lg:text-7xl">
              Authorized Daikin Air Conditioner Service Center
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              Professional air conditioner service, maintenance, repair, and installation for residential and commercial clients in Manila.
            </p>
            <p className="mt-5 max-w-xl border-l-2 border-[#d8b84f] pl-4 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-200">
              Authorized Service Center for Daikin Air Conditioners
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="#inquiry" className="w-full sm:w-auto">
                <Button size="lg" className="w-full !bg-[#d8b84f] font-extrabold uppercase tracking-[0.12em] !text-black hover:!bg-[#f2d66b] sm:w-auto">
                  <Calendar className="h-5 w-5" />
                  Book a Service
                </Button>
              </Link>
              <Link href="#contact" className="w-full sm:w-auto">
                <Button size="lg" className="w-full border border-[#d8b84f]/45 bg-transparent font-extrabold uppercase tracking-[0.12em] text-[#f4d56d] hover:bg-[#171717] sm:w-auto">
                  Contact Us
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute inset-8 rounded-full border border-[#d8b84f]/25" />
            <div className="absolute inset-0 rotate-45 border border-[#d8b84f]/20 [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
            <img src="/biomic-logo.jpeg" alt="BIOMIC logo" className="relative z-10 aspect-square w-full rounded-full border border-[#caa84a]/40 object-cover shadow-[0_30px_90px_rgba(0,0,0,0.65)]" />
          </div>
        </div>
      </section>

      <section id="services" className="page-shell py-16 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#d8b84f]">Services</p>
          <h2 className="mt-3 text-3xl font-black uppercase text-white">Air conditioner service support</h2>
          <p className="mt-3 text-zinc-400">Reliable technical service for cleaning, repair, installation, diagnostics, maintenance, and quotation requests.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {serviceCards.map(({ title, description, icon: Icon }) => (
            <div key={title} className="group relative overflow-hidden rounded-lg border border-[#2b2417] bg-[#111111] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
              <div className="absolute right-0 top-0 h-20 w-20 border-l border-[#d8b84f]/20 bg-[#d8b84f]/5 [clip-path:polygon(100%_0,100%_100%,0_0)]" />
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-md border border-[#d8b84f]/40 bg-[#d8b84f]/10 text-[#f4d56d]">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
              <Link href="#inquiry" className="mt-5 inline-flex min-h-11 items-center gap-1 text-sm font-bold uppercase tracking-[0.12em] text-[#d8b84f]">
                Request service <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="relative border-y border-[#2b2417] bg-[#101010]">
        <div className="page-shell grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#d8b84f]">About</p>
            <h2 className="mt-3 text-3xl font-black uppercase leading-tight text-white sm:text-4xl">Professional Daikin air conditioner service in Manila.</h2>
          </div>
          <div className="grid gap-5 text-zinc-300">
            <p className="text-lg leading-8">
              BIOMIC WHIZ TRADING provides professional air conditioning services backed by technical experience and authorized Daikin service support.
            </p>
            <p className="leading-7">
              We help customers maintain reliable cooling through proper inspection, repair, cleaning, and scheduled maintenance for residential and commercial air conditioning systems.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-[#2b2417] bg-[#141414]">
        <div className="page-shell grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#d8b84f]">Why choose us</p>
            <h2 className="mt-3 text-3xl font-black uppercase text-white">Authorized, technical, and dependable.</h2>
            <p className="mt-4 leading-7 text-zinc-400">A premium service experience built around reliable scheduling, clear assessment, and professional customer assistance.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {reasons.map((item, index) => (
              <div key={item} className="border-l-2 border-[#d8b84f] bg-[#0d0d0d] p-5">
                <p className="text-sm font-black text-[#d8b84f]">0{index + 1}</p>
                <h3 className="mt-3 font-extrabold text-white">{item}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Service-focused support for customers who need dependable cooling and clear next steps.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-16 lg:py-24">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#d8b84f]">Process</p>
          <h2 className="mt-3 text-3xl font-black uppercase text-white">From inquiry to completion</h2>
          <p className="mt-3 max-w-2xl text-zinc-400">A clear service flow for bookings, assessments, quotations, technician work, and customer confirmation.</p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-5">
          {process.map((step, index) => (
            <div key={step} className="relative border border-[#2b2417] bg-[#101010] p-5">
              <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-full border border-[#d8b84f]/50 text-sm font-black text-[#f4d56d]">{index + 1}</div>
              <h3 className="font-extrabold uppercase tracking-[0.08em] text-white">{step}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">The service desk keeps each request organized for proper follow-through.</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="border-y border-[#2b2417] bg-[#101010]">
        <div className="page-shell py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#d8b84f]">Contact</p>
            <h2 className="mt-3 text-3xl font-black uppercase text-white">BIOMIC WHIZ TRADING</h2>
            <p className="mt-3 text-zinc-400">Authorized Daikin Air Conditioners Service Center</p>
          </div>

          <div className="mt-10 grid overflow-hidden rounded-xl border border-[#2b2417] bg-[#0b0b0b] lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-[#2b2417] p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-[#d8b84f]/40 bg-[#d8b84f]/10 text-[#f4d56d]">
                  <MapPin className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-xl font-extrabold uppercase tracking-[0.08em] text-white">Service Center Address</h3>
                  <p className="mt-3 leading-7 text-zinc-400">1959 B Gerardo Tuazon St., Sampaloc, Manila</p>
                </div>
              </div>
              <div className="mt-8 flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-[#d8b84f]/40 bg-[#d8b84f]/10 text-[#f4d56d]">
                  <Mail className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-xl font-extrabold uppercase tracking-[0.08em] text-white">Email</h3>
                  <a href="mailto:whiz.trading@yahoo.com" className="mt-3 block leading-7 text-zinc-400 hover:text-[#d8b84f]">whiz.trading@yahoo.com</a>
                </div>
              </div>
              <div className="mt-8 flex items-start gap-4">
                <div className="pl-16">
                  <h3 className="text-xl font-extrabold uppercase tracking-[0.08em] text-white">Facebook</h3>
                  <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label="Biomic Whiz on Facebook" className="mt-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#d8b84f]/45 bg-[#d8b84f] text-black hover:bg-[#f2d66b]">
                    <Facebook className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-[#d8b84f]/40 bg-[#d8b84f]/10 text-[#f4d56d]">
                  <Phone className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-xl font-extrabold uppercase tracking-[0.08em] text-white">Phone Numbers</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-500">Tap a number to call.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {contactNumbers.map((number) => (
                  <a
                    key={number}
                    href={`tel:${number.replaceAll("-", "")}`}
                    className="flex min-h-12 items-center rounded-md border border-[#2b2417] bg-[#111111] px-4 text-sm font-bold tracking-[0.08em] text-zinc-100 hover:border-[#d8b84f]/60 hover:text-[#d8b84f]"
                  >
                    {number}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="inquiry" className="page-shell grid gap-8 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
        <div className="grid content-start gap-5">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#d8b84f]">Inquiry form</p>
            <h2 className="mt-3 text-3xl font-black uppercase text-white">Book service or request a quotation</h2>
            <p className="mt-3 text-zinc-400">Submit your aircon service details and the team will review the inquiry with the existing reference and submission workflow.</p>
          </div>
          <div className="rounded-lg border border-[#2b2417] bg-[#111111] p-5">
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-[#d8b84f]" />
              <p className="text-sm text-zinc-400">
                <strong className="block text-white">Service Center</strong>
                1959 B Gerardo Tuazon St., Sampaloc, Manila
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Phone className="h-5 w-5 text-[#d8b84f]" />
              <p className="text-sm text-zinc-400">
                <strong className="block text-white">Primary Contact</strong>
                0917-317-7077
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <ClipboardCheck className="h-5 w-5 text-[#d8b84f]" />
              <p className="text-sm text-zinc-400">
                <strong className="block text-white">Submission Flow</strong>
                Existing validations and successful submission behavior are preserved.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#d8b84f]/25 bg-[#0b0b0b] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:p-7 [&_button[type=submit]]:!bg-[#d8b84f] [&_button[type=submit]]:!text-black [&_button[type=submit]]:hover:!bg-[#f2d66b] [&_input]:!border-[#3a321f] [&_input]:!bg-[#111111] [&_input]:!text-zinc-100 [&_input]:placeholder:!text-zinc-500 [&_label]:!text-zinc-100 [&_select]:!border-[#3a321f] [&_select]:!bg-[#111111] [&_select]:!text-zinc-100 [&_textarea]:!border-[#3a321f] [&_textarea]:!bg-[#111111] [&_textarea]:!text-zinc-100 [&_textarea]:placeholder:!text-zinc-500 [&_form>div:last-child]:!border-[#2b2417] [&_form>div:last-child_p]:!text-zinc-400">
          <InquiryForm hidePhotoUpload />
        </div>
      </section>
    </main>
  );
}
