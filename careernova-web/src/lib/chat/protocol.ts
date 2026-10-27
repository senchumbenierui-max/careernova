/**
 * The request the browser sends to /api/chat. Shared by the app and the serverless function,
 * so it must not import anything (the function can't resolve the "@/" alias).
 */

/** "general" sends no profile data at all. "personal" adds the profile summary, with the student's consent. */
export type ChatMode = "general" | "personal";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** A retrieved chunk. The id is for the client; the model only sees the text. */
export interface ChatSource {
  id: string;
  text: string;
}

export interface ChatRequest {
  mode: ChatMode;
  /** Oldest first, ending with the student's question */
  messages: ChatMessage[];
  sources: ChatSource[];
  /** Only in personal mode */
  profile?: string;
}

export const LIMITS = {
  /** 6 turns of history */
  messages: 12,
  questionChars: 500,
  messageChars: 2000,
  sources: 8,
  sourceChars: 2500,
  profileChars: 4000,
  bodyBytes: 40_000,
} as const;

export type ChatErrorCode = "bad_request" | "forbidden" | "rate_limited" | "busy" | "quota" | "not_configured" | "upstream";

export interface ChatErrorBody {
  error: ChatErrorCode;
  message: string;
}
