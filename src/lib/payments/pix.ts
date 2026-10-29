export type PixProvider = "mercadopago" | "asaas";

export type PixChargeRequest = {
  amount: number;
  description: string;
  payerName: string;
  payerEmail?: string;
  externalReference: string;
};

export type PixChargeResult = {
  provider: PixProvider;
  externalId: string;
  copyPaste: string;
  qrCodeBase64: string;
  status: "pending";
};

export type PixChargeOutcome = PixChargeResult | { notConfigured: true; provider: PixProvider };

function getProvider(): PixProvider {
  const configured = (process.env.PIX_PROVIDER || "mercadopago").toLowerCase();
  return configured === "asaas" ? "asaas" : "mercadopago";
}

export function isPixConfigured(provider: PixProvider = getProvider()): boolean {
  if (provider === "mercadopago") return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
  return Boolean(process.env.ASAAS_API_KEY);
}

export async function createPixCharge(request: PixChargeRequest): Promise<PixChargeOutcome> {
  const provider = getProvider();
  if (!isPixConfigured(provider)) {
    return { notConfigured: true, provider };
  }
  return provider === "asaas" ? createAsaasPixCharge(request) : createMercadoPagoPixCharge(request);
}

async function createMercadoPagoPixCharge(request: PixChargeRequest): Promise<PixChargeResult> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN as string;
  const [firstName, ...rest] = request.payerName.trim().split(" ");

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": request.externalReference,
    },
    body: JSON.stringify({
      transaction_amount: Math.round(request.amount * 100) / 100,
      description: request.description,
      payment_method_id: "pix",
      external_reference: request.externalReference,
      payer: {
        email: request.payerEmail || "sem-email@mantvdc.local",
        first_name: firstName || request.payerName,
        last_name: rest.join(" ") || "-",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Mercado Pago recusou a criação do PIX (status ${response.status}): ${body}`);
  }

  const data = await response.json();
  const transactionData = data?.point_of_interaction?.transaction_data;
  if (!transactionData?.qr_code) {
    throw new Error("Mercado Pago não retornou o QR Code do PIX.");
  }

  return {
    provider: "mercadopago",
    externalId: String(data.id),
    copyPaste: transactionData.qr_code,
    qrCodeBase64: transactionData.qr_code_base64 ?? "",
    status: "pending",
  };
}

async function createAsaasPixCharge(request: PixChargeRequest): Promise<PixChargeResult> {
  const apiKey = process.env.ASAAS_API_KEY as string;
  const baseUrl = process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";
  const headers = { "Content-Type": "application/json", access_token: apiKey };

  const customerResponse = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: request.payerName, email: request.payerEmail || undefined }),
  });
  if (!customerResponse.ok) {
    const body = await customerResponse.text().catch(() => "");
    throw new Error(`Asaas recusou a criação do cliente (status ${customerResponse.status}): ${body}`);
  }
  const customer = await customerResponse.json();

  const dueDate = new Date().toISOString().slice(0, 10);
  const paymentResponse = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customer: customer.id,
      billingType: "PIX",
      value: request.amount,
      dueDate,
      description: request.description,
      externalReference: request.externalReference,
    }),
  });
  if (!paymentResponse.ok) {
    const body = await paymentResponse.text().catch(() => "");
    throw new Error(`Asaas recusou a criação da cobrança (status ${paymentResponse.status}): ${body}`);
  }
  const payment = await paymentResponse.json();

  const qrResponse = await fetch(`${baseUrl}/payments/${payment.id}/pixQrCode`, { headers });
  if (!qrResponse.ok) {
    const body = await qrResponse.text().catch(() => "");
    throw new Error(`Asaas não retornou o QR Code do PIX (status ${qrResponse.status}): ${body}`);
  }
  const qr = await qrResponse.json();

  return {
    provider: "asaas",
    externalId: String(payment.id),
    copyPaste: qr.payload ?? "",
    qrCodeBase64: qr.encodedImage ?? "",
    status: "pending",
  };
}
