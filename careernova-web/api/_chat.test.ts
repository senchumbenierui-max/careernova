import { describe, expect, it, vi } from "vitest";
import type { ChatRequest } from "../src/lib/chat/protocol";
import { handleChat, parseRequest, RateLimiter, systemPrompt } from "./_chat";

const env = { GROQ_API_KEY: "test-key" };
const general: ChatRequest = {
  mode: "general",
  messages: [{ role: "user", content: "What is a Job Zone?" }],
  sources: [{ id: "kb:what-a-job-zone-is", text: "What a Job Zone is\nA Job Zone is O*NET's rating..." }],
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://careernova.example/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", host: "careernova.example", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** A Groq-style event stream, cut at awkward places like a real network would */
function sse(texts: string[], status = 200) {
  const events = texts.map(t => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`).join("") + "data: [DONE]\n\n";
  const bytes = new TextEncoder().encode(events);
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7));
      c.close();
    },
  });
  return new Response(status === 200 ? body : "{}", { status });
}

const run = (request: Request, fetchImpl: typeof fetch, e: Record<string, string> = env) =>
  handleChat(request, e, { fetchImpl, rateLimiter: new RateLimiter() });

describe("parseRequest", () => {
  it("accepts a valid request", () => {
    expect(parseRequest(general)).toEqual(general);
  });

  it("refuses a profile in general mode", () => {
    expect(parseRequest({ ...general, profile: "Tools: Python" })).toMatch(/General mode/);
  });

  it("needs a profile in personal mode", () => {
    expect(parseRequest({ ...general, mode: "personal" })).toMatch(/needs a profile/);
  });

  it("refuses oversized or malformed parts", () => {
    expect(parseRequest({ ...general, messages: [{ role: "user", content: "x".repeat(501) }] })).toMatch(/question/);
    expect(parseRequest({ ...general, messages: [{ role: "system", content: "hi" }] })).toMatch(/role/);
    expect(parseRequest({ ...general, sources: Array(9).fill(general.sources[0]) })).toMatch(/sources/);
    expect(parseRequest({ ...general, messages: [{ role: "assistant", content: "hi" }] })).toMatch(/question/);
  });
});

describe("systemPrompt", () => {
  it("tells general mode it knows nothing about the student", () => {
    const prompt = systemPrompt(general);
    expect(prompt).toContain("You know nothing about this student");
    expect(prompt).not.toContain("<STUDENT_PROFILE>");
    expect(prompt).toContain("A Job Zone is O*NET's rating");
  });

  it("adds the profile in personal mode", () => {
    const prompt = systemPrompt({ ...general, mode: "personal", profile: "Tools: Python" });
    expect(prompt).toContain("<STUDENT_PROFILE>\nTools: Python\n</STUDENT_PROFILE>");
  });

  it("keeps the honesty rules", () => {
    expect(systemPrompt(general)).toMatch(/Never call it a probability/);
    expect(systemPrompt(general)).toMatch(/Never invent numbers/);
  });
});

describe("handleChat", () => {
  it("streams the answer text", async () => {
    const fetchImpl = vi.fn(async () => sse(["A Job Zone ", "is a rating ", "of preparation."]));
    const res = await run(post(general), fetchImpl as typeof fetch);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("A Job Zone is a rating of preparation.");

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-key");
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe("openai/gpt-oss-120b");
    expect(sent.include_reasoning).toBe(false);
    expect(sent.messages[0].role).toBe("system");
    expect(sent.messages.slice(1)).toEqual(general.messages);
  });

  it("falls back to the smaller model when the first is out of quota or retired", async () => {
    for (const status of [429, 404]) {
      const fetchImpl = vi.fn().mockResolvedValueOnce(sse([], status)).mockResolvedValueOnce(sse(["ok"]));
      const res = await run(post(general), fetchImpl);
      expect(await res.text()).toBe("ok");
      const second = JSON.parse((fetchImpl.mock.calls[1][1] as RequestInit).body as string);
      expect(second.model).toBe("openai/gpt-oss-20b");
    }
  });

  it("tells a per-minute limit apart from the daily allowance", async () => {
    const limited = (retryAfter: string) => vi.fn(async () => new Response("{}", { status: 429, headers: { "retry-after": retryAfter } }));
    const busy = await run(post(general), limited("7"));
    expect(busy.status).toBe(503);
    expect((await busy.json()).error).toBe("busy");
    expect((await (await run(post(general), limited("3600"))).json()).error).toBe("quota");
  });

  it("refuses without a key, from another site, or with a bad body", async () => {
    const never = vi.fn();
    expect((await (await run(post(general), never, {})).json()).error).toBe("not_configured");
    expect((await run(post(general, { origin: "https://evil.example" }), never)).status).toBe(403);
    expect((await run(post("{not json"), never)).status).toBe(400);
    expect((await run(post({ ...general, profile: "x" }), never)).status).toBe(400);
    expect(never).not.toHaveBeenCalled();
  });

  it("allows the site's own origin and listed origins", async () => {
    const ok = vi.fn(async () => sse(["hi"]));
    expect((await run(post(general, { origin: "https://careernova.example" }), ok)).status).toBe(200);
    const listed = { ...env, ALLOWED_ORIGINS: "http://localhost:5173" };
    expect((await run(post(general, { origin: "http://localhost:5173" }), ok, listed)).status).toBe(200);
  });

  it("hides a rejected key behind a generic message", async () => {
    const res = await run(post(general), vi.fn(async () => sse([], 401)));
    expect((await res.json()).error).toBe("not_configured");
  });
});

describe("RateLimiter", () => {
  it("limits per minute and per day", () => {
    let t = 0;
    const limiter = new RateLimiter(2, 3, () => t);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(false);
    expect(limiter.allow("b")).toBe(true);
    t += 61_000;
    expect(limiter.allow("a")).toBe(true);
    t += 61_000;
    expect(limiter.allow("a")).toBe(false);
    t += 86_400_000;
    expect(limiter.allow("a")).toBe(true);
  });
});
