# Security & Quality Review — UaiConta V7

## PASS — código e infraestrutura validados

- produção não usa fallback local silencioso;
- frontend não contém `service_role` nem valores de chaves administrativas;
- CI possui varredura de padrões de segredo e arquivos locais indevidos;
- RLS está habilitado nas tabelas financeiras expostas e as policies usam ownership por `auth.uid()`;
- UPDATE possui `USING` + `WITH CHECK` onde aplicável;
- bucket `financial-documents` é privado e as Storage Policies isolam o primeiro segmento da pasta pelo usuário;
- MIME e tamanho de documentos são validados;
- dinheiro é armazenado em centavos inteiros;
- recorrências futuras permanecem `planned` até confirmação;
- transferências não entram como receita/despesa global;
- CSP, `frame-ancestors 'none'`, `nosniff`, Referrer Policy e Permissions Policy estão configurados no deploy web;
- Edge Function `delete-account` mantém `service_role` apenas no runtime server-side, deriva o usuário do JWT validado e exige confirmação explícita;
- `delete-account` aceita somente origens conhecidas do UaiConta, `POST` e JSON, com resposta `no-store`;
- Edge Function `delete-account` versão 2 foi publicada com verificação JWT ativa;
- migration V7 de índices relacionais foi aplicada no projeto Supabase real;
- o Advisor de performance deixou de apontar foreign keys sem índice; avisos atuais de `unused index` são informativos e esperados em projeto novo com pouco histórico de consultas;
- Dependabot e CODEOWNERS foram adicionados ao repositório;
- `DESIGN.md` define acessibilidade, estabilidade de layout, responsividade e reduced motion como critérios de aceite da UI.

## CI — bloqueios para merge

A branch V7 deve passar, no mesmo commit candidato a merge:

- lint;
- TypeScript typecheck;
- testes unitários;
- baseline de segurança + secret scan;
- build;
- `npm audit --audit-level=high`;
- E2E desktop;
- E2E mobile;
- matriz responsiva;
- acessibilidade com axe.

Não considerar uma execução anterior suficiente depois de alterar código, migration ou configuração sensível.

## WARNING / LIMITAÇÕES CONHECIDAS

- O Advisor de segurança do Supabase informa `Leaked Password Protection Disabled`. O recurso de bloqueio via HaveIBeenPwned é disponibilizado pelo Supabase no plano Pro e acima; não foi ativado para evitar introduzir custo sem aprovação. O frontend continua exigindo senha forte, mas isso não substitui a proteção server-side contra senhas vazadas.
- A validação RLS multiusuário com dois usuários reais deve permanecer como teste operacional periódico; testes estáticos não substituem prova de isolamento em ambiente real.
- `unused index` não deve motivar remoção imediata em banco recém-criado. Reavaliar após existir carga representativa e estatísticas reais.
- A conexão GitHub disponível para automação não expõe escrita de branch protection/rulesets; CODEOWNERS + PR + CI reduzem risco, mas a proteção administrativa da `main` deve ser habilitada no GitHub quando disponível.

## Política de publicação

1. revisar o diff e classificar achados por severidade;
2. corrigir problemas reais sem abstrações desnecessárias;
3. executar novamente toda a suíte no commit final;
4. confirmar Preview Vercel `READY` e ausência de erros de runtime;
5. somente então mergear para `main`;
6. confirmar deploy de produção `READY` e smoke test das rotas críticas.

## FAIL

Nenhum FAIL crítico conhecido no momento desta revisão. Qualquer falha nova no CI, advisor de segurança crítico ou erro de Preview bloqueia o merge até correção e reteste.
