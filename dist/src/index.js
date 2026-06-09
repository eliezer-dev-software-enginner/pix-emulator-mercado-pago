import 'dotenv/config';
import express, {} from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { paymentRouter } from './routes/payment.route';
import { simulatorRouter } from './routes/simulator.route';
var __dirname = dirname(fileURLToPath(import.meta.url));
var app = express();
app.use(express.json());
// ── Dashboard (interface web) ─────────────────────────────────────────────────
app.get('/', function (req, res) {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});
// ── Rotas reais (espelham a API do Mercado Pago) ──────────────────────────────
app.use('/v1/payments', paymentRouter);
// ── Rotas de simulação (exclusivas do emulador) ───────────────────────────────
app.use('/simulate', simulatorRouter);
// ── Info ──────────────────────────────────────────────────────────────────────
app.get('/', function (req, res) {
    res.json({
        service: 'Mercado Pago Pix Emulator',
        status: 'running',
        webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3000/api/checkout/webhook',
        endpoints: {
            createPayment: 'POST   /v1/payments',
            getPayment: 'GET    /v1/payments/:id',
            pay: 'POST   /simulate/pay/:id',
            listPayments: 'GET    /simulate/payments',
            deletePayment: 'DELETE /simulate/payments/:id',
        },
    });
});
var PORT = process.env.PORT || 3001;
app.listen(PORT, function () {
    var webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/checkout/webhook';
    var delay = process.env.WEBHOOK_DELAY_MS || '2000';
    console.log("\n\uD83D\uDFE2 Mercado Pago Pix Emulator rodando em http://localhost:".concat(PORT));
    console.log("\uD83D\uDCE1 Webhook ser\u00E1 disparado para: ".concat(webhookUrl));
    console.log("\u23F1\uFE0F  Delay do webhook: ".concat(delay, "ms\n"));
    console.log('Endpoints:');
    console.log("  POST   /v1/payments            \u2192 criar pagamento");
    console.log("  GET    /v1/payments/:id         \u2192 consultar pagamento");
    console.log("  POST   /simulate/pay/:id        \u2192 simular pagamento do usu\u00E1rio");
    console.log("  GET    /simulate/payments       \u2192 listar todos (debug)");
    console.log("  DELETE /simulate/payments/:id   \u2192 remover pagamento (debug)\n");
});
//# sourceMappingURL=index.js.map