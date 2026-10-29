import { expect, test } from "@playwright/test";
import { loginAsBispa } from "../support/auth";

test.describe("Courses with enrollment and certificate", () => {
  test("creates a free course, enrolls a person, and gates the certificate on attendance", async ({ page }) => {
    await loginAsBispa(page);
    await page.getByRole("button", { name: "Cursos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Cursos" })).toBeVisible();

    const courseName = `Curso E2E ${Date.now()}`;
    await page.getByRole("button", { name: /novo curso/i }).click();
    await page.getByPlaceholder(/novos convertidos/i).fill(courseName);
    await page.getByLabel("Início").fill("2026-01-01");
    await page.getByLabel("Fim").fill("2026-02-01");
    await page.getByRole("button", { name: /criar curso/i }).click();

    const courseCard = page.locator("section.panel", { hasText: courseName });
    await expect(courseCard).toBeVisible();
    await expect(courseCard).toContainText("Gratuito");

    await courseCard.getByRole("button", { name: /inscrever pessoa/i }).click();
    const select = page.locator(".modal select");
    const firstOptionValue = await select.locator("option").nth(1).getAttribute("value");
    test.skip(!firstOptionValue, "No people available to enroll in this dataset.");
    await select.selectOption(firstOptionValue!);
    await page.getByRole("button", { name: /^inscrever$/i }).click();

    const row = courseCard.locator("tbody tr").first();
    await expect(row).toContainText("Confirmado");
    await expect(row).toContainText("Gratuito");

    const certificateButton = row.getByRole("button", { name: /emitir/i });
    await expect(certificateButton).toBeDisabled();

    const attendanceInput = row.locator("input");
    await attendanceInput.fill("100");
    await attendanceInput.blur();

    await expect(certificateButton).toBeEnabled({ timeout: 5000 });
  });
});
