# Finance OS

Painel financeiro pessoal em React + Vite + Tailwind, com:
- Onboarding que pede o PDF da fatura/conta, extrai os lançamentos via IA e pergunta se há mais gastos (Pix, dinheiro, débito, boleto, crédito).
- Comparativo automático de receitas e despesas mês a mês.
- Dashboard com gráficos, categorias e histórico de movimentações.

Os dados ficam salvos no `localStorage` do navegador (arquivo `src/storage.js`).
A extração de PDF roda em `api/extract.js`, uma função serverless que chama a API da Anthropic **no servidor**, usando a variável de ambiente `ANTHROPIC_API_KEY` — a chave nunca fica exposta no navegador.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # depois cole sua chave em ANTHROPIC_API_KEY
npm run dev
```

> A rota `/api/extract` só funciona com `vercel dev` (ou já publicada na Vercel).
> Rodando só com `npm run dev`, o app funciona normalmente, mas o botão de importar PDF não terá o backend disponível localmente a menos que use `vercel dev`.

## Subir para o GitHub

```bash
git init
git add .
git commit -m "Finance OS: painel financeiro pessoal"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```
(Crie o repositório vazio antes em https://github.com/new — sem README, sem .gitignore, sem licença, para não conflitar com este push.)

## Publicar na Vercel

1. Acesse https://vercel.com/new e clique em **Import Git Repository**.
2. Selecione o repositório que você acabou de subir.
3. A Vercel detecta automaticamente que é um projeto Vite — não precisa mudar nada no build.
4. Antes de clicar em **Deploy**, abra **Environment Variables** e adicione:
   - `ANTHROPIC_API_KEY` = sua chave da Anthropic (gere em https://console.anthropic.com/settings/keys)
5. Clique em **Deploy**. Em ~1 minuto seu painel estará no ar em `https://SEU-PROJETO.vercel.app`.

Se depois quiser trocar a chave, faça isso em **Project Settings → Environment Variables** e clique em **Redeploy**.
