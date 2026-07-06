import { randomUUID } from 'crypto';
import { Router, type Request, type Response } from 'express';
import { payments } from '../store';
import type { Payment } from '../types';
import { fireWebhook } from '../webhook';

import fs from 'fs';
import path from 'path';

const qrCodePath = path.join(process.cwd(), 'src', 'public', 'qrcode.png');
const qrCodeBase64 = fs.existsSync(qrCodePath)
  ? `${fs.readFileSync(qrCodePath, { encoding: 'base64' })}`
  : '';

console.log(qrCodeBase64);

//------------

const paymentRouter = Router();

const WEBHOOK_DELAY_MS = parseInt(process.env.WEBHOOK_DELAY_MS || '2000', 10);

// ── POST /v1/payments ─────────────────────────────────────────────────────────
// Cria um pagamento. Dispara webhook após delay (simula notificação assíncrona do MP).
paymentRouter.post('/', (req: Request, res: Response) => {
  const body = req.body;

  const id = randomUUID();

  const payment: Payment = {
    id,
    status: 'pending',
    amount: body.transaction_amount ?? body.value ?? 1,
    description: body.description ?? 'Pagamento Pix',
    externalReference: body.external_reference ?? body.externalRef,
    notificationUrl: body.notification_url, // ← igual ao MP real
    qrCode: `00020126580014br.gov.bcb.pix0136fake-key-${id}52040000530398654041.005802BR5913PIX EMULATOR6009SAO PAULO6304ABCD`,
    qrCodeBase64:
      //'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      qrCodeBase64,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  payments.set(id, payment);
  console.log(`\n💳 Pagamento criado: ${id} | status: pending`);
  if (payment.notificationUrl) {
    console.log(`   notification_url: ${payment.notificationUrl}`);
  }

  // Dispara webhook depois do delay (pending → seu app recebe e consulta status)
  setTimeout(() => fireWebhook(id, payment.notificationUrl), WEBHOOK_DELAY_MS);

  // Resposta no formato que sua lib pix-payment espera
  res.status(201).json({
    id: payment.id,
    status: payment.status,
    transaction_amount: payment.amount,
    description: payment.description,
    external_reference: payment.externalReference,
    point_of_interaction: {
      transaction_data: {
        qr_code: payment.qrCode,
        qr_code_base64: payment.qrCodeBase64,
      },
    },
    date_created: payment.createdAt,
  });
});

// ── GET /v1/payments/:id ──────────────────────────────────────────────────────
// Consultado pelo seu webhook handler via PixService.getPaymentById()
paymentRouter.get('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;

  // ID de teste do Mercado Pago — seu código já trata esse caso
  if (id === '123456') {
    res.json({ id: '123456', status: 'approved', status_detail: 'accredited' });
    return;
  }

  const payment = payments.get(id);
  if (!payment) {
    res.status(404).json({ error: 'Pagamento não encontrado', id });
    return;
  }

  console.log(`\n🔍 Consulta pagamento: ${id} | status: ${payment.status}`);

  res.json({
    id: payment.id,
    status: payment.status,
    transaction_amount: payment.amount,
    description: payment.description,
    external_reference: payment.externalReference,
    point_of_interaction: {
      transaction_data: {
        qr_code: payment.qrCode,
        qr_code_base64: payment.qrCodeBase64,
      },
    },
    date_created: payment.createdAt,
    date_last_updated: payment.updatedAt,
  });
});

export { paymentRouter };
