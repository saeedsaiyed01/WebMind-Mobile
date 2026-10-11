// Deterministic interaction checks; no real accounts, purchases, or AI credits.
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.WEBMIND_CHROME ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: [
      "--disable-gpu",
      "--renderer-process-limit=1",
      "--js-flags=--max-old-space-size=128",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const output = path.resolve(
    process.env.WEBMIND_SCREENSHOTS || "artifacts/screenshots",
  );
  fs.mkdirSync(output, { recursive: true });
  const memory = {
    _id: "memory-1",
    title: "Launch notes",
    type: "note",
    link: "Project Cedar launches in October.",
  };
  const requests = [];
  let chatMode = "success";
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const endpoint = new URL(req.url()).pathname.split("/api/v1")[1];
    requests.push({ endpoint, method: req.method(), body: req.postDataJSON() });
    let body;
    let status = 200;
    if (endpoint === "/auth/signup" || endpoint === "/auth/signin")
      body = { token: "qa-session" };
    else if (endpoint === "/auth/me")
      body = {
        _id: "qa",
        username: "qa@example.test",
        name: "Saeed",
        credits: 20,
      };
    else if (endpoint === "/content") body = { content: [memory] };
    else if (endpoint === "/conversations")
      body = [{ _id: "conversation-1", title: "Planning the release" }];
    else if (endpoint.startsWith("/conversation/"))
      body = [
        {
          _id: "turn-1",
          message: "What are the launch steps?",
          response: "# Launch plan\n\nReview, test, ship.",
        },
      ];
    else if (endpoint === "/plan") body = { plan: "free", credits: 20 };
    else if (endpoint === "/models")
      body = {
        models: [
          {
            id: "gemini-2.5-flash",
            name: "Gemini 2.5 Flash",
            provider: "google",
          },
          {
            id: "openai/gpt-oss-20b",
            name: "GPT OSS 20B (Free)",
            provider: "openai",
          },
        ],
      };
    else if (endpoint === "/chat") {
      const mode = chatMode;
      if (mode === "slow")
        await new Promise((resolve) => setTimeout(resolve, 3500));
      if (mode === "error") {
        status = 503;
        body = { error: "Temporary test outage" };
      } else {
        const events = [
          { type: "phase", phase: "searching" },
          {
            type: "result",
            answer:
              "# Ready to ship\n\nA polished response.\n\n```js\nconsole.log('Cedar');\n```",
            conversationId: "conversation-1",
            remainingCredits: 19,
          },
        ];
        await route
          .fulfill({
            status: 200,
            contentType: "application/x-ndjson",
            body:
              events.map((event) => JSON.stringify(event)).join("\n") + "\n",
          })
          .catch(() => {});
        return;
      }
    } else throw new Error("Unexpected API endpoint: " + endpoint);
    await route
      .fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      })
      .catch(() => {});
  });
  try {
    await page.goto(
      process.env.WEBMIND_PREVIEW_URL || "http://localhost:5174/?tab=chat",
      { timeout: 120000 },
    );
    await page
      .getByRole("textbox", { name: "Email address" })
      .waitFor({ timeout: 120000 });
    await page.screenshot({ path: path.join(output, "sign-in-light.png") });
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Email address" })
      .fill("qa@example.test");
    await page.locator('input[aria-label="Password"]').fill("QApassword-123");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.getByRole("textbox", { name: "Message WebMind" }).waitFor();
    assert.ok(page.url().startsWith("http://localhost:"));
    assert.ok(
      requests.some(
        (req) => req.endpoint === "/auth/signup" && req.method === "POST",
      ),
    );
    const input = page.getByRole("textbox", { name: "Message WebMind" });
    await input.fill("Keep this draft");
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await page.getByRole("button", { name: "Use dark appearance" }).click();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("webmind-appearance")),
      "dark",
    );
    await page.screenshot({ path: path.join(output, "account-dark.png") });
    await page.getByRole("button", { name: "Chat", exact: true }).click();
    assert.equal(await input.inputValue(), "Keep this draft");
    for (const width of [360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "Overflow at " + width,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, "chat-dark.png") });
    await page.getByRole("button", { name: "Select AI model" }).click();
    await page
      .getByRole("button", { name: "Select GPT OSS 20B (Free)", exact: true })
      .click();
    await page.getByRole("button", { name: "Attach saved memories" }).click();
    await page
      .getByRole("textbox", { name: "Search saved memories" })
      .fill("Launch");
    await page
      .getByRole("button", { name: "Attach Launch notes", exact: true })
      .click();
    await page.getByRole("button", { name: "Close sheet" }).click();
    chatMode = "error";
    await input.fill("Summarize the launch");
    await page.getByRole("button", { name: "Send message" }).click();
    await page.getByText("Temporary test outage", { exact: true }).waitFor();
    chatMode = "success";
    await page.getByRole("button", { name: "Retry message" }).click();
    await page.getByRole("button", { name: "Copy code" }).waitFor();
    const chats = requests.filter((req) => req.endpoint === "/chat");
    assert.equal(chats.length, 2);
    assert.deepEqual(chats[1].body.attachedDocumentIds, ["memory-1"]);
    assert.equal(chats[1].body.model, "openai/gpt-oss-20b");
    await page.screenshot({ path: path.join(output, "chat-answer-dark.png") });
    chatMode = "slow";
    await input.fill("Stop this request");
    await page.getByRole("button", { name: "Send message" }).click();
    await page.getByRole("button", { name: "Stop generating" }).click();
    await page
      .getByText("Response stopped. You can retry this message.", {
        exact: true,
      })
      .waitFor();
    await page.getByRole("button", { name: "New conversation" }).click();
    await page.getByRole("button", { name: "Conversation history" }).click();
    await page
      .getByRole("button", { name: "Open Planning the release" })
      .click();
    await page.getByText("Launch plan", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await page.getByRole("button", { name: "Use light appearance" }).click();
    await page.getByRole("button", { name: "Chat", exact: true }).click();
    await page.screenshot({ path: path.join(output, "chat-answer-light.png") });
    await page.reload();
    await page.getByRole("button", { name: "Account", exact: true }).click();
    const headingColor = () =>
      page
        .getByText("Account", { exact: true })
        .first()
        .evaluate((element) => getComputedStyle(element).color);
    assert.equal(await headingColor(), "rgb(34, 34, 34)");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.getByRole("button", { name: "Use system appearance" }).click();
    await page.waitForFunction(
      () => localStorage.getItem("webmind-appearance") === "system",
    );
    assert.equal(await headingColor(), "rgb(236, 234, 230)");
    assert.deepEqual(errors, [], "Browser runtime errors");
    console.log(
      "PASS: native signup route, persisted themes, preserved draft, three widths, model/attachment sheets, retry context, Markdown/code, cancellation, and history; no browser runtime errors.",
    );
  } catch (error) {
    await page.screenshot({
      path: path.join(output, "regression-failure.png"),
    });
    console.error(await page.locator("body").innerText());
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
