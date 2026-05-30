import { InquiryForm } from "@/components/public/inquiry-form";
import { PublicLayout } from "@/components/public/public-layout";

export default function RequestQuotationPage() {
  return (
    <PublicLayout>
      <main className="page-shell py-14">
        <div className="mb-8 max-w-3xl">
          <h1 className="text-4xl font-extrabold text-ink">Request Quotation / Service Inquiry</h1>
          <p className="mt-4 leading-7 text-muted">
            Provide the service details below. The system generates a reference number after submission and creates an inquiry record for staff review.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white p-5 shadow-panel sm:p-7">
          <InquiryForm />
        </div>
      </main>
    </PublicLayout>
  );
}
