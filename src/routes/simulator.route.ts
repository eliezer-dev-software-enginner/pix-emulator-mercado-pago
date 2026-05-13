import { Router, type Request, type Response } from "express";
import { payments } from "../store";
import { fireWebhook } from "../webhook";

const simulatorRouter = Router();

// ── POST /simulate/pay/:id ────────────────────────────────────────────────────
// Simula o usuário pagando o Pix. Muda status para approved e dispara webhook.
simulatorRouter.post("/pay/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const payment = payments.get(id);

  if (!payment) {
    res.status(404).json({ error: "Pagamento não encontrado", id });
    return;
  }

  if (payment.status === "approved") {
    res.status(409).json({ error: "Pagamento já aprovado", id });
    return;
  }

  payment.status = "approved";
  payment.updatedAt = new Date();
  payments.set(id, payment);

  console.log(`\n✅ Pagamento APROVADO: ${id}`);

  await fireWebhook(id, payment.notificationUrl);

  res.json({ success: true, paymentId: id, status: "approved" });
});

// ── GET /simulate/payments ────────────────────────────────────────────────────
// Lista todos os pagamentos em memória (útil pra debug)
simulatorRouter.get("/payments", (req: Request, res: Response) => {
  const list = Array.from(payments.values()).map((p) => ({
    id: p.id,
    status: p.status,
    amount: p.amount,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  res.json({ total: list.length, payments: list });
});


export { simulatorRouter };
