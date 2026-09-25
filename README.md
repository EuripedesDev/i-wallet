# Cofres

App web mobile-first (PWA) para metas financeiras em "cofres": aportes fixos (parcelas 01/80…) ou variáveis, e registro de rendimentos CDI.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · Drizzle ORM · PostgreSQL · Auth.js v5 (Credentials + bcrypt).

## Desenvolvimento

```bash
npm install
echo "AUTH_SECRET=$(openssl rand -base64 32)" > .env.local
npm run dev
```

`npm run dev` sobe um servidor PostgreSQL embutido ([PGlite](https://pglite.dev), dados em `./.pglite`, porta 5433), aplica as migrations e inicia o Next. Não precisa instalar Postgres.

> O PGlite roda como servidor separado porque o Next 16 renderiza em vários processos, e o PGlite só pode ser aberto por um processo por vez.

Outros scripts:

| Script                | O que faz                                         |
| --------------------- | ------------------------------------------------- |
| `npm run db:generate` | Gera migration após mudar `src/db/schema.ts`      |
| `npm run db:migrate`  | Aplica migrations em `DATABASE_URL`               |
| `npm run db:server`   | Só o servidor PGlite (para usar `db:studio` etc.) |
| `npm run db:studio`   | Drizzle Studio                                    |

## Produção

Variáveis de ambiente:

- `DATABASE_URL`: PostgreSQL (`postgres://user:pass@host:5432/cofres`)
- `AUTH_SECRET`: segredo do Auth.js
- `CDI_ANNUAL_RATE` (opcional): taxa anual de reserva, usada só se a API do Banco Central estiver fora do ar (padrão `0.1365`)
- `DB_POOL_MAX` (opcional): conexões por processo (padrão 10; o `npm run dev` usa 1 porque o servidor PGlite não aguenta muitas conexões em paralelo)
- `BLOB_STORE_ID` ou `BLOB_READ_WRITE_TOKEN` (Vercel): criadas ao conectar um Blob store **privado** ao projeto; com uma delas, as imagens vão para o Blob, sem nenhuma vão para o disco
- `UPLOAD_DIR` (opcional, só sem Blob): pasta das imagens (padrão `./storage/uploads`; precisa ser persistente)

```bash
npm run db:migrate && npm run build && npm start
```

## Estrutura

```
src/
  app/(auth)/            login, register
  app/(dashboard)/       dashboard, cofre/novo, cofre/[id], cofre/[id]/editar
  app/api/uploads/       serve imagens (checa sessão e dono)
  components/ui/         base: botões, inputs, switch, sheet, progress
  components/cofres/     CofreCard, formulários, Timeline, sheets de aporte/rendimento
  db/                    schema Drizzle + conexão
  server/actions/        Server Actions (camada fina: sessão + FormData)
  server/services/       regras de negócio (tríade, parcelas, CDI, storage)
  server/repositories/   acesso ao banco
  proxy.ts               proteção de rotas (antigo middleware)
```

## Regras principais

- **Tríade**: com duas entre meta, duração e depósito mensal, o sistema calcula a terceira (`server/services/triad.ts`). A duração é arredondada para cima; a última parcela fica com o que faltar, para o total bater exatamente com a meta.
- **Parcelas fixas**: o valor da parcela é calculado no servidor e o que vier do cliente é ignorado. Um índice único `(cofre_id, parcel_number)` impede pagar a mesma parcela duas vezes. Só dá para desfazer a última parcela, para a numeração não ficar com buracos.
- **Variável**: aporte livre; basta a meta.
- **CDI**: taxa diária oficial do Banco Central (SGS série 12), guardada na tabela `cdi_rates` e atualizada sob demanda. Cada aporte é um lote que rende juros compostos em cada dia útil, a partir da **própria data**. O IOF regressivo (96% no dia 1 até 0% a partir do dia 30) é descontado conforme a idade de cada aporte. A estimativa mostra o líquido acumulado menos os rendimentos já registrados. O valor registrado continua sendo o que o usuário confirmar. Cálculo em `server/services/yield-calc.ts`.
- **Data do aporte**: pode ser retroativa, para lançar aportes antigos e o rendimento sair certo.
- **Resumo** (`/resumo`, clicando no card de total): aportes por mês de todos os cofres, em barras empilhadas por cofre.
- O plano (meta/duração/parcela) fica travado depois de criado; só dá para editar nome, imagem e o CDI.
