import { Router, type Request, type Response } from 'express';
import { payments } from '../store';
import { fireWebhook } from '../webhook';

const simulatorRouter = Router();

// ── POST /simulate/pay/:id ────────────────────────────────────────────────────
// Simula o usuário pagando o Pix. Muda status para approved e dispara webhook.
simulatorRouter.post('/pay/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const payment = payments.get(id);

  if (!payment) {
    res.status(404).json({ error: 'Pagamento não encontrado', id });
    return;
  }

  if (payment.status === 'approved') {
    res.status(409).json({ error: 'Pagamento já aprovado', id });
    return;
  }

  payment.status = 'approved';
  payment.updatedAt = new Date();
  payments.set(id, payment);

  console.log(`\n✅ Pagamento APROVADO: ${id}`);

  await fireWebhook(id, payment.notificationUrl);

  res.json({ success: true, paymentId: id, status: 'approved' });
});

// ── POST /simulate/expire/:id ─────────────────────────────────────────────────
// Simula a expiração do pagamento. Muda status para expired e dispara webhook.
simulatorRouter.post('/expire/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const payment = payments.get(id);

  if (!payment) {
    res.status(404).json({ error: 'Pagamento não encontrado', id });
    return;
  }

  if (payment.status !== 'pending') {
    res
      .status(409)
      .json({
        error: `Pagamento não pode ser expirado (status atual: ${payment.status})`,
        id,
      });
    return;
  }

  payment.status = 'expired';
  payment.updatedAt = new Date();
  payments.set(id, payment);

  console.log(`\n⏰ Pagamento EXPIRADO: ${id}`);

  await fireWebhook(id, payment.notificationUrl);

  res.json({ success: true, paymentId: id, status: 'expired' });
});

// ── GET /simulate/payments ────────────────────────────────────────────────────
// Lista todos os pagamentos em memória (útil pra debug)
simulatorRouter.get('/payments', (req: Request, res: Response) => {
  const list = Array.from(payments.values()).map((p) => p);

  res.json({ total: list.length, payments: list });
});

export { simulatorRouter };
