import { expect, test } from "@playwright/test";
import { BISPA_EMAIL, BISPA_PASSWORD, loginAsBispa } from "../support/auth";

test.describe("Authentication", () => {
  test("redirects an unauthenticated visitor to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page.getByRole("heading", { name: "MANT VDC" })).toBeVisible();
  });

  test("rejects an invalid password with a clear error message", async ({ page }) => {
    await page.goto("/login");
    const needsSetup = await page.getByPlaceholder("Seu nome").isVisible().catch(() => false);
    test.skip(needsSetup, "First-access flow is active; nothing to log into yet.");

    await page.getByPlaceholder("nome@email.com").fill(BISPA_EMAIL);
    await page.getByPlaceholder("Sua senha").fill("senha-errada-123");
    await page.getByRole("button", { name: /^entrar$/i }).click();
    await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in successfully and reaches the dashboard", async ({ page }) => {
    await loginAsBispa(page);
    await expect(page.getByRole("heading", { name: /^Paz, /i })).toBeVisible();
  });

  test("logging out returns to the login page and blocks the dashboard again", async ({ page }) => {
    await loginAsBispa(page);
    await page.getByText("Configurações").click();
    await page.getByRole("button", { name: /sair/i }).click();
    await page.waitForURL("/login");
    await page.goto("/");
    await page.waitForURL("/login");
  });

  test.use({ storageState: { cookies: [], origins: [] } });
  test("a wrong-credentials login never sets a session cookie", async ({ page, context }) => {
    await page.goto("/login");
    const needsSetup = await page.getByPlaceholder("Seu nome").isVisible().catch(() => false);
    test.skip(needsSetup, "First-access flow is active; nothing to log into yet.");
    await page.getByPlaceholder("nome@email.com").fill(BISPA_EMAIL);
    await page.getByPlaceholder("Sua senha").fill("senha-errada-123");
    await page.getByRole("button", { name: /^entrar$/i }).click();
    await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === "mant_session")).toBeUndefined();
  });
});
