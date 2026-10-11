const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
const exportsForTest = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(require.resolve("../src/appearance.ts"), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText,
  { exports: exportsForTest },
);
const { lightColors, darkColors, parseAppearance, resolveAppearance } =
  exportsForTest;
test("appearance follows the system unless the user makes an explicit choice", () => {
  assert.equal(resolveAppearance("system", "dark"), "dark");
  assert.equal(resolveAppearance("system", null), "light");
  assert.equal(resolveAppearance("light", "dark"), "light");
  assert.equal(resolveAppearance("dark", "light"), "dark");
  assert.equal(parseAppearance("invalid"), "system");
  assert.equal(parseAppearance("dark"), "dark");
});
function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
test("light and dark palettes keep text, controls, and errors readable", () => {
  for (const colors of [lightColors, darkColors]) {
    for (const background of ["bg", "paper", "subtle"]) {
      for (const foreground of ["ink", "muted"]) {
        assert.ok(
          contrast(colors[foreground], colors[background]) >= 4.5,
          foreground + " on " + background,
        );
      }
    }
    assert.ok(contrast(colors.onAccent, colors.accent) >= 4.5);
    assert.ok(contrast(colors.danger, colors.dangerSoft) >= 4.5);
  }
});
