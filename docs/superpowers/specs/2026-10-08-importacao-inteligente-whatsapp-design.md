# UaiConta — Importação inteligente e WhatsApp

**Data:** 08/10/2026  
**Status:** desenho aprovado  
**Destino:** projeto open source e self-hosted `annygabb/UaiConta`

## Objetivo

Fazer o UaiConta transformar extratos, notas fiscais e mensagens do WhatsApp em movimentações financeiras confiáveis, revisáveis e corretamente separadas por data, mês, tipo e categoria, sem exigir serviços pagos para o funcionamento básico.

O primeiro valor entregue ao usuário deve acontecer em poucos minutos: importar um documento real e visualizar receitas e despesas nos meses corretos, sem alterar saldos antes da confirmação.

## Posicionamento do produto

O UaiConta é um controle financeiro pessoal open source. A instância `uaiconta.vercel.app` pertence à mantenedora. Outras pessoas clonam o repositório, criam o próprio Supabase, configuram a própria hospedagem e, opcionalmente, vinculam o próprio WhatsApp Business.

O código permanece gratuito e sem limites artificiais. Limites e custos de Supabase, Vercel, Meta ou provedores opcionais pertencem a cada instalação.

## Escopo aprovado

### Entradas

- PDF de extrato ou fatura;
- CSV bancário;
- imagem de comprovante ou nota fiscal;
- PDF de nota fiscal ou comprovante;
- cadastro manual;
- texto, áudio, imagem ou documento recebido pelo WhatsApp.

### Saídas

- rascunhos revisáveis;
- movimentações confirmadas;
- nota fiscal com uma despesa total e itens vinculados;
- categorias e formas de pagamento sugeridas;
- origem e confiança de cada campo extraído;
- possíveis duplicidades com decisão explícita;
- totais, gráficos e relatórios calculados apenas com movimentações confirmadas.

### Fora do escopo desta etapa

- Open Finance e sincronização bancária automática;
- infraestrutura compartilhada administrada pela mantenedora;
- cobrança, planos pagos ou limites comerciais;
- dependência obrigatória de IA ou OCR pagos;
- salvamento automático de interpretações não confirmadas.

## Arquitetura escolhida

Arquitetura híbrida e modular:

- React/Vite executa importação, extração local, revisão e confirmação;
- `pdf.js` processa PDFs localmente;
- Tesseract.js é o OCR open source padrão;
- Supabase Auth identifica o proprietário;
- Postgres armazena dados canônicos com valores em centavos;
- Supabase Storage guarda originais no bucket privado `financial-documents`;
- Edge Functions recebem e respondem webhooks do WhatsApp;
- adaptadores permitem trocar OCR, transcrição ou interpretação sem acoplar o domínio ao provedor;
- segredos e chaves administrativas nunca são enviados ao navegador.

## Modelo de domínio

### Movimentação

Receita, despesa, investimento ou transferência confirmada. Somente status `completed` participa dos totais realizados.

### Rascunho de importação

Interpretação ainda não confirmada. Contém campos sugeridos, confiança, origem por campo, documento relacionado e estado de revisão. Não afeta saldos.

### Importação

Processo originado por arquivo, WhatsApp ou cadastro manual. Mantém idempotência, status, erros e vínculo com os rascunhos produzidos.

### Documento

Arquivo original privado. A movimentação pode continuar existindo se o proprietário apagar o anexo.

### Nota fiscal

Documento comercial que gera uma única despesa pelo total. Seus produtos ficam em itens detalhados vinculados à nota e à movimentação.

### Origem de campo

Metadado que informa como cada valor foi obtido: texto explícito, cabeçalho de mês, data do documento, horário da mensagem, regra personalizada, histórico ou sugestão automática.

### Possível duplicidade

Relação entre registros semelhantes. Nunca provoca exclusão automática.

### Vínculo do WhatsApp

Associação entre telefone e usuário criada com código temporário, de uso único e prazo curto.

## Pipeline de importação

1. Validar tipo e tamanho do arquivo.
2. Calcular hash do original.
3. Extrair texto localmente.
4. Identificar estrutura do documento.
5. Resolver data de cada linha.
6. Normalizar valor, descrição, tipo e forma de pagamento.
7. Aplicar categoria sugerida.
8. Registrar origem e confiança de cada campo.
9. Detectar possíveis duplicidades.
10. Exibir rascunhos para revisão.
11. Persistir somente após confirmação.

## Resolução de datas

Cada movimentação resolve sua data nesta ordem:

1. data completa da própria linha;
2. dia da linha combinado ao cabeçalho de mês vigente, como `Agosto`;
3. data geral do documento ou da nota;
4. data da mensagem ou do upload;
5. rascunho pendente quando a interpretação continuar ambígua.

