import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("user can log in", async ({ page }) => {
  test.skip(!email || !password, "E2E_EMAIL and E2E_PASSWORD are required.");

  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in with email" }).click();

  await expect(page.getByText(/Team workspace/i)).toBeVisible();
});
