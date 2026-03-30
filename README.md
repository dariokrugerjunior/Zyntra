# Zyntra

[![Private Project](https://img.shields.io/badge/status-private-red)](./README.md)
[![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 18](https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Docker Compose](https://img.shields.io/badge/docker-compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)

Plataforma para operacao de WhatsApp com foco em automacao. O projeto conecta sessoes WhatsApp, sincroniza historico, envia mensagens, recebe eventos em tempo real e permite configurar respostas automaticas com IA por sessao.

O ponto central do Zyntra e simples: transformar um numero de WhatsApp em um bot automatico com IA, com painel web, controle operacional e integracao via API/webhooks.

## Destaques

- Bot automatico com IA por sessao, com prompt configuravel.
- Integracao com OpenAI para gerar respostas automaticas.
- Fluxo completo de sessao WhatsApp com QR Code, status, reconexao e sincronizacao.
- Painel web para operacao, atendimento e configuracao.
- API REST multi-tenant para sessoes, mensagens, webhooks e chaves.
- Worker assicrono com filas BullMQ para execucao e entrega de eventos.
- Historico de mensagens e conversas sincronizado no banco.
- Webhooks com assinatura HMAC e politica de retry.

## Como o bot com IA funciona

Quando uma mensagem chega no WhatsApp:

1. O `worker` captura o evento via Baileys.
2. O `backend` persiste a mensagem recebida.
3. O sistema consulta a configuracao de auto-resposta da sessao.
4. Se a IA estiver habilitada, o backend monta contexto recente da conversa.
5. O prompt configurado e enviado para a OpenAI.
6. A resposta gerada entra na fila de envio.
7. O `worker` envia a mensagem automaticamente no WhatsApp.

Se a IA nao estiver habilitada, a sessao ainda pode operar com resposta fixa baseada no prompt salvo.

## Galeria

### Login

![Tela de login 1](docs/screenshots/LOGIN%20-%201.png)

![Tela de login 2](docs/screenshots/LOGIN%20-%202.png)

### Painel

![Painel principal](docs/screenshots/PAINEL.png)

### Sessao WhatsApp

![Detalhes da sessao](docs/screenshots/SESS%C3%83O.png)

![Conversa da sessao](docs/screenshots/SESS%C3%83O%20-%20CONVERSA.png)

![Configuracao de IA da sessao](docs/screenshots/SESS%C3%83O%20-%20IA.png)

## Arquitetura

O projeto esta organizado como monorepo:

- `backend/`: API REST, autenticacao, persistencia, configuracao de IA, webhooks e ingestao de eventos.
- `worker/`: engine WhatsApp com Baileys, execucao das filas, envio de mensagens e leitura de eventos.
- `frontend/`: painel web para login, sessoes, conversas, webhooks, API keys e configuracao da IA.
- `docs/`: documentacao e screenshots.
- `deploy/`: arquivos de infraestrutura e Nginx.

### Componentes principais

- `PostgreSQL`: banco principal.
- `Redis`: locks, rate limit, idempotencia e filas.
- `BullMQ`: orquestracao de jobs.
- `Baileys`: conexao com WhatsApp.
- `OpenAI`: geracao de respostas automaticas.
- `Prisma`: acesso ao banco e schema.
- `React + Vite`: painel administrativo.

## Funcionalidades

### Operacao de sessoes

- Criacao de sessoes por empresa.
- Start e stop de conexoes.
- QR Code para vinculacao do WhatsApp.
- Status `created`, `starting`, `qr`, `ready`, `disconnected`, `stopped` e `error`.
- Sincronizacao automatica de historico.

### Bot automatico com IA

- Habilitacao por sessao.
- Prompt de comportamento configuravel.
- Provedor `OpenAI` com modelo editavel.
- Teste de conexao antes de salvar credenciais.
- Contexto recente da conversa para respostas mais coerentes.

### Mensageria

- Envio de mensagem de texto.
- Envio de arquivo/documento.
- Conversas e mensagens salvas no banco.
- Idempotencia por `Idempotency-Key`.
- Rate limit por empresa e por sessao.

### Integracao

- Webhooks por empresa.
- Assinatura `X-Signature: sha256=<hex>`.
- Retry automatico em falhas.
- API pronta para automacao e integracoes externas.

### Seguranca e multi-tenant

- Isolamento por `companyId`.
- Autenticacao por `X-API-Key` ou JWT.
- Credenciais de login por empresa.
- Segredos de worker protegidos por header interno.

## Stack

### Backend

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- Redis
- BullMQ
- OpenAI SDK

### Worker

- Node.js
- TypeScript
- Baileys
- BullMQ
- Redis

### Frontend

- React 18
- TypeScript
- Vite
- Zustand
- Tailwind CSS

## Fluxo de eventos

```text
WhatsApp -> Worker (Baileys) -> Backend (/internal/worker/events)
Backend -> Banco / Regras de negocio / IA
Backend -> BullMQ -> Worker
Worker -> WhatsApp
Backend -> Webhooks externos
Frontend -> Backend API REST
```

## Requisitos

- Docker e Docker Compose
- Node.js 20+ para execucao local fora de containers
- npm

## Variaveis de ambiente

Arquivo base na raiz:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:4547/zyntra?schema=public
REDIS_URL=redis://redis:6379
CORS_ORIGIN=http://localhost:5173,http://localhost:4173
JWT_SECRET=change-me
WORKER_SECRET=change-me-worker-secret
SEED_API_KEY=zyn_seed_local_dev_2026
BACKEND_INTERNAL_URL=http://backend:3000
BAILEYS_STORAGE_PATH=/app/data
LOG_LEVEL=info
```

Variaveis importantes:

- `DATABASE_URL`: conexao com Postgres.
- `REDIS_URL`: conexao com Redis.
- `JWT_SECRET`: assinatura do JWT.
- `WORKER_SECRET`: autenticacao entre worker e backend.
- `SEED_API_KEY`: chave padrao criada no seed.
- `BACKEND_INTERNAL_URL`: URL interna usada pelo worker.
- `BAILEYS_STORAGE_PATH`: persistencia de credenciais das sessoes WhatsApp.

Para a interface web, configure tambem em `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

O `frontend` possui `package.json` proprio e nao faz parte do `workspaces` da raiz.

## Como rodar localmente

### 1. Instale dependencias

Na raiz:

```bash
npm install
```

No frontend, separadamente do workspace raiz:

```bash
cd frontend
npm install
```

### 2. Configure o ambiente

Use um dos arquivos:

- `.env.local` para desenvolvimento
- `.env.production` para producao
- `.env` como fallback

O backend e o worker carregam automaticamente o arquivo correspondente ao ambiente.

### 3. Suba banco e Redis

O `docker-compose.yml` atual sobe infraestrutura local:

```bash
docker compose up -d
```

Servicos expostos:

- PostgreSQL: `localhost:4547`
- Redis: `localhost:6379`

### 4. Rode backend e worker

Na raiz:

```bash
npm run -w backend dev
```

Em outro terminal:

```bash
npm run -w worker dev
```

### 5. Rode o frontend

No diretorio `frontend`:

```bash
npm run dev
```

A interface ficara disponivel em `http://localhost:5173`.

## Seed inicial

O seed cria ou atualiza a empresa demo, uma API key padrao e credenciais de acesso:

```bash
npm run seed
```

Valores padrao:

- Empresa: `Demo Company`
- Usuario: `demo`
- Senha: `admin123`
- API Key: `zyn_seed_local_dev_2026`

Esses valores podem ser alterados por variaveis de ambiente como `SEED_COMPANY_USERNAME`, `SEED_COMPANY_PASSWORD` e `SEED_API_KEY`.

## Acesso ao sistema

O frontend suporta dois modos:

- `API Key`: envia `X-API-Key`
- `Company Login`: autentica com usuario/senha e recebe JWT

Todas as rotas, exceto `GET /health`, exigem autenticacao.

## Endpoints principais

### Health

```bash
curl -s http://localhost:3000/health
```

### Auth

- `POST /auth/login`

### API Keys

- `POST /api-keys`
- `GET /api-keys`
- `DELETE /api-keys/:id`

### Sessions

- `POST /sessions`
- `GET /sessions`
- `GET /sessions/:id`
- `POST /sessions/:id/start`
- `POST /sessions/:id/stop`
- `POST /sessions/:id/sync-history`
- `DELETE /sessions/:id`
- `GET /sessions/:id/qr`
- `GET /sessions/:id/status`
- `GET /sessions/:id/messages`
- `GET /sessions/:id/conversations`
- `GET /sessions/:id/auto-reply`
- `PUT /sessions/:id/auto-reply`
- `POST /sessions/:id/auto-reply/test-connection`

### Messages

- `POST /sessions/:id/messages/text`
- `POST /sessions/:id/messages/media`

### Webhooks

- `POST /webhooks`
- `GET /webhooks`
- `PATCH /webhooks/:id`
- `DELETE /webhooks/:id`

## Exemplo de configuracao da IA

Payload para salvar auto-resposta da sessao:

```json
{
  "enabled": true,
  "promptText": "Responda em portugues, de forma objetiva, cordial e profissional.",
  "provider": "openai",
  "aiModel": "gpt-5",
  "apiToken": "sk-..."
}
```

Com isso, a sessao passa a operar como um bot automatico com IA, respondendo mensagens recebidas com base no prompt definido no painel.

## Swagger e OpenAPI

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

## Webhooks

Headers enviados pelo backend:

- `X-Signature`
- `X-Event-Type`
- `X-Company-Id`
- `X-Session-Id`
- `X-Delivery-Id`

Eventos suportados:

- `session.qr`
- `session.ready`
- `session.disconnected`
- `history.sync`
- `message.received`
- `message.sent`
- `message.error`

Politica de retry:

- 10s
- 30s
- 2m
- 10m
- 30m

## Filas e controles operacionais

Filas BullMQ:

- `session-start`
- `session-stop`
- `message-send-text`
- `message-send-media`
- `webhook-deliver`

Controles implementados:

- Rate limit por empresa: `20 msg/s`
- Rate limit por sessao: `5 msg/s`
- Idempotencia em Redis por `10 min`
- Locks por sessao para start e stop
- Limpeza automatica de sessoes inativas

## Producao

Existe estrutura de deploy com Nginx e compose de producao:

- `docker-compose.prod.yml`
- `deploy/nginx/conf.d/zyntra.conf`

Fluxo resumido:

1. Configurar DNS para o dominio.
2. Emitir certificado Let's Encrypt.
3. Subir stack de producao com `docker compose -f docker-compose.prod.yml up -d --build`.

## Estrutura resumida

```text
Zyntra/
|- backend/
|- worker/
|- frontend/
|- docs/
|  |- screenshots/
|- deploy/
|- docker-compose.yml
|- docker-compose.prod.yml
```

## Casos de uso

- Atendimento automatico com IA via WhatsApp.
- Bot operacional para empresas com multiplas sessoes.
- Central de mensagens com painel de conversa.
- Integracao com CRMs, ERPs e automacoes via webhook.
- SaaS multi-tenant para operacao de canais WhatsApp.

## Observacoes

- O projeto e privado.
- O frontend e instalado separadamente do workspace raiz.
- O `docker-compose.yml` atual esta preparado principalmente para infraestrutura local; backend e worker podem ser executados por processo durante o desenvolvimento.
