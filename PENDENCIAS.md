# Pendências e matriz de estabilização — UaiConta V4

Este arquivo é propositalmente honesto: uma feature só muda para **OK** depois de existir ponta a ponta e ser verificada.

## EXTREMAMENTE

| ID | Estado | Item |
|---|---|---|
| EXT-01 | PARCIAL | Executar migrations em um projeto Supabase real e validar todos os CRUDs com RLS. O código/schema está preparado, mas este ambiente não possui credenciais do projeto. |
| EXT-02 | PARCIAL | Teste real multiusuário: usuário A não pode ler/editar arquivos ou linhas do usuário B. Há policies e teste estático; falta teste contra backend real. |
| EXT-03 | PARCIAL | Edge Function `delete-account` aprovada e implementada em TypeScript. Falta deploy e teste real no projeto Supabase antes de classificar como OK. |

## ALTO

| ID | Estado | Item |
|---|---|---|
| ALT-01 | EM VALIDAÇÃO | Gerar e versionar `package-lock.json` no CI porque o registry npm ficou indisponível neste ambiente local. |
| ALT-02 | EM VALIDAÇÃO | Rodar build/typecheck/lint/unit/security/E2E no GitHub Actions, corrigir qualquer falha encontrada e depois validar integração com Supabase real. |
| ALT-03 | PARCIAL | OCR em PDFs digitalizados depende de renderização/qualidade do documento; original é preservado e OCR não bloqueia salvamento. |
| ALT-04 | PARCIAL | Recorrência projeta e permite confirmar/pular ocorrências; ainda falta UX completa de edição/exclusão “esta / próximas / toda série”. |
| ALT-05 | PARCIAL | Parcelamento tem modelo de dados e divisão exata de centavos, mas ainda falta fluxo completo no formulário e persistência ponta a ponta. |
| ALT-06 | PARCIAL | Subcategorias existem no banco, mas ainda falta CRUD/seleção completos na interface. |
| ALT-07 | PARCIAL | Notas permitem upload/download e OCR; viewer avançado com zoom/pan/fullscreen ainda falta. |

## MÉDIO

- validar Lighthouse/Core Web Vitals em deploy real;
- expandir E2E de upload de câmera em dispositivos físicos;
- testar PWA/iOS/Android reais e ciclo de atualização do service worker;
- adicionar testes visuais de regressão se o volume de UI crescer;
- aprofundar busca de notas por itens no backend para bases grandes.

## OK / IMPLEMENTADO NA BASE V4

- TypeScript strict e arquitetura por features;
- `@supabase/supabase-js`;
- React Router;
- modo Demo explícito e produção sem fallback silencioso;
- bigint/centavos para dinheiro;
- métricas realizadas x previstas centralizadas;
- recorrência híbrida `planned`;
- utilitário de distribuição exata de centavos para parcelas;
- base SQL para subcategorias;
- dashboard/analytics derivados dos dados;
- PDF local sem Anthropic;
- múltiplos PDFs + fila + revisão + duplicidade;
- documentos PDF/imagem/câmera;
- OCR open source;
- Storage privado + signed URL;
- download do original;
- PWA base;
- testes unitários, baseline estático de segurança e E2E criados;
- licença, contribuição e política de segurança.