O sistema registra a regra utilizada. Não é permitido aplicar silenciosamente o mesmo mês a todo o documento quando existirem cabeçalhos ou datas distintas.

## Categorias

Prioridade:

1. regra personalizada do usuário;
2. correções anteriores para descrições ou estabelecimentos equivalentes;
3. palavras-chave e identificadores bancários;
4. sugestão padrão do sistema;
5. `Não categorizado` quando não houver confiança suficiente.

Sugestões não substituem automaticamente uma escolha explícita do usuário.

## Notas fiscais e comprovantes

O parser deve extrair, quando presentes:

- estabelecimento e CNPJ;
- número do documento;
- data e horário;
- produtos;
- quantidade e unidade;
- valor unitário e total do item;
- descontos e acréscimos;
- total da compra;
- forma de pagamento.

Uma nota cria uma única despesa pelo total. A soma dos itens deve ser reconciliada com o total informado. Divergências e campos de baixa confiança permanecem pendentes.

## Duplicidades

A detecção considera hash do arquivo, identificador externo, data, valor, estabelecimento, descrição normalizada e forma de pagamento. A interface oferece:

1. manter as duas;
2. ignorar a nova;
3. substituir a anterior;
4. corrigir informações.

Nenhuma movimentação é apagada ou substituída sem decisão explícita.

## WhatsApp

### Vinculação

O painel gera um código temporário. O usuário envia o código ao número WhatsApp Business configurado pela instalação. O webhook valida o código e associa o telefone ao `user_id`. Números não vinculados não criam dados financeiros.

### Confirmação

Toda interpretação do WhatsApp começa como rascunho. A resposta apresenta o resumo e aceita:

- `1` — confirmar;
- `2` — cancelar;
- `3` — corrigir.

Na correção, linguagem natural altera apenas os campos mencionados. Em seguida, um novo resumo é enviado para confirmação.

### Mídias

- texto segue direto ao interpretador;
- áudio é transcrito por adaptador open source/configurável;
- imagem passa pelo OCR;
- PDF passa pelo mesmo pipeline local/servidor compatível;
- originais são armazenados no bucket privado.

### Estados

`received → processing → awaiting_confirmation → confirmed | cancelled | awaiting_correction → awaiting_confirmation`.

Mensagens e webhooks possuem chave de idempotência. Reenvios da Meta não podem duplicar rascunhos ou movimentações.

## Baixa confiança e erros

Campos duvidosos são destacados com o trecho original que sustentou a interpretação. O usuário pode confirmar os campos corretos e corrigir somente os demais. Rascunhos com erro ou baixa confiança não participam dos totais.

## Privacidade e segurança

- RLS em toda tabela exposta;
- grants mínimos por operação;
- políticas separadas para `select`, `insert`, `update` e `delete`;
- `UPDATE` com `USING` e `WITH CHECK`;
- arquivos separados pelo primeiro segmento `user_id`;
- URLs assinadas e curtas para anexos;
- `service_role` apenas em Edge Functions quando estritamente necessário;
- validação de assinatura do webhook;
- códigos de vinculação com hash, expiração e uso único;
- logs sem texto financeiro, telefone completo ou conteúdo de arquivos;
- exportação e exclusão pelo proprietário;
- testes pgTAP/RLS provando acesso próprio e negação cruzada.

## Instalação self-hosted

O assistente de configuração verifica:

- variáveis públicas do Supabase;
- autenticação;
- migrations e tabelas esperadas;
- RLS e bucket privado;
- Edge Functions;
- segredos do WhatsApp;
- OCR e transcrição configurados;
- teste de ponta a ponta sem gravar movimentação real.

O repositório terá `.env.example`, migrations reproduzíveis e documentação passo a passo. Nenhuma credencial real será versionada.

## Critérios de aceite

1. O extrato real de teste separa corretamente agosto, setembro e demais meses.
2. Imagem e PDF de nota extraem estabelecimento, data, itens, valores e total.
3. A soma dos itens é comparada ao total da nota.
4. Texto, áudio, imagem e documento no WhatsApp criam rascunho e exigem confirmação.
5. Datas incompletas usam cabeçalho de mês; datas ambíguas pedem revisão.
6. Duplicidades oferecem quatro decisões e nunca são excluídas automaticamente.
7. Um usuário não acessa dados ou arquivos de outro usuário.
8. Importação funciona em Safari/iPhone, Chrome, Edge e Android.
9. Uma instalação nova funciona seguindo apenas README e assistente.
10. Lint, typecheck, testes unitários, segurança, build e E2E passam antes da publicação.

## Divisão de entrega

1. Importação multimeses, proveniência e duplicidades.
2. OCR estruturado de notas e confirmação atômica.
3. WhatsApp, vinculação e máquina de estados.
4. Assistente self-hosted, segurança e documentação.

