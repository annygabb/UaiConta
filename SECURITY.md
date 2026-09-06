# Segurança — UaiConta

## Reportar vulnerabilidade

Não publique dados reais, tokens, extratos, notas fiscais ou detalhes exploráveis em issues públicas. Entre em contato com a mantenedora pelo perfil do repositório para combinar um canal privado antes de divulgar uma falha.

## Modelo de segurança

- produção exige Supabase;
- frontend usa apenas chave pública/publishable/anon apropriada;
- `service_role` nunca deve ser enviada ao navegador;
- tabelas financeiras possuem RLS;
- policies verificam ownership;
- documentos usam bucket privado e signed URLs;
- arquivos são validados por MIME e tamanho;
- conteúdo financeiro integral não deve ser enviado para logs.

## Checklist para mudanças

- revisar RLS de SELECT/INSERT/UPDATE/DELETE;
- UPDATE precisa de `USING` e `WITH CHECK`;
- testar usuário A contra dados de usuário B em ambiente Supabase real;
- executar `npm run test:security` e `npm audit`;
- não usar metadata editável pelo usuário para autorização;
- revisar dependências e lockfile.
