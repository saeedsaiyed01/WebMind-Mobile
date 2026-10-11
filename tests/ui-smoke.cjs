// Optional live-backend smoke check. Credentials belong to an isolated QA account.
// WEBMIND_QA_CREDENTIALS points to a local JSON file { email, password }.
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
async function main() {
  const credentials = JSON.parse(
    fs.readFileSync(process.env.WEBMIND_QA_CREDENTIALS),
  );
  const browser = await chromium.launch({
    executablePath:
      process.env.WEBMIND_CHROME ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const output = path.resolve("artifacts/screenshots");
  fs.mkdirSync(output, { recursive: true });
  try {
    await page.goto(
      process.env.WEBMIND_PREVIEW_URL || "http://localhost:5173",
      {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      },
    );
    await page
      .getByRole("textbox", { name: "Email address" })
      .waitFor({ timeout: 120000 });
    await page.screenshot({
      path: path.join(output, "sign-in.png"),
      fullPage: true,
    });
    await page
      .getByRole("textbox", { name: "Email address" })
      .fill(credentials.email);
    await page
      .locator('input[aria-label="Password"]')
      .fill(credentials.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await page
      .getByRole("button", { name: "Open Mobile PDF verification" })
      .waitFor({ timeout: 60000 });
    await page.screenshot({ path: path.join(output, "workspace.png") });
    console.log("PASS: sign-in and workspace.");
    await page.getByRole("button", { name: "Library", exact: true }).click();
    console.log("Library URL: " + page.url());
    await page
      .locator('input[aria-label="Search memories"]')
      .fill("no such memory");
    await page.getByText("No memories found.", { exact: true }).waitFor();
    await page.locator('input[aria-label="Search memories"]').fill("");
    await page
      .getByRole("button", { name: "Open A calmer creative workspace" })
      .click();
    await page.getByRole("button", { name: "Explore with AI" }).waitFor();
    await page.getByRole("button", { name: "Explore with AI" }).click();
    await page
      .getByRole("textbox", { name: "Message WebMind" })
      .fill(
        "What is the project codename in the attached memory? Reply with only the codename.",
      );
    await page.getByRole("button", { name: "Send message" }).click();
    await page.getByText("Cedar", { exact: true }).waitFor({ timeout: 180000 });
    await page.screenshot({ path: path.join(output, "chat.png") });
    await page.getByRole("button", { name: "Select AI model" }).click();
    await page
      .getByRole("button", { name: "Select GPT OSS 20B (Free)" })
      .waitFor();
    await page
      .getByRole("button", { name: "Select GPT OSS 20B (Free)" })
      .click();
    await page.getByText("GPT OSS 20B", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await page.getByText("Account", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, "account.png") });
    for (const width of [360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "Horizontal overflow at " + width,
      );
    }
    assert.deepEqual(errors, [], "Browser runtime errors");
    console.log(
      "PASS: sign-in, library search/empty state, memory detail, attached chat, model selection, account, 3 viewport widths.",
    );
  } catch (error) {
    await page.screenshot({ path: path.join(output, "failure.png") });
    console.log(
      JSON.stringify({
        url: page.url(),
        text: (await page.locator("body").innerText()).slice(0, 2400),
        errors,
      }),
    );
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
