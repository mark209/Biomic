import jsPDF from "jspdf";

export type PdfQuote = {
  quotation_number: string;
  customer_name: string;
  contact_number: string;
  email?: string | null;
  address: string;
  created_at?: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  notes?: string | null;
  terms?: string | null;
  prepared_by?: string | null;
  items: Array<{
    item_type: string;
    name_snapshot: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

const pageMargin = 14;
const pageBottom = 282;

function pdfMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return `PHP ${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function pdfDate(value: string | null | undefined) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(value ? new Date(value) : new Date());
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function splitLines(doc: jsPDF, text: string, width: number) {
  const lines = doc.splitTextToSize(text, width);
  return Array.isArray(lines) ? lines : [lines];
}

function writeWrappedText(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 5) {
  const lines = splitLines(doc, text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function addHeader(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.width;
  doc.setFillColor(0, 101, 144);
  doc.rect(0, 0, pageWidth, 12, "F");
}

function ensureSpace(doc: jsPDF, y: number, requiredHeight: number) {
  if (y + requiredHeight <= pageBottom) return y;
  doc.addPage();
  addHeader(doc);
  return 22;
}

export function downloadQuotationPdf(quote: PdfQuote) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let y = 18;

  addHeader(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Daikin Authorized Service Center", pageMargin, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Quotation", pageWidth - pageMargin, y, { align: "right" });
  y += 10;

  doc.setFontSize(11);
  doc.text(`Quotation No: ${quote.quotation_number}`, pageMargin, y);
  doc.text(`Date: ${pdfDate(quote.created_at)}`, pageWidth - pageMargin, y, { align: "right" });
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Customer Details", pageMargin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(quote.customer_name, pageMargin, y);
  y += 6;
  doc.text(quote.contact_number, pageMargin, y);
  y += 6;
  if (quote.email) {
    doc.text(quote.email, pageMargin, y);
    y += 6;
  }
  y = writeWrappedText(doc, quote.address, pageMargin, y, pageWidth - pageMargin * 2) + 8;

  doc.setFont("helvetica", "bold");
  doc.text("Item", pageMargin, y);
  doc.text("Qty", 118, y);
  doc.text("Unit", 138, y);
  doc.text("Total", pageWidth - pageMargin, y, { align: "right" });
  y += 3;
  doc.line(pageMargin, y, pageWidth - pageMargin, y);
  y += 7;
  doc.setFont("helvetica", "normal");

  quote.items.forEach((item) => {
    const itemLines = splitLines(doc, item.name_snapshot, 92);
    y = ensureSpace(doc, y, Math.max(8, itemLines.length * 5) + 2);
    doc.text(itemLines, pageMargin, y);
    doc.text(String(item.quantity), 118, y);
    doc.text(pdfMoney(item.unit_price), 138, y);
    doc.text(pdfMoney(item.line_total), pageWidth - pageMargin, y, { align: "right" });
    y += Math.max(8, itemLines.length * 5);
  });

  y += 4;
  y = ensureSpace(doc, y, 34);
  doc.line(118, y, pageWidth - pageMargin, y);
  y += 8;
  doc.text("Subtotal", 138, y);
  doc.text(pdfMoney(quote.subtotal), pageWidth - pageMargin, y, { align: "right" });
  y += 7;
  doc.text("Discount", 138, y);
  doc.text(pdfMoney(quote.discount), pageWidth - pageMargin, y, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total", 138, y);
  doc.text(pdfMoney(quote.grand_total), pageWidth - pageMargin, y, { align: "right" });
  y += 14;

  y = ensureSpace(doc, y, 52);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Notes", pageMargin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  y = writeWrappedText(doc, quote.notes || "Thank you for choosing our authorized service center.", pageMargin, y, pageWidth - pageMargin * 2) + 6;
  y = ensureSpace(doc, y, 32);
  doc.setFont("helvetica", "bold");
  doc.text("Terms and Conditions", pageMargin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  y = writeWrappedText(doc, quote.terms || "Quotation is subject to site inspection and parts availability.", pageMargin, y, pageWidth - pageMargin * 2) + 10;
  y = ensureSpace(doc, y, 10);
  doc.text(`Prepared by: ${quote.prepared_by && !isUuid(quote.prepared_by) ? quote.prepared_by : "Service Center Staff"}`, pageMargin, y);

  doc.save(`${quote.quotation_number}.pdf`);
}
