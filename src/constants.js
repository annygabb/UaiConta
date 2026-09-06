export const EXPENSE_CATEGORIES = [
  "Transporte", "Faculdade", "Psicóloga", "Personal", "Supermercado",
  "Alimentação", "Saúde", "Diversão", "Lazer", "Gastos gerais",
];

// Mantido por compatibilidade com o parser antigo.
export const CATEGORIES = EXPENSE_CATEGORIES;

export const INCOME_CATEGORIES = [
  "Salário", "Freelance", "Comissão", "Venda", "Reembolso", "Rendimento", "Outras receitas",
];

export const INVESTMENT_CATEGORIES = [
  "Reserva de emergência", "Renda fixa", "Tesouro", "Fundos", "Ações", "Cripto", "Outros investimentos",
];

export const PAYMENT_METHODS = [
  "Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Boleto", "Transferência",
];

export const TRANSACTION_TYPES = [
  { value: "despesa", label: "Despesa" },
  { value: "receita", label: "Receita" },
  { value: "investimento", label: "Investimento" },
  { value: "transferencia", label: "Transferência" },
];

export const ROUTES = {
  dashboard: "/dashboard",
  transactions: "/movimentacoes",
  analytics: "/analises",
  more: "/mais",
  income: "/receitas",
  expenses: "/despesas",
  investments: "/investimentos",
  savings: "/economia",
};
