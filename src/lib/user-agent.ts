// Small hand-rolled UA sniffer for display purposes only (e.g. "Chrome on
// macOS" in the audit log) — no need for a full parsing dependency for a
// best-effort label. Order matters: more specific checks (mobile browsers,
// iOS) must run before the generic desktop ones they'd otherwise match.
export function describeUserAgent(ua: string | null): string {
  if (!ua) return "Unknown browser";
  return `${detectBrowser(ua)} on ${detectOs(ua)}`;
}

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/FxiOS\//.test(ua)) return "Firefox";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/CriOS\//.test(ua)) return "Chrome";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "Safari";
  return "Unknown browser";
}

function detectOs(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown OS";
}
