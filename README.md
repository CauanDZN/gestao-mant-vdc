# MANT VDC — Gestão da Igreja

Sistema de gestão financeira, patrimônio, agenda, pessoas, células, cursos e
ministérios para a igreja, com login por perfil de acesso e banco de dados
compartilhado na nuvem (Postgres via Prisma/Vercel).

## Desenvolvimento

```bash
npm install
npm run dev
```

No primeiro acesso, `/login` pede para criar a conta principal (perfil
"bispa"). Os demais usuários são criados em **Configurações → Usuários**.

## Variáveis de ambiente

Veja `.env.example`. As mais importantes:

- `DATABASE_URL` — Postgres (preenchida automaticamente pela Vercel).
- `SESSION_SECRET` — segredo do cookie de sessão (`openssl rand -base64 32`).
- `PIX_PROVIDER`, `MERCADOPAGO_ACCESS_TOKEN`, `ASAAS_API_KEY`, `ASAAS_ENV` —
  opcionais. Sem eles, inscrições pagas em cursos/eventos ficam marcadas como
  "pendente" e a cobrança PIX real não é gerada (nada quebra).

## Testes

```bash
npm test              # testes unitários (Vitest)
npm run test:coverage # com relatório de cobertura
npm run test:e2e      # ponta a ponta (Playwright, sobe o próprio `next dev`)
npm run test:e2e:ui   # mesma coisa, com interface visual
```

Os testes e2e fazem login de verdade e precisam de uma conta "bispa" já
criada no banco de desenvolvimento. Informe as credenciais por variável de
ambiente (nunca fixas no código):

```bash
export E2E_BISPA_EMAIL="bispa@teste.local"
export E2E_BISPA_PASSWORD="sua-senha-local"
npm run test:e2e
```

Cada execução cria registros com nomes únicos (timestamp) para não colidir
entre execuções.

## Estrutura

- `src/app/api/*` — rotas (igreja, autenticação, usuários, orçamento,
  células, cursos, eventos, webhooks de PIX).
- `src/components/*` — telas (painel/financeiro/patrimônio/agenda/pessoas em
  `church-app.tsx`; células, orçamento, configurações, cursos e inscrições em
  arquivos próprios).
- `src/lib/*` — lógica pura (seletores, validação, autenticação, pagamentos,
  certificado em PDF).
- `prisma/schema.prisma` — modelo de dados; `prisma/migrations/` — histórico.
- `tests/unit/*` — Vitest; `tests/e2e/*` — Playwright.

## Deploy

O projeto já está ligado a um projeto na Vercel (`vercel link`). `git push`
na `main` publica automaticamente.
