import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { paymentRouter } from './routes/payment.route';
import { simulatorRouter } from './routes/simulator.route';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

// ── Dashboard (interface web) ─────────────────────────────────────────────────
app.get('/', (req: Request, res: Response) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ── Rotas reais (espelham a API do Mercado Pago) ──────────────────────────────
app.use('/v1/payments', paymentRouter);

// ── Rotas de simulação (exclusivas do emulador) ───────────────────────────────
app.use('/simulate', simulatorRouter);

// ── Info ──────────────────────────────────────────────────────────────────────
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Mercado Pago Pix Emulator',
    status: 'running',
    webhookUrl:
      process.env.WEBHOOK_URL || 'http://localhost:3000/api/checkout/webhook',
    endpoints: {
      createPayment: 'POST   /v1/payments',
      getPayment: 'GET    /v1/payments/:id',
      pay: 'POST   /simulate/pay/:id',
      listPayments: 'GET    /simulate/payments',
      deletePayment: 'DELETE /simulate/payments/:id',
    },
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  const webhookUrl =
    process.env.WEBHOOK_URL || 'http://localhost:3000/api/checkout/webhook';
  const delay = process.env.WEBHOOK_DELAY_MS || '2000';

  console.log(
    `\n🟢 Mercado Pago Pix Emulator rodando em http://localhost:${PORT}`,
  );
  console.log(`📡 Webhook será disparado para: ${webhookUrl}`);
  console.log(`⏱️  Delay do webhook: ${delay}ms\n`);
  console.log('Endpoints:');
  console.log(`  POST   /v1/payments            → criar pagamento`);
  console.log(`  GET    /v1/payments/:id         → consultar pagamento`);
  console.log(
    `  POST   /simulate/pay/:id        → simular pagamento do usuário`,
  );
  console.log(`  GET    /simulate/payments       → listar todos (debug)`);
  console.log(
    `  DELETE /simulate/payments/:id   → remover pagamento (debug)\n`,
  );
});
