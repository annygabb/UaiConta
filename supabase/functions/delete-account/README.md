# delete-account

Edge Function privilegiada para exclusão definitiva da própria conta.

## Segurança

- exige JWT válido do usuário;
- não aceita `user_id` do cliente;
- deriva o usuário do token verificado;
- `SUPABASE_SERVICE_ROLE_KEY` existe somente no runtime da função;
- remove primeiro objetos privados do usuário em `financial-documents`;
- revoga sessões globais e então remove o usuário do Auth;
- tabelas financeiras usam `ON DELETE CASCADE` a partir de `auth.users`.

## Deploy

```bash
supabase functions deploy delete-account
```

A função usa os segredos padrão disponibilizados pelo Supabase Functions runtime.
