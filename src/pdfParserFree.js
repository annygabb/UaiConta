import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { CATEGORIES, PAYMENT_METHODS } from "./constants.js";

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
  Lazer: ["cinema", "streaming", "netflix", "spotify"],
  Diversão: ["bar ", "balada", "show"],
  Investimentos: ["aplicação", "aplicacao", "investimento", "corretora", "tesouro"],
};

const PAYMENT_KEYWORDS = {
  Pix: ["pix"],
  "Cartão de crédito": ["cartao de credito", "cartão de crédito", "credito", "crédito"],
  "Cartão de débito": ["cartao de debito", "cartão de débito", "debito", "débito"],
  Dinheiro: ["dinheiro", "especie", "espécie", "saque"],
  Boleto: ["boleto", "fatura", "conta de consumo", "concessionaria", "concessionária"],
};

function guessFromKeywords(text, dict, fallback) {
  const lower = text.toLowerCase();
  for (const [label, words] of Object.entries(dict)) {
    if (words.some((w) => lower.includes(w))) return label;
  }
  return fallback;
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function normalizeAmount(raw) {
  const cleaned = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.abs(n) : null;
}

function normalizeDate(raw, referenceYear) {
  // dd/mm/yyyy ou dd/mm
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const [, d, m, y] = slash;
    let year = y ? Number(y) : referenceYear;
    if (year < 100) year += 2000;
    const date = new Date(year, Number(m) - 1, Number(d));
    if (!Number.isNaN(date.getTime())) return isoDate(date);
  }
  // "10 ago" ou "10 de agosto"
  const monthName = raw.match(/^(\d{1,2})\s*(?:de\s*)?([a-zç]{3})/i);
  if (monthName) {
    const [, d, monAbbr] = monthName;
    const key = monAbbr.toLowerCase().slice(0, 3);
    if (MONTHS_PT[key]) {
      const date = new Date(referenceYear, Number(MONTHS_PT[key]) - 1, Number(d));
      if (!Number.isNaN(date.getTime())) return isoDate(date);
    }
  }
  return null;
}

/**
 * Extrai o texto de todas as páginas do PDF usando pdf.js, 100% no navegador.
 */
async function extractRawText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lineText = content.items.map((it) => it.str).join(" ");
    fullText += lineText + "\n";
  }
  return fullText;
}

/**
 * Parser heurístico (regex) que roda inteiramente no navegador — sem IA,
 * sem chave de API, sem custo. Menos preciso que a leitura por IA, mas
 * gratuito e funciona offline após o PDF ser carregado.
 */
export async function extractTransactionsFromPDFFree(file) {
  const text = await extractRawText(file);
  const referenceYear = new Date().getFullYear();

  // Quebra em "linhas" por padrões de data, já que pdf.js às vezes junta tudo numa string só.
  const dateAnchor = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}\s*(?:de\s*)?[a-zç]{3,9})/gi;
  const amountPattern = /-?R?\$?\s?\d{1,3}(?:\.\d{3})*,\d{2}/g;

  const segments = [];
  let match;
  const anchors = [];
  while ((match = dateAnchor.exec(text)) !== null) {
    anchors.push({ index: match.index, value: match[0] });
  }
  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].index;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : text.length;
    segments.push({ dateRaw: anchors[i].value, chunk: text.slice(start, end) });
  }

  const results = [];
  segments.forEach(({ dateRaw, chunk }) => {
    const amounts = chunk.match(amountPattern);
    if (!amounts || amounts.length === 0) return;
    const amountRaw = amounts[amounts.length - 1]; // pega o último valor monetário do trecho
    const amount = normalizeAmount(amountRaw);
    const date = normalizeDate(dateRaw.trim(), referenceYear);
    if (!amount || amount <= 0 || !date) return;

    const description = chunk
      .replace(dateRaw, "")
      .replace(amountRaw, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "Lançamento importado";

    const type = INCOME_KEYWORDS.some((k) => description.toLowerCase().includes(k)) ? "receita" : "despesa";
    const category = type === "receita"
      ? "Outras receitas"
      : guessFromKeywords(description, CATEGORY_KEYWORDS, "Gastos gerais");
    const paymentMethod = guessFromKeywords(description, PAYMENT_KEYWORDS, "Pix");

    results.push({
      id: uid(),
      type,
      amount,
      description,
      category: type === "receita" ? category : (CATEGORIES.includes(category) ? category : "Gastos gerais"),
      paymentMethod: PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : "Pix",
      date,
      isRecurring: false,
      notes: "",
      __imported: true,
      __method: "free",
    });
  });

  // remove duplicados óbvios (mesma data + valor + descrição)
  const seen = new Set();
  return results.filter((t) => {
    const key = `${t.date}|${t.amount}|${t.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
