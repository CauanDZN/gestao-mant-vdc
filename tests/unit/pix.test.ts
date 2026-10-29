import { afterEach, describe, expect, it, vi } from "vitest";
import { createPixCharge, isPixConfigured } from "@/lib/payments/pix";

describe("pix payments configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to mercadopago and reports not configured when no token is set", () => {
    vi.stubEnv("PIX_PROVIDER", "");
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    vi.stubEnv("ASAAS_API_KEY", "");
    expect(isPixConfigured()).toBe(false);
  });

  it("createPixCharge returns notConfigured instead of throwing when no provider key is set", async () => {
    vi.stubEnv("PIX_PROVIDER", "mercadopago");
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    const result = await createPixCharge({
      amount: 50,
      description: "Teste",
      payerName: "Fulano de Tal",
      externalReference: "ref-1",
    });
    expect(result).toEqual({ notConfigured: true, provider: "mercadopago" });
  });

  it("reports configured once an access token env var is present", () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "TEST-token");
    expect(isPixConfigured("mercadopago")).toBe(true);
  });

  it("switches provider based on PIX_PROVIDER", () => {
    vi.stubEnv("PIX_PROVIDER", "asaas");
    vi.stubEnv("ASAAS_API_KEY", "");
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "some-token");
    // Even though Mercado Pago has a token, the active provider is asaas and it has no key.
    expect(isPixConfigured()).toBe(false);
  });
});
