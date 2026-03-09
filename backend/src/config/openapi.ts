export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Zyntra Backend API",
    version: "1.0.0",
    description: "API multi-tenant para gerenciamento de sessoes WhatsApp, filas e webhooks."
  },
  servers: [{ url: "http://localhost:3000" }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key"
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: {}
        }
      },
      CreateSessionRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "principal" }
        }
      },
      SendTextRequest: {
        type: "object",
        required: ["to", "text"],
        properties: {
          to: { type: "string", example: "5511999999999" },
          text: { type: "string", example: "ola" }
        }
      },
      CreateWebhookRequest: {
        type: "object",
        required: ["url", "secret", "events"],
        properties: {
          url: { type: "string", format: "uri" },
          secret: { type: "string" },
          events: {
            type: "array",
            items: { type: "string" },
            example: ["session.ready", "message.received"]
          }
        }
      },
      WorkerEventRequest: {
        type: "object",
        required: ["eventType", "companyId", "sessionId", "payload"],
        properties: {
          eventType: {
            type: "string",
            enum: [
              "session.qr",
              "session.ready",
              "session.disconnected",
              "history.sync",
              "message.received",
              "message.sent",
              "message.error"
            ]
          },
          companyId: { type: "string", format: "uuid" },
          sessionId: { type: "string", format: "uuid" },
          payload: { type: "object", additionalProperties: true }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "OK"
          }
        }
      }
    },
    "/api-keys": {
      get: {
        tags: ["Auth"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Lista API keys da empresa",
        responses: {
          "200": { description: "Lista retornada" },
          "401": { description: "Nao autorizado" }
        }
      },
      post: {
        tags: ["Auth"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Cria API key para empresa autenticada",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string" } }
              }
            }
          }
        },
        responses: {
          "201": { description: "Criada" },
          "401": { description: "Nao autorizado" }
        }
      }
    },
    "/api-keys/{id}": {
      delete: {
        tags: ["Auth"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Revoga API key",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Revogada" },
          "404": { description: "Nao encontrada" }
        }
      }
    },
    "/sessions": {
      get: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Lista sessoes da empresa",
        responses: {
          "200": { description: "Lista retornada" }
        }
      },
      post: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Cria sessao",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSessionRequest" }
            }
          }
        },
        responses: {
          "201": { description: "Sessao criada" }
        }
      }
    },
    "/sessions/{id}": {
      get: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Detalha sessao",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Detalhes" },
          "404": { description: "Nao encontrada" }
        }
      },
      delete: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Exclui sessao e dados relacionados",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Sessao removida" },
          "404": { description: "Nao encontrada" }
        }
      }
    },
    "/sessions/{id}/start": {
      post: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Inicia sessao (fila)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "202": { description: "Enfileirada" }
        }
      }
    },
    "/sessions/{id}/stop": {
      post: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Encerra sessao (fila)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "202": { description: "Enfileirada" }
        }
      }
    },
    "/sessions/{id}/qr": {
      get: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Retorna QR atual da sessao",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "QR atual" }
        }
      }
    },
    "/sessions/{id}/status": {
      get: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Retorna status da sessao",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Status atual" }
        }
      }
    },
    "/sessions/{id}/sync-history": {
      post: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Reinicia sessao e solicita sincronizacao de historico",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "202": { description: "Sincronizacao enfileirada" }
        }
      }
    },
    "/sessions/{id}/auto-reply": {
      get: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Retorna configuracao de auto-resposta da sessao",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Configuracao retornada" }
        }
      },
      put: {
        tags: ["Sessions"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Atualiza configuracao de auto-resposta da sessao",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["enabled"],
                properties: {
                  enabled: { type: "boolean" },
                  promptText: { type: "string" },
                  provider: { type: "string", enum: ["mock", "openai"] },
                  apiToken: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Configuracao atualizada" }
        }
      }
    },
    "/sessions/{id}/messages/text": {
      post: {
        tags: ["Messages"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Envia mensagem texto via fila",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "Idempotency-Key", in: "header", required: false, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendTextRequest" }
            }
          }
        },
        responses: {
          "202": { description: "Enfileirada" },
          "409": { description: "Requisicao duplicada ou sessao nao pronta" }
        }
      }
    },
    "/sessions/{id}/messages": {
      get: {
        tags: ["Messages"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Lista historico de mensagens da sessao",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200 } },
          { name: "with", in: "query", required: false, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Historico retornado" }
        }
      }
    },
    "/sessions/{id}/conversations": {
      get: {
        tags: ["Messages"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Lista conversas da sessao (agrupado por contato)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 20000 } },
          { name: "search", in: "query", required: false, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Conversas retornadas" }
        }
      }
    },
    "/sessions/{id}/messages/media": {
      post: {
        tags: ["Messages"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Envia mensagem midia via fila",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "Idempotency-Key", in: "header", required: false, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["to", "base64", "mime"],
                properties: {
                  to: { type: "string" },
                  base64: { type: "string" },
                  mime: { type: "string" },
                  fileName: { type: "string" },
                  caption: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "202": { description: "Enfileirada" }
        }
      }
    },
    "/webhooks": {
      get: {
        tags: ["Webhooks"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Lista webhooks da empresa",
        responses: {
          "200": { description: "Lista retornada" }
        }
      },
      post: {
        tags: ["Webhooks"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Cria webhook",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateWebhookRequest" }
            }
          }
        },
        responses: {
          "201": { description: "Webhook criado" }
        }
      }
    },
    "/webhooks/{id}": {
      patch: {
        tags: ["Webhooks"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Atualiza webhook",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Atualizado" },
          "404": { description: "Nao encontrado" }
        }
      },
      delete: {
        tags: ["Webhooks"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        summary: "Remove webhook",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Removido" },
          "404": { description: "Nao encontrado" }
        }
      }
    },
    "/internal/worker/events": {
      post: {
        tags: ["Internal"],
        summary: "Ingestao de eventos do worker",
        parameters: [{ name: "X-Worker-Secret", in: "header", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkerEventRequest" }
            }
          }
        },
        responses: {
          "202": { description: "Aceito" },
          "401": { description: "Segredo invalido" }
        }
      }
    }
  }
} as const;
