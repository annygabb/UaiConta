import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "./constants.js";
import { isoDate, normalizeDescription, uid } from "./utils.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const MONTHS_PT = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

const INCOME_KEYWORDS = [
  "recebido", "recebida", "salário", "salario", "depósito", "deposito",
  "estorno", "reembolso", "transferência recebida", "transferencia recebida",
  "crédito em conta", "credito em conta", "rendimento", "cashback",
];

const CATEGORY_KEYWORDS = {
  Supermercado: ["supermercado", "mercado", "atacad", "hortifruti"],
  Alimentação: ["restaurante", "lanchonete", "ifood", "padaria", "pizzaria", "cafe", "café"],
  Transporte: ["uber", "99app", "posto", "combustivel", "combustível", "estacionamento", "pedagio", "pedágio"],
  Faculdade: ["faculdade", "universidade", "mensalidade escolar", "curso"],
  Saúde: ["farmacia", "farmácia", "hospital", "clinica", "clínica", "laboratorio", "laboratório"],
  Psicóloga: ["psicolog"],
  Personal: ["personal trainer", "academia", "personal"],
  Lazer: ["cinema", "streaming", "netflix", "spotify", "teatro"],
  Diversão: ["bar ", "balada", "show", "evento"],
};

const PAYMENT_KEYWORDS = {
  Pix: ["pix"],
  "Cartão de crédito": ["cartao de credito", "cartão de crédito", "credito", "crédito", "fatura"],
  "Cartão de débito": ["cartao de debito", "cartão de débito", "debito", "débito"],
  Dinheiro: ["dinheiro", "especie", "espécie", "saque"],
  Boleto: ["boleto", "conta de consumo", "concessionaria", "concessionária"],
};

function guessFromKeywords(text, dict, fallback) {
  const lower = text.toLowerCase();
  for (const [label, words] of Object.entries(dict)) {
    if (words.some((word) => lower.includes(word))) return { label, matched: true };
  }
  return { label: fallback, matched: false };
}

export function normalizeAmount(raw) {
  const cleaned = String(raw).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? Math.abs(number) : null;
}

export function normalizeDate(raw, referenceYear = new Date().getFullYear()) {
  const value = String(raw).trim();
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const [, day, month, yearRaw] = slash;
    let year = yearRaw ? Number(yearRaw) : referenceYear;
    if (year < 100) year += 2000;
    const date = new Date(year, Number(month) - 1, Number(day));
    if (!Number.isNaN(date.getTime())) return isoDate(date);
  }
  const monthName = value.match(/^(\d{1,2})\s*(?:de\s*)?([a-zç]{3})/i);
  if (monthName) {
    const [, day, monthRaw] = monthName;
    const month = MONTHS_PT[monthRaw.toLowerCase().slice(0, 3)];
    if (month) {
      const date = new Date(referenceYear, Number(month) - 1, Number(day));
      if (!Number.isNaN(date.getTime())) return isoDate(date);
    }
  }
  return null;
}

async function extractRawText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = "";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    fullText += `${content.items.map((item) => item.str).join(" ")}\n`;
  }
  return fullText;
}

export function transactionFingerprint(transaction) {
  return [
    transaction.date,
    Number(transaction.amount || 0).toFixed(2),
    normalizeDescription(transaction.description),
    transaction.paymentMethod || "",
  ].join("|");
}

export function markPossibleDuplicates(imported, existing = []) {
  const existingKeys = new Set(existing.map(transactionFingerprint));
  const batchKeys = new Set();
  return imported.map((item) => {
    const key = transactionFingerprint(item);
    const duplicate = existingKeys.has(key) || batchKeys.has(key);
    batchKeys.add(key);
    return { ...item, __possibleDuplicate: duplicate };
  });
}

export function parseFinancialText(text, options = {}) {
  const referenceYear = options.referenceYear || new Date().getFullYear();
  const sourceFile = options.sourceFile || "";
  const dateAnchor = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}\s*(?:de\s*)?[a-zç]{3,9})/gi;
  const amountPattern = /-?R?\$?\s?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}/g;

  const anchors = [];
  let match;
  while ((match = dateAnchor.exec(text)) !== null) anchors.push({ index: match.index, value: match[0] });

  const rows = [];
  for (let index = 0; index < anchors.length; index += 1) {
    const start = anchors[index].index;
    const end = index + 1 < anchors.length ? anchors[index + 1].index : text.length;
    const dateRaw = anchors[index].value;
    const chunk = text.slice(start, end);
    const amounts = chunk.match(amountPattern);
    if (!amounts?.length) continue;

    const amountRaw = amounts[amounts.length - 1];
    const amount = normalizeAmount(amountRaw);
    const date = normalizeDate(dateRaw, referenceYear);
    if (!amount || !date) continue;

    const description = chunk
      .replace(dateRaw, "")
      .replace(amountRaw, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140) || "Lançamento importado";

    const lower = description.toLowerCase();
    const type = INCOME_KEYWORDS.some((keyword) => lower.includes(keyword)) ? "receita" : "despesa";
    const categoryGuess = type === "receita"
      ? { label: INCOME_CATEGORIES.includes("Outras receitas") ? "Outras receitas" : INCOME_CATEGORIES[0], matched: false }
      : guessFromKeywords(description, CATEGORY_KEYWORDS, "Gastos gerais");
    const paymentGuess = guessFromKeywords(description, PAYMENT_KEYWORDS, "Pix");

    const matchedSignals = Number(categoryGuess.matched) + Number(paymentGuess.matched) + Number(description.length > 5);
    const confidence = matchedSignals >= 3 ? "alta" : matchedSignals === 2 ? "media" : "baixa";

    rows.push({
      id: uid(),
      type,
      amount,
      description,
      category: type === "receita"
        ? categoryGuess.label
        : (CATEGORIES.includes(categoryGuess.label) ? categoryGuess.label : "Gastos gerais"),
      paymentMethod: PAYMENT_METHODS.includes(paymentGuess.label) ? paymentGuess.label : "Pix",
      date,
      isRecurring: false,
      notes: "",
      source: "pdf",
      sourceFile,
      confidence,
      __imported: true,
      __method: "local-pdfjs",
    });
  }

  const seen = new Set();
  return rows.filter((item) => {
    const key = transactionFingerprint(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Leitura 100% local: nenhum PDF é enviado para serviços externos. */
export async function extractTransactionsFromPDFFree(file) {
  if (!file || (file.type !== "application/pdf" && !file.name?.toLowerCase().endsWith(".pdf"))) throw new Error("Selecione um arquivo PDF válido.");
  // Limite por arquivo protege memória; não existe limite de quantidade de PDFs na fila.
  if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name}: o PDF ultrapassa 25 MB.`);
  const text = await extractRawText(file);
  return parseFinancialText(text, { sourceFile: file.name });
}
