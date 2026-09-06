# Security & Quality Review — UaiConta 2.0

## Status da revisão implementada

| Área | Status | Evidência |
|---|---|---|
| Anthropic removido | PASS | `api/extract.js` removido; PDF usa apenas `pdf.js` |
| Separação de domínio financeiro | PASS | `receita`, `despesa`, `investimento`, `transferencia` |
| Transferência não distorce métricas | PASS | testes em `tests/unit/finance.test.js` |
| Unit tests | PASS | `npm test` — 8 testes passando durante esta revisão |
| Banco real preparado | PASS | `supabase/schema.sql` |
| RLS | PASS | policies por `auth.uid()` em tabelas financeiras |
| Segredo no client | PASS | apenas URL e anon key do Supabase; nenhuma service-role key |
| PDF múltiplo | PASS | `multiple`, fila sequencial, revisão por arquivo |
| Duplicidade de PDF | PASS | fingerprint de data + valor + descrição + pagamento |
| CSP/headers | PASS | `vercel.json` |
| Responsividade planejada | PASS | breakpoints desktop/tablet/mobile/320px |
| Reduced motion | PASS | CSS `prefers-reduced-motion` |
| E2E | WARNING | specs Playwright criadas; requer `npm install` + browser Playwright no ambiente de execução |
| Build final | WARNING | instalação de pacotes não concluiu neste ambiente por timeout de rede; validar com `npm install && npm run build` local/CI |
| Acessibilidade automatizada | WARNING | foco/labels/semântica implementados; axe/Lighthouse ainda devem rodar em CI |

## Checklist de segurança para produção

- [ ] Confirmar e-mail habilitado no Supabase Auth.
- [ ] Revisar políticas RLS após qualquer nova tabela.
- [ ] Nunca adicionar `SUPABASE_SERVICE_ROLE_KEY` ao frontend.
- [ ] Executar `npm audit` no CI.
- [ ] Executar E2E com usuário A e usuário B para confirmar isolamento real.
- [ ] Validar CSP no domínio final.
- [ ] Configurar backup/recovery do Supabase.
- [ ] Se futuramente houver backend próprio, adicionar rate limiting server-side.

## Breakpoints que devem entrar na matriz visual de QA

`320`, `360`, `375`, `390`, `414`, `768`, `1024`, `1280`, `1440`, `1920` px.
