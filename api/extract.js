import { CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "../src/constants.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "ANTHROPIC_API_KEY não configurada no servidor. Adicione essa variável de ambiente no painel da Vercel (Project Settings → Environment Variables) e faça um novo deploy.",
    });
    return;
  }

  const { base64Data } = req.body || {};
  if (!base64Data || typeof base64Data !== "string") {
    res.status(400).json({ error: "Nenhum arquivo PDF recebido." });
    return;
  }

  const instructions =
    "Você recebe um PDF de fatura, extrato bancário ou conta de consumo em português do Brasil. " +
    "Extraia cada lançamento/cobrança individual e responda APENAS com um JSON válido (sem markdown, sem texto antes ou depois), " +
    'no formato: {"transactions":[{"description":string,"amount":number positivo,"date":"YYYY-MM-DD","category":string,"paymentMethod":string,"type":"despesa"|"receita"}]}. ' +
    `Use como categoria uma destas quando fizer sentido: ${CATEGORIES.join(", ")}, ou ${INCOME_CATEGORIES.join(", ")} para receitas. Caso nenhuma combine bem, use "Gastos gerais". ` +
    `Use como forma de pagamento uma destas: ${PAYMENT_METHODS.join(", ")}. Se o documento não deixar claro a forma de pagamento, infira pelo tipo de documento (ex: fatura de cartão de crédito → "Cartão de crédito", boleto → "Boleto", conta de consumo → "Boleto") ou use "Pix" como padrão razoável. ` +
    'Se não conseguir identificar a data exata de um item, use a data de vencimento ou de emissão do documento. Se não houver nenhum lançamento identificável, responda {"transactions":[]}.';

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } },
              { type: "text", text: instructions },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: "Erro da API da Anthropic: " + errText });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Falha ao chamar a API da Anthropic: " + (err?.message || "erro desconhecido") });
  }
}
