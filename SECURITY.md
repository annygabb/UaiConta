# Segurança — UaiConta

## Repositório público

O código é público, mas credenciais e configurações privadas não fazem parte do repositório. URLs privadas, tokens, chaves administrativas, arquivos `.env`, credenciais da Vercel/Supabase e arquivos de chave devem permanecer somente nos gerenciadores de ambiente apropriados.

A chave `service_role` nunca pode ser enviada ao navegador. A Edge Function lê `SUPABASE_SERVICE_ROLE_KEY` apenas do runtime seguro do Supabase. O frontend recebe somente configuração pública necessária em tempo de build, via variáveis de ambiente da Vercel.

## Reportar vulnerabilidade

Não publique dados reais, tokens, extratos, notas fiscais ou detalhes exploráveis em issues públicas. Entre em contato com a mantenedora pelo perfil do repositório para combinar um canal privado antes de divulgar uma falha.

## Modelo de segurança

- produção exige Supabase;
- frontend não contém valores de chaves administrativas;
- tabelas financeiras possuem RLS;
- policies verificam ownership por usuário;
- documentos usam bucket privado e signed URLs de curta duração;
- arquivos são validados por MIME e tamanho;
- conteúdo financeiro integral não deve ser enviado para logs;
- sessão é validada/renovada antes de reutilizar tokens persistidos;
- CI executa baseline de RLS, auditoria de dependências e detecção de padrões de segredo;
- Dependabot acompanha atualizações de dependências.

## Checklist para mudanças

- revisar RLS de SELECT/INSERT/UPDATE/DELETE;
- UPDATE precisa de `USING` e `WITH CHECK`;
- testar usuário A contra dados de usuário B em ambiente Supabase real;
- executar `npm run test:security` e `npm audit`;
- não usar metadata editável pelo usuário para autorização;
- nunca commitar `.env`, tokens, chaves privadas ou configurações locais da Vercel/Supabase;
- revisar dependências e lockfile.
