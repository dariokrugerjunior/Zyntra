# 🚀 Zyntra - Modo DEMO

## Credenciais de Acesso

Para testar a aplicação no **modo DEMO** (sem precisar de backend), use uma das credenciais abaixo:

### API Key
```
demo-key-123
```

### JWT Token
```
demo-jwt-token-456
```

## Como Usar

1. Acesse a página de login
2. Selecione o modo de autenticação (API Key ou JWT)
3. Clique no botão **"Use"** no banner azul do modo demo
4. Ou copie e cole manualmente uma das credenciais acima
5. Clique em **"Sign In"**

## Recursos Disponíveis no Modo DEMO

✅ **Dashboard** - Visualize estatísticas simuladas com gráficos
✅ **Sessões WhatsApp** - Crie, visualize e gerencie sessões (com QR codes mockados)
✅ **Mensagens** - Envie mensagens de texto e mídia
✅ **Webhooks** - Configure webhooks para receber eventos
✅ **API Keys** - Gerencie chaves de API
✅ **Configurações** - Ajuste preferências do sistema

## Dados Mockados

Todos os dados no modo DEMO são simulados e incluem:
- 3 sessões WhatsApp de exemplo
- Estatísticas de mensagens das últimas 24h
- Webhooks pré-configurados
- API Keys de exemplo
- Histórico de mensagens enviadas

## Banner de Identificação

Quando estiver no modo DEMO, você verá um banner azul/roxo no topo da aplicação indicando:
**"Demo Mode Active - All data is simulated"**

## Modo Produção

Para usar a aplicação com um backend real:
1. Configure a variável de ambiente `VITE_API_BASE_URL` com a URL da sua API
2. Use uma API Key ou JWT Token válidos fornecidos pelo seu backend
3. O sistema automaticamente detectará e usará a API real