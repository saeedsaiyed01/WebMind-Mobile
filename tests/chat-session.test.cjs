const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
function load(path) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(require.resolve(path), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports, Date, URL },
  );
  return exports;
}
const session = load("../src/chat/session.ts");
const auth = load("../src/auth/callback.ts");

test("new conversations have unique keys even within the same millisecond", () => {
  const keys = new Set(
    Array.from({ length: 1000 }, () => session.createSession().key),
  );
  assert.equal(keys.size, 1000);
});
test("late history or chat results cannot overwrite another conversation", () => {
  const old = session.createSession();
  const next = session.createSession();
  let called = false;
  assert.equal(
    session.updateSession(next, old.key, () => {
      called = true;
      return old;
    }),
    next,
  );
  assert.equal(called, false);
  assert.equal(
    session.updateSession(old, old.key, (value) => ({ ...value, id: "saved" }))
      .id,
    "saved",
  );
});
test("history preserves alternating turns, IDs, Unicode, and code", () => {
  const messages = session.historyMessages([
    { _id: "one", message: "Hi 👋", response: "```ts\nconst n = 1;\n```" },
  ]);
  assert.equal(messages[0].role, "user");
  assert.equal(messages[0].text, "Hi 👋");
  assert.equal(messages[1].id, "one-a");
  assert.equal(messages[1].role, "assistant");
  assert.match(messages[1].text, /const n = 1/);
});
test("mobile sign-in only accepts the exact callback with the pending state", () => {
  assert.equal(
    auth.parseMobileCallback("https://webmind.space/?code=x&state=qa", "qa"),
    null,
  );
  assert.equal(
    auth.parseMobileCallback("webmind://evil/?code=x&state=qa", "qa"),
    null,
  );
  assert.equal(
    auth.parseMobileCallback("webmind:///other?code=x&state=qa", "qa"),
    null,
  );
  assert.equal(
    auth.parseMobileCallback("webmind:///?code=x&state=wrong", "qa"),
    null,
  );
  assert.equal(
    auth.parseMobileCallback("webmind:///?code=x&state=qa", null),
    null,
  );
  assert.equal(auth.parseMobileCallback("not a url", "qa"), null);
  assert.equal(
    auth.parseMobileCallback("webmind:///?token=unsafe&state=qa", "qa"),
    null,
  );
  assert.equal(
    auth.parseMobileCallback("webmind:///?code=once&state=qa", "qa").code,
    "once",
  );
  assert.equal(
    auth.parseMobileCallback("webmind:///?error=denied&state=qa", "qa").error,
    "denied",
  );
});
