const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// ─── In-memory store ──────────────────────────────────────────────────────────
const payments = new Map(); // paymentId → payment object

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3333;

// Webhook URL: where YOUR app listens (e.g. your Next.js /api/checkout/webhook)
// Override with env var: WEBHOOK_URL=https://your-app.com/api/checkout/webhook
const WEBHOOK_URL =
  process.env.WEBHOOK_URL || 'http://localhost:3000/api/checkout/webhook';

// Delay in ms before firing the webhook after a payment is created (simulates async notification)
const WEBHOOK_DELAY_MS = parseInt(process.env.WEBHOOK_DELAY_MS || '2000', 10);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFakeQrCode(paymentId) {
  return `00020126580014br.gov.bcb.pix0136fake-pix-key-${paymentId}5204000053039865802BR5925PREGO GAMES LTDA6009SAO PAULO62070503***6304ABCD`;
}

function makeFakeQrCodeBase64(paymentId) {
  // Returns a tiny 1x1 transparent PNG as base64 (placeholder for the real QR image)
  return `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
}

async function fireWebhook(paymentId) {
  const payload = { action: 'payment.updated', data: { id: paymentId } };
  console.log(`\n🔔 Firing webhook → ${WEBHOOK_URL}`);
  console.log('   Payload:', JSON.stringify(payload));

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(`   ✅ Webhook response: ${res.status}`);
  } catch (err) {
    console.error(`   ❌ Webhook failed: ${err.message}`);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'Mercado Pago Pix Emulator',
    status: 'running',
    paymentsInMemory: payments.size,
    webhookUrl: WEBHOOK_URL,
    endpoints: {
      createPayment: 'POST /v1/payments',
      getPayment: 'GET  /v1/payments/:id',
      payNow: 'POST /pay/:id',
      listAll: 'GET  /payments',
    },
  });
});

// ── 1. Create payment (mirrors real MP API) ───────────────────────────────────
app.post('/v1/payments', (req, res) => {
  const body = req.body;
  const paymentId =
    String(Date.now()).slice(-8) + Math.floor(Math.random() * 1000);

  const payment = {
    id: paymentId,
    status: 'pending',
    status_detail: 'pending_waiting_payment',
    payment_method_id: 'pix',
    transaction_amount: body.transaction_amount ?? body.value ?? 1,
    description: body.description ?? 'Pagamento Pix',
    external_reference: body.external_reference ?? body.externalRef ?? null,
    payer: body.payer ?? {},
    metadata: body.metadata ?? {},
    point_of_interaction: {
      transaction_data: {
        qr_code: makeFakeQrCode(paymentId),
        qr_code_base64: makeFakeQrCodeBase64(paymentId),
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  payments.set(paymentId, payment);

  console.log(`\n💳 Payment created: ${paymentId} | status: pending`);

  // Fire webhook after delay (simulates MP notifying your app)
  setTimeout(() => fireWebhook(paymentId), WEBHOOK_DELAY_MS);

  res.status(201).json(payment);
});

// ── 2. Get payment by ID (called by your webhook handler via PixService) ──────
app.get('/v1/payments/:id', (req, res) => {
  const { id } = req.params;

  // Mercado Pago test ID
  if (id === '123456') {
    return res.json({
      id: '123456',
      status: 'approved',
      status_detail: 'accredited',
    });
  }

  const payment = payments.get(id);
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found', id });
  }

  console.log(`\n🔍 Get payment: ${id} | status: ${payment.status}`);
  res.json(payment);
});

// ── 3. Simulate "user paid" ───────────────────────────────────────────────────
app.post('/pay/:id', async (req, res) => {
  const { id } = req.params;
  const payment = payments.get(id);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found', id });
  }

  if (payment.status === 'approved') {
    return res.status(409).json({ error: 'Payment already approved', id });
  }

  payment.status = 'approved';
  payment.status_detail = 'accredited';
  payment.updatedAt = new Date().toISOString();
  payments.set(id, payment);

  console.log(`\n✅ Payment APPROVED: ${id}`);

  // Fire webhook immediately
  await fireWebhook(id);

  res.json({ success: true, paymentId: id, status: 'approved' });
});

// ── 4. List all payments (debug helper) ───────────────────────────────────────
app.get('/payments', (req, res) => {
  const list = Array.from(payments.values()).map((p) => ({
    id: p.id,
    status: p.status,
    description: p.description,
    amount: p.transaction_amount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  res.json({ total: list.length, payments: list });
});

// ── 5. Delete a payment (reset helper) ────────────────────────────────────────
app.delete('/payments/:id', (req, res) => {
  const { id } = req.params;
  if (!payments.has(id)) return res.status(404).json({ error: 'Not found' });
  payments.delete(id);
  console.log(`\n🗑️  Payment deleted: ${id}`);
  res.json({ deleted: true, id });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(
    `\n🟢 Mercado Pago Pix Emulator running on http://localhost:${PORT}`,
  );
  console.log(`📡 Webhook will fire to: ${WEBHOOK_URL}`);
  console.log(`⏱️  Webhook delay: ${WEBHOOK_DELAY_MS}ms\n`);
  console.log('Endpoints:');
  console.log(`  POST   /v1/payments       → create payment`);
  console.log(`  GET    /v1/payments/:id   → get payment status`);
  console.log(`  POST   /pay/:id           → simulate user paying`);
  console.log(`  GET    /payments          → list all (debug)`);
  console.log(`  DELETE /payments/:id      → remove payment (debug)\n`);
});
