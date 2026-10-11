export const mobileReturnUrl = "webmind:///";

export function parseMobileCallback(
  url: string,
  state: string | null,
): { code?: string; error?: string } | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "webmind:" ||
      parsed.hostname ||
      parsed.pathname !== "/" ||
      !state ||
      parsed.searchParams.get("state") !== state
    )
      return null;
    const code = parsed.searchParams.get("code");
    const error = parsed.searchParams.get("error");
    return code ? { code } : error ? { error } : null;
  } catch {
    return null;
  }
}
