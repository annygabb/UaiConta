# UaiConta

Painel financeiro pessoal em React + Vite + Tailwind, com:
- Onboarding que pede o PDF da fatura/conta, extrai os lançamentos e pergunta se há mais gastos (Pix, dinheiro, débito, boleto, crédito).
- **Duas formas de ler o PDF:**
  - **Leitura gratuita** — roda 100% no navegador com `pdf.js`, usando reconhecimento de padrões de texto (data + valor). Sem custo, sem chave de API, mas é uma estimativa: vale conferir antes de importar.
  - **Leitura com IA** — mais precisa, chama a API da Anthropic pelo backend (`api/extract.js`). Tem custo por uso e exige a variável `ANTHROPIC_API_KEY`.
- Comparativo automático de receitas e despesas mês a mês.
- Dashboard com gráficos, categorias e histórico de movimentações.

Os dados ficam salvos no `localStorage` do navegador (arquivo `src/storage.js`).

## Rodar localmente

```bash
npm install
npm run dev
```

A leitura gratuita de PDF já funciona localmente sem nenhuma configuração. Se quiser testar a leitura com IA:

```bash
cp .env.example .env.local   # cole sua chave em ANTHROPIC_API_KEY
```
> A rota `/api/extract` só funciona com `vercel dev` (ou já publicada na Vercel).

## Subir para o GitHub

```bash
git init
git add .
git commit -m "UaiConta: painel financeiro pessoal"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```
(Crie o repositório vazio antes em https://github.com/new — sem README, sem .gitignore, sem licença, para não conflitar com este push.)

## Publicar na Vercel

1. Acesse https://vercel.com/new e clique em **Import Git Repository**.
2. Selecione o repositório que você acabou de subir.
3. A Vercel detecta automaticamente que é um projeto Vite — não precisa mudar nada no build.
4. **Você pode clicar direto em Deploy sem configurar nada.** A leitura gratuita de PDF (client-side) funciona sem qualquer variável de ambiente.
5. Se quiser habilitar também a leitura com IA (mais precisa, mas paga por uso), abra **Environment Variables** e adicione:
   - `ANTHROPIC_API_KEY` = sua chave da Anthropic (gere em https://console.anthropic.com/settings/keys)
   - Depois clique em **Redeploy** para a variável entrar em vigor.

Se depois quiser trocar a chave, faça isso em **Project Settings → Environment Variables** e clique em **Redeploy**.

