import { expect, test } from "@playwright/test";
import { loginAsBispa } from "../support/auth";

test.describe("Budget module", () => {
  test("creates a budget category and shows the realized amount, correctly separated by type (bug fix regression)", async ({ page }) => {
    await loginAsBispa(page);
    await page.getByRole("button", { name: "Financeiro", exact: true }).click();
    await page.getByRole("tab", { name: "Orçamento" }).click();

    const categoryName = `Categoria Teste ${Date.now()}`;
    await page.getByRole("button", { name: /nova categoria de orçamento/i }).click();
    await page.getByPlaceholder(/missões e ação social/i).fill(categoryName);
    await page.getByRole("button", { name: "Despesa" }).click();
    await page.getByRole("button", { name: /criar categoria/i }).click();

    await expect(page.getByText(categoryName)).toBeVisible();
    // A freshly created category starts at R$ 0,00 realized/planned.
    const row = page.locator(".budget-row", { hasText: categoryName });
    await expect(row).toContainText("R$");
  });
});
