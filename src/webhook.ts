const DEFAULT_WEBHOOK_URL =
  process.env.WEBHOOK_URL || "http://localhost:3000/api/checkout/webhook";

export async function fireWebhook(paymentId: string, notificationUrl?: string): Promise<void> {
  const url = notificationUrl ?? DEFAULT_WEBHOOK_URL;

  const payload = {
    action: "payment.updated",
    data: { id: paymentId },
  };

  console.log(`\n🔔 Disparando webhook → ${url}`);
  console.log("   Payload:", JSON.stringify(payload));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`   ✅ Webhook respondeu: ${res.status}`);
  } catch (err: any) {
    console.error(`   ❌ Webhook falhou: ${err.message}`);
  }
}
