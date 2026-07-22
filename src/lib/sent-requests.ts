import type { SentRequestRecord } from "@/types/signature-request";

const STORAGE_KEY = "signflow.sentRequests";

export function getSentRequests(): SentRequestRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addSentRequest(record: SentRequestRecord) {
  if (typeof window === "undefined") return;
  const existing = getSentRequests();
  const next = [record, ...existing.filter((r) => r.id !== record.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
