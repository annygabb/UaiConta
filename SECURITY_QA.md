# Security & Quality Review — UaiConta V4

## PASS — revisão estática

- produção não usa fallback local silencioso;
- frontend não contém `service_role`;
- PDF não contém Anthropic/Claude API;
- RLS habilitado nas tabelas do app;
- policies usam `TO authenticated` + ownership;
- UPDATE possui `USING` + `WITH CHECK`;
- bucket `financial-documents` é privado;
- Storage Policies limitam o primeiro segmento da pasta ao `auth.uid()`;
- MIME e tamanho de documentos são validados;
- dinheiro é armazenado em centavos;
- recorrências futuras permanecem `planned`;
- transferências não entram como receita/despesa global;
- reduced motion e safe areas estão previstos;
- testes unitários, baseline estático de segurança, E2E, responsividade e axe foram criados.
- Edge Function `delete-account` mantém `service_role` somente no runtime server-side e deriva o usuário do JWT verificado.

## WARNING — exige ambiente externo

- executar schema/migrations e fazer deploy da Edge Function `delete-account` em Supabase real;
- validar RLS com dois usuários reais;
- executar `npm audit` após instalação;
- executar Lighthouse em deploy;
- validar PWA em Android/iOS;
- gerar/commitar lockfile via CI porque npm local ficou indisponível.

## FAIL

Nenhum FAIL crítico conhecido na revisão estática atual. Qualquer FAIL encontrado pelo CI deve ser corrigido antes de mergear a branch V4.
