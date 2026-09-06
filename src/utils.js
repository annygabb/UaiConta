export function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function money(value = 0) {
  const n = Number(value) || 0;
  return (n < 0 ? "-" : "") + "R$ " + Math.abs(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function pct(value = 0, signed = true) {
  const n = Number(value) || 0;
  return `${signed && n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function isoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthKey(dateOrString = new Date()) {
  if (typeof dateOrString === "string") return dateOrString.slice(0, 7);
  return `${dateOrString.getFullYear()}-${String(dateOrString.getMonth() + 1).padStart(2, "0")}`;
}

export function monthDate(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export function addMonthsToKey(key, amount) {
  const date = monthDate(key);
  date.setMonth(date.getMonth() + amount);
  return monthKey(date);
}

export function periodLabel(key) {
  const date = monthDate(key);
  const text = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function shortMonthLabel(key) {
  return monthDate(key).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

export function dateLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

export function parseCurrencyInput(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}

export function currencyInput(value) {
  const n = typeof value === "string" ? parseCurrencyInput(value) : Number(value || 0);
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function normalizeDescription(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
