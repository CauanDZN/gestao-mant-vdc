import type { Page } from "@playwright/test";

// Test-account credentials come from the environment, never hardcoded in the
// repo. Set E2E_BISPA_EMAIL / E2E_BISPA_PASSWORD in your local shell (or a
// gitignored .env.test.local loaded by your test runner) before running
// `npm run test:e2e`. See README.md for the full setup.
export const BISPA_EMAIL = process.env.E2E_BISPA_EMAIL ?? "";
export const BISPA_PASSWORD = process.env.E2E_BISPA_PASSWORD ?? "";

function requireCredentials(): { email: string; password: string } {
  if (!BISPA_EMAIL || !BISPA_PASSWORD) {
    throw new Error(
      "Set E2E_BISPA_EMAIL and E2E_BISPA_PASSWORD before running the e2e suite (see README.md).",
    );
  }
  return { email: BISPA_EMAIL, password: BISPA_PASSWORD };
}

export async function loginAsBispa(page: Page): Promise<void> {
  const { email, password } = requireCredentials();
  await page.goto("/login");
  const needsSetup = await page.getByPlaceholder("Seu nome").isVisible().catch(() => false);
  if (needsSetup) {
    await page.getByPlaceholder("Seu nome").fill("Bispa Teste");
    await page.getByPlaceholder("nome@email.com").fill(email);
    await page.getByPlaceholder(/senha/i).fill(password);
    await page.getByRole("button", { name: /criar conta e entrar/i }).click();
  } else {
    await page.getByPlaceholder("nome@email.com").fill(email);
    await page.getByPlaceholder("Sua senha").fill(password);
    await page.getByRole("button", { name: /^entrar$/i }).click();
  }
  await page.waitForURL("/");
}
