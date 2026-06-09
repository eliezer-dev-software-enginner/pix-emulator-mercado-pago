# Mercado Pago Pix Emulator

Emulador local da API de Pagamentos PIX do Mercado Pago. Permite testar fluxos completos de pagamento sem credenciais reais.

## Instalação

```bash
git clone https://github.com/eliezer-dev-software-enginner/pix-emulator-mercado-pago.git
cd pix-emulator-mercado-pago
npm install
```

## Uso

```bash
# Iniciar servidor (desenvolvimento com hot-reload)
npm run dev

# Build e start
npm run build
npm start
```

O servidor roda em `http://localhost:3001` (configurável via `PORT`).

## Endpoints

### Criar pagamento

```
POST /v1/payments
Content-Type: application/json

{
  "transaction_amount": 54.50,
  "description": "Descrição do produto",
  "payment_method_id": "pix",
  "payer": {
    "email": "cliente@exemplo.com",
    "first_name": "Cliente",
    "last_name": "Exemplo"
  },
  "external_reference": "user_123",
  "notification_url": "http://localhost:3000/api/webhook"
}
```

Resposta (201):
```json
{
  "id": "uuid-do-pagamento",
  "status": "pending",
  "transaction_amount": 54.50,
  "description": "Descrição do produto",
  "external_reference": "user_123",
  "point_of_interaction": {
    "transaction_data": {
      "qr_code": "00020126580014br.gov.bcb.pix0136fake-key-...",
      "qr_code_base64": "iVBORw0KGgo..."
    }
  }
}
```

### Consultar pagamento

```
GET /v1/payments/:id
```

Resposta:
```json
{
  "id": "uuid-do-pagamento",
  "status": "pending",
  "transaction_amount": 54.50,
  "external_reference": "user_123",
  "point_of_interaction": { ... }
}
```

### Simular pagamento do usuário

```
POST /simulate/pay/:id
```

Muda o status para `approved` e dispara o webhook de notificação.

### Listar pagamentos (debug)

```
GET /simulate/payments
```

### Remover pagamento (debug)

```
DELETE /simulate/payments/:id
```

## Integração

### Via pix-payment (recomendado)

A maneira mais simples é usar o pacote [`pix-payment`](https://github.com/eliezer-dev-software-enginner/pix-payment), que já abstrai a alternância entre emulador (dev) e Mercado Pago real (prod).

```typescript
import { PixService } from 'pix-payment';

const pixService = new PixService({
  accessToken: process.env.MP_ACCESS_TOKEN_PROD!,
  emulator: {
    enabled: process.env.NODE_ENV === 'development',
    url: process.env.PIX_EMULATOR_URL, // http://localhost:3001
  },
});

// Criar pagamento
const result = await pixService.createPixPayment({
  value: 54.50,
  description: 'Produto',
  email: 'cliente@exemplo.com',
  firstName: 'Cliente',
  lastName: 'Exemplo',
  externalRef: 'user_123',
  notificationUrl: 'http://localhost:3000/api/webhook',
});

// Consultar status
const payment = await pixService.getPaymentById('payment-id');
```

### Via HTTP direto (sem biblioteca)

```typescript
// Criar pagamento
const res = await fetch('http://localhost:3001/v1/payments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transaction_amount: 54.50,
    description: 'Produto',
    payment_method_id: 'pix',
    payer: { email: 'cliente@exemplo.com' },
    external_reference: 'user_123',
  }),
});

const payment = await res.json();

// Simular pagamento
await fetch(`http://localhost:3001/simulate/pay/${payment.id}`, {
  method: 'POST',
});
```

## Fluxo de Teste

1. Inicie o emulador (`npm run dev` na porta 3001)
2. Inicie sua aplicação (ex: Next.js na porta 3000)
3. Sua app cria um pagamento → `POST /v1/payments`
4. O emulador retorna QR Code falso (status: `pending`)
5. Após 2 segundos, o emulador dispara um webhook para `notification_url`
6. No dashboard do emulador (`http://localhost:3001`), clique em "Pagar" no pagamento desejado
7. O emulador muda status para `approved` e dispara novo webhook
8. Sua app recebe o webhook, consulta `GET /v1/payments/:id`, confirma `approved` e libera o acesso

## Variáveis de Ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `PORT` | `3001` | Porta do servidor |
| `WEBHOOK_URL` | `http://localhost:3000/api/checkout/webhook` | URL do webhook da sua aplicação |
| `WEBHOOK_DELAY_MS` | `2000` | Delay antes de disparar o webhook |

## License

ISC
