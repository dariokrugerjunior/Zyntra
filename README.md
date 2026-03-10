# Zyntra WhatsApp SaaS Monorepo

Monorepo Node.js + TypeScript com:
- `backend/`: API REST multi-tenant, Prisma/Postgres, Redis/BullMQ, dispatcher de webhooks com assinatura HMAC.
- `worker/`: processamento de filas e engine Baileys para sessões WhatsApp.

## Requisitos
- Docker + Docker Compose
- Node 20+ (apenas se for rodar fora do Docker)

## Subir ambiente local
```bash
cp .env.local .env
docker compose up -d --build
```

## Ambientes
- Local: `.env.local` (com valores de desenvolvimento)
- Produção: `.env.production` (placeholders para preencher no deploy)
- Backend e worker carregam automaticamente:
  - `.env.local` quando `NODE_ENV` for diferente de `production`
  - `.env.production` quando `NODE_ENV=production`
  - fallback para `.env` se os arquivos acima não existirem
- Convenção do monorepo: manter os arquivos `.env*` na raiz do projeto.

## Seed (company + api key)
O seed cria/atualiza 1 company (`Demo Company`) e 1 API key de login fixa (`SEED_API_KEY` no `.env.local`/`.env`), no padrão `zyn_...`:
```bash
docker compose exec backend npm run seed
```

## Serviços
- Backend: `http://localhost:3000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Swagger
- UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

## Auth
Todas as rotas (exceto `GET /health`) exigem:
- `X-API-Key: <api_key_plaintext>` ou
- `Authorization: Bearer <jwt>` (payload com `companyId`)

## Endpoints principais

### Health
```bash
curl -s http://localhost:3000/health
```

### API Keys
```bash
curl -X POST http://localhost:3000/api-keys \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <SEED_API_KEY>" \
  -d '{"name":"Minha integração"}'

curl -X GET http://localhost:3000/api-keys \
  -H "X-API-Key: <SEED_API_KEY>"

curl -X DELETE http://localhost:3000/api-keys/<API_KEY_ID> \
  -H "X-API-Key: <SEED_API_KEY>"
```

### Sessions
```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <SEED_API_KEY>" \
  -d '{"name":"principal"}'

curl -X GET http://localhost:3000/sessions \
  -H "X-API-Key: <SEED_API_KEY>"

curl -X POST http://localhost:3000/sessions/<SESSION_ID>/start \
  -H "X-API-Key: <SEED_API_KEY>"

curl -X GET http://localhost:3000/sessions/<SESSION_ID>/qr \
  -H "X-API-Key: <SEED_API_KEY>"

curl -X GET http://localhost:3000/sessions/<SESSION_ID>/status \
  -H "X-API-Key: <SEED_API_KEY>"

curl -X POST http://localhost:3000/sessions/<SESSION_ID>/stop \
  -H "X-API-Key: <SEED_API_KEY>"
```

### Messages
```bash
curl -X POST http://localhost:3000/sessions/<SESSION_ID>/messages/text \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <SEED_API_KEY>" \
  -H "Idempotency-Key: req-123" \
  -d '{"to":"5511999999999","text":"ola"}'

curl -X POST http://localhost:3000/sessions/<SESSION_ID>/messages/media \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <SEED_API_KEY>" \
  -H "Idempotency-Key: req-124" \
  -d '{"to":"5511999999999","base64":"<BASE64>","mime":"application/pdf","fileName":"arquivo.pdf","caption":"segue"}'
```

### Webhooks
```bash
curl -X POST http://localhost:3000/webhooks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <SEED_API_KEY>" \
  -d '{"url":"https://webhook.site/xxx","secret":"supersecret123","events":["session.ready","message.received","message.sent"]}'

curl -X GET http://localhost:3000/webhooks \
  -H "X-API-Key: <SEED_API_KEY>"

curl -X PATCH http://localhost:3000/webhooks/<WEBHOOK_ID> \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <SEED_API_KEY>" \
  -d '{"isActive":false}'

curl -X DELETE http://localhost:3000/webhooks/<WEBHOOK_ID> \
  -H "X-API-Key: <SEED_API_KEY>"
```

## Endpoint interno do worker
`POST /internal/worker/events`

Headers:
- `X-Worker-Secret: <WORKER_SECRET>`

Exemplo payload:
```json
{
  "eventType": "message.received",
  "companyId": "00000000-0000-0000-0000-000000000001",
  "sessionId": "11111111-1111-1111-1111-111111111111",
  "payload": {
    "from": "5511999999999@s.whatsapp.net",
    "to": "5511888888888@s.whatsapp.net",
    "messageType": "conversation",
    "text": "hello",
    "raw": "..."
  }
}
```

## Payload de webhook enviado
Headers enviados pelo backend:
- `X-Signature: sha256=<hex>`
- `X-Event-Type`
- `X-Company-Id`
- `X-Session-Id`
- `X-Delivery-Id`

Body exemplo:
```json
{
  "eventType": "session.ready",
  "companyId": "00000000-0000-0000-0000-000000000001",
  "sessionId": "11111111-1111-1111-1111-111111111111",
  "data": {
    "phoneNumber": "5511999999999:13@s.whatsapp.net"
  },
  "timestamp": "2026-03-02T20:00:00.000Z"
}
```

## Notas de arquitetura
- Multi-tenant obrigatório via `req.context.companyId` resolvido por API key/JWT.
- Toda query de negócio usa filtro por `companyId`.
- Filas BullMQ:
  - `session-start`
  - `session-stop`
  - `message-send-text`
  - `message-send-media`
  - `webhook-deliver`
- Rate limit Redis (janela fixa 1s):
  - company: 20 msg/s
  - session: 5 msg/s
- Idempotência (`Idempotency-Key`) em Redis por 10 min.
- Retry de webhook: 10s, 30s, 2m, 10m, 30m.
