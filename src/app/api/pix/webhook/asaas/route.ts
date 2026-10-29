import { NextResponse } from "next/server";
import { confirmPixPayment } from "@/lib/payments/confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

export async function POST(request: Request) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (token && request.headers.get("asaas-access-token") !== token) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const paymentId = body?.payment?.id;
  if (paymentId && PAID_EVENTS.has(body.event)) {
    try {
      await confirmPixPayment(String(paymentId));
    } catch (error) {
      console.error("Failed to process Asaas webhook.", error);
    }
  }

  return NextResponse.json({ ok: true });
}
