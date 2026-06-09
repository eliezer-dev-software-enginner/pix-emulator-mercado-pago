import { Router } from "express";
import { randomUUID } from "crypto";
import { payments } from "../store";
import { fireWebhook } from "../webhook";
var paymentRouter = Router();
var WEBHOOK_DELAY_MS = parseInt(process.env.WEBHOOK_DELAY_MS || "2000", 10);
// ── POST /v1/payments ─────────────────────────────────────────────────────────
// Cria um pagamento. Dispara webhook após delay (simula notificação assíncrona do MP).
paymentRouter.post("/", function (req, res) {
    var _a, _b, _c, _d;
    var body = req.body;
    var id = randomUUID();
    var payment = {
        id: id,
        status: "pending",
        amount: (_b = (_a = body.transaction_amount) !== null && _a !== void 0 ? _a : body.value) !== null && _b !== void 0 ? _b : 1,
        description: (_c = body.description) !== null && _c !== void 0 ? _c : "Pagamento Pix",
        externalReference: (_d = body.external_reference) !== null && _d !== void 0 ? _d : body.externalRef,
        notificationUrl: body.notification_url, // ← igual ao MP real
        qrCode: "00020126580014br.gov.bcb.pix0136fake-key-".concat(id, "52040000530398654041.005802BR5913PIX EMULATOR6009SAO PAULO6304ABCD"),
        qrCodeBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    payments.set(id, payment);
    console.log("\n\uD83D\uDCB3 Pagamento criado: ".concat(id, " | status: pending"));
    if (payment.notificationUrl) {
        console.log("   notification_url: ".concat(payment.notificationUrl));
    }
    // Dispara webhook depois do delay (pending → seu app recebe e consulta status)
    setTimeout(function () { return fireWebhook(id, payment.notificationUrl); }, WEBHOOK_DELAY_MS);
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
paymentRouter.get("/:id", function (req, res) {
    var id = req.params.id;
    // ID de teste do Mercado Pago — seu código já trata esse caso
    if (id === "123456") {
        res.json({ id: "123456", status: "approved", status_detail: "accredited" });
        return;
    }
    var payment = payments.get(id);
    if (!payment) {
        res.status(404).json({ error: "Pagamento não encontrado", id: id });
        return;
    }
    console.log("\n\uD83D\uDD0D Consulta pagamento: ".concat(id, " | status: ").concat(payment.status));
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
//# sourceMappingURL=payment.route.js.map