export function makeClientReference(prefix = "DAI") {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
}

export function makeDateScopedReference(prefix: "DAI" | "QT") {
  const now = new Date();
  const year = now.getFullYear();
  const stamp = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${stamp}-${random}`;
}
