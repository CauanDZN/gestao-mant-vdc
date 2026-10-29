import { NextResponse } from "next/server";
import { confirmPixPayment } from "@/lib/payments/confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const paymentId = body?.data?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ ok: true });

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return NextResponse.json({ ok: true });
    const payment = await response.json();
    if (payment.status === "approved") {
      await confirmPixPayment(String(payment.id));
    }
  } catch (error) {
    console.error("Failed to process Mercado Pago webhook.", error);
  }

  return NextResponse.json({ ok: true });
}
