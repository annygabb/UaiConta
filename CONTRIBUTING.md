# Contribuindo com o UaiConta

Obrigado por ajudar a melhorar o UaiConta.

## Princípios

- preserve a correção financeira antes do polish visual;
- dinheiro deve continuar representado em centavos inteiros;
- não transforme valores `planned` em `completed` automaticamente;
- não introduza API paga/proprietária como requisito central;
- qualquer tabela pública precisa de RLS e policies revisadas;
- nenhuma chave privilegiada pode chegar ao cliente;
- toda mudança de regra financeira deve vir acompanhada de teste.

## Fluxo

```bash
npm install
npm run lint
npm run typecheck
npm run test:unit
npm run test:security
npm run build:demo
npm run test:e2e
```

Abra uma branch pequena e um PR explicando comportamento, banco, testes e impacto de segurança.

## Banco

Não edite uma migration já aplicada. Crie uma nova migration incremental. Revise RLS, índices, constraints e relacionamentos.

## UI/UX

Teste pelo menos mobile, tablet e desktop. Não use overflow horizontal como solução padrão para dados essenciais.
