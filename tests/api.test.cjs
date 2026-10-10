const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");

function harness(fetchImpl) {
  let latest;
  const phases = [];
  class XHR {
    constructor() {
      latest = this;
      this.responseText = "";
      this.status = 200;
      this.headers = {};
      this.type = "application/x-ndjson";
    }
    open(method, url) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(key, value) {
      this.headers[key] = value;
    }
    getResponseHeader() {
      return this.type;
    }
    send(body) {
      this.body = JSON.parse(body);
    }
    abort() {
      this.onabort();
    }
    chunk(text) {
      this.responseText += text;
      this.onprogress();
    }
    finish() {
      this.onload();
    }
  }
  const exports = {};
  const context = {
    exports,
    require: (name) =>
      name === "react-native"
        ? { Platform: { OS: "android" } }
        : {
            setItemAsync: async () => {},
            deleteItemAsync: async () => {},
            getItemAsync: async () => null,
          },
    process: { env: {} },
    XMLHttpRequest: XHR,
    AbortController,
    FormData,
    fetch: fetchImpl,
    setTimeout,
    clearTimeout,
    Error,
    JSON,
  };
  const source = ts.transpileModule(
    fs.readFileSync(require.resolve("../src/api.ts"), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(source, context);
  return { api: exports, xhr: () => latest, phases };
}
test("chat handles split NDJSON chunks and all backend phases", async () => {
  const { api, xhr, phases } = harness();
  await api.storage.set("qa-token");
  const pending = api.chat(
    { message: "What is the codename?", attachedDocumentIds: ["doc-1"] },
    (phase) => phases.push(phase),
    new AbortController().signal,
  );
  const transport = xhr();
  assert.equal(transport.headers.Authorization, "Bearer qa-token");
  assert.deepEqual(transport.body.attachedDocumentIds, ["doc-1"]);
  transport.chunk('{"type":"phase","phase":"wor');
  transport.chunk('king"}\n{"type":"phase","phase":"searching"}\n');
  transport.chunk(
    '{"type":"phase","phase":"solving"}\n{"type":"result","answer":"Cedar 🌿","conversationId":"conv-1","remainingCredits":19}',
  );
  transport.finish();
  const result = await pending;
  assert.equal(result.answer, "Cedar 🌿");
  assert.equal(result.remainingCredits, 19);
  assert.deepEqual(phases, ["working", "searching", "solving"]);
});
test("HTTP credit failures and errors inside successful streams reject", async () => {
  const h = harness();
  const pending = h.api.chat(
    { message: "hello" },
    () => {},
    new AbortController().signal,
  );
  h.xhr().chunk(
    '{"type":"error","error":"Insufficient credits","needsUpgrade":true}\n',
  );
  h.xhr().finish();
  await assert.rejects(
    pending,
    (e) => e.needsUpgrade && e.message === "Insufficient credits",
  );
  const second = h.api.chat(
    { message: "hello" },
    () => {},
    new AbortController().signal,
  );
  h.xhr().type = "application/json";
  h.xhr().status = 403;
  h.xhr().responseText = '{"error":"Insufficient credits","needsUpgrade":true}';
  h.xhr().finish();
  await assert.rejects(second, (e) => e.needsUpgrade && e.status === 403);
});
test("cancellation rejects instead of creating an empty assistant message", async () => {
  const h = harness();
  const controller = new AbortController();
  const pending = h.api.chat({ message: "hello" }, () => {}, controller.signal);
  controller.abort();
  await assert.rejects(pending, /Generation stopped/);
});
test("legacy JSON chat responses remain compatible", async () => {
  const h = harness();
  const pending = h.api.chat(
    { message: "hello" },
    () => {},
    new AbortController().signal,
  );
  h.xhr().type = "application/json";
  h.xhr().responseText =
    '{"answer":"Hello","conversationId":"one","remainingCredits":3}';
  h.xhr().finish();
  assert.equal((await pending).answer, "Hello");
});
test("content mutations send authentication and required body IDs", async () => {
  let captured;
  const h = harness(async (url, options) => {
    captured = { url, options };
    return { ok: true, text: async () => '{"message":"Deleted successfully"}' };
  });
  await h.api.storage.set("qa-token");
  await h.api.request("/doc-1", "DELETE", { contentId: "doc-1" });
  assert.equal(captured.options.method, "DELETE");
  assert.equal(captured.options.headers.Authorization, "Bearer qa-token");
  assert.deepEqual(JSON.parse(captured.options.body), { contentId: "doc-1" });
});
test("expired authentication triggers session recovery, ordinary failures do not", async () => {
  let expired = false;
  const h = harness(async () => ({
    ok: false,
    status: 403,
    text: async () => '{"message":"Invalid or expired token"}',
  }));
  h.api.setExpiryHandler(() => (expired = true));
  await assert.rejects(h.api.request("/auth/me"), /Invalid or expired token/);
  assert.ok(expired);
});
