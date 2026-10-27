import { STORAGE_KEYS } from "../constants";
import type { ChatErrorBody, ChatErrorCode, ChatRequest } from "./protocol";

const MESSAGES: Record<ChatErrorCode | "network", string> = {
  bad_request: "That message couldn't be sent. Try a shorter question.",
  forbidden: "The assistant only works on the CareerNova site.",
  rate_limited: "You're sending messages quickly. Wait a minute and try again.",
  busy: "The assistant is busy right now. Try again in a minute.",
  quota: "The assistant has used up today's free allowance. Try again later.",
  not_configured: "The assistant isn't set up on this server yet.",
  upstream: "The assistant couldn't answer just now. Try again.",
  network: "Couldn't reach the assistant. Check your connection and try again.",
};

export class ChatError extends Error {
  constructor(readonly code: ChatErrorCode | "network") {
    super(MESSAGES[code]);
  }
}

/** Sends the request and calls onText with the whole answer so far, as it streams in. */
export async function streamChat(request: ChatRequest, onText: (text: string) => void, signal: AbortSignal) {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ChatError("network");
  }
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as ChatErrorBody | null;
    throw new ChatError(body?.error && body.error in MESSAGES ? body.error : "upstream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch (error) {
      if (signal.aborted) throw error;
      throw new ChatError("network");
    }
    if (chunk.done) break;
    text += decoder.decode(chunk.value, { stream: true });
    onText(text);
  }
  if (!text.trim()) throw new ChatError("upstream");
  return text;
}

export interface ChatSettings {
  /** Has seen the notice that questions go to an AI service */
  acknowledged: boolean;
  /** Opted in to sending the profile summary */
  sharesProfile: boolean;
}

export function readChatSettings(): ChatSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.chat) ?? "{}");
    return { acknowledged: parsed.acknowledged === true, sharesProfile: parsed.sharesProfile === true };
  } catch {
    return { acknowledged: false, sharesProfile: false };
  }
}

export function writeChatSettings(settings: ChatSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.chat, JSON.stringify(settings));
  } catch {
    // Storage may be blocked. The notice shows again next visit.
  }
}

export interface SourceRef {
  id: string;
  title: string;
  code?: string;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  error?: string;
}

/** The conversation lives in this tab only (sessionStorage), and is gone when the tab closes. */
export function readHistory(): StoredMessage[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.chatHistory) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeHistory(messages: StoredMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.chatHistory, JSON.stringify(messages.slice(-40)));
  } catch {
    // ignore
  }
}
