export type QuoteLine = {
  quantity: number;
  unit_price: number;
};

export function lineTotal(line: QuoteLine) {
  return Number(line.quantity || 0) * Number(line.unit_price || 0);
}

export function quoteTotals(lines: QuoteLine[], discount = 0) {
  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const safeDiscount = Math.max(0, Math.min(Number(discount || 0), subtotal));
  return {
    subtotal,
    discount: safeDiscount,
    grandTotal: subtotal - safeDiscount
  };
}
