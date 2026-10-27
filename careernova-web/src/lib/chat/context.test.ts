import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Dataset } from "../data";
import { emptyProfile } from "../profile";
import type { Profile, Tool } from "../types";
import { buildChatRequest, chatMode, profileSummary } from "./context";

const dataDir = path.resolve(import.meta.dirname, "../../../public/data");
const read = (file: string) => JSON.parse(readFileSync(path.join(dataDir, file), "utf8"));
const occFile = read("occupations.json");
const tools: Tool[] = read("tools.json");
const data = {
  occupations: occFile.occupations,
  byCode: new Map(occFile.occupations.map((o: { code: string }) => [o.code, o])),
  tools,
  toolByFull: new Map(tools.map(t => [t.full, t])),
  toolByName: new Map(tools.map(t => [t.name.toLowerCase(), t])),
  fields: occFile.meta.fields,
  fieldCounts: {},
  stats: occFile.meta.stats,
  model: read("model.json"),
} as Dataset;

const python = tools.find(t => t.name === "Python")!.full;
const sql = tools.find(t => t.full.includes("SQL") && t.name === "SQL")!.full;

function student(patch: Partial<Profile> = {}): Profile {
  return {
    ...emptyProfile(),
    name: "Asha Zeliang",
    branch: "Mechatronics Quokka",
    education: "bachelors-progress",
    tools: [python, sql],
    skills: [4, 4, 3, 3, 5, 3, 4, 4, 3, 3],
    interests: ["15"],
    completedAt: "2026-10-01",
    ...patch,
  };
}

const ask = (profile: Profile | null, sharesProfile: boolean, viewingCode?: string) =>
  buildChatRequest({ question: "What should I learn first?", history: [], profile, sharesProfile, data, viewingCode }).request;

describe("chatMode", () => {
  it("is personal only with a finished profile and consent", () => {
    expect(chatMode(null, true)).toBe("general");
    expect(chatMode(student({ completedAt: undefined }), true)).toBe("general");
    expect(chatMode(student(), false)).toBe("general");
    expect(chatMode(student(), true)).toBe("personal");
  });
});

describe("general mode", () => {
  it("sends nothing from the profile", () => {
    for (const request of [ask(student(), false), ask(student({ completedAt: undefined }), true)]) {
      expect(request.mode).toBe("general");
      expect(request.profile).toBeUndefined();
      const body = JSON.stringify(request);
      expect(body).not.toContain("Asha");
      expect(body).not.toContain("Quokka");
      expect(body).not.toContain("Bachelor");
      expect(body).not.toContain("match score");
    }
  });

  it("still pins the career page the chat was opened from", () => {
    expect(ask(null, false, "17-2051.00").sources[0].id).toBe("occ:17-2051.00");
  });
});

describe("personal mode", () => {
  it("summarises the profile without the name", () => {
    const request = ask(student(), true);
    expect(request.mode).toBe("personal");
    expect(request.profile).toContain("Education: Bachelor's in progress");
    expect(request.profile).toContain("Tools: Python, SQL");
    expect(request.profile).toContain("Branch: Mechatronics Quokka");
    expect(request.profile).not.toContain("Asha");
  });

  it("lists top matches with their four parts and a plan", () => {
    const { text, topCodes } = profileSummary(student(), data);
    expect(topCodes).toHaveLength(5);
    expect(text).toMatch(/1\. .+ \(\d{2}-\d{4}\.\d{2}\): match score \d+\/100\. Tools \d+\/40, Core skills \d+\/30, Interest \d+\/15, Preparation \d+\/15\./);
    expect(text).toContain("not a probability");
    expect(text).toContain("Plan: ");
  });

  it("adds the career being viewed when it is not a top match", () => {
    const { text } = profileSummary(student(), data, "35-2014.00");
    expect(text).toContain("Career the student is viewing now:");
    expect(text).toContain("Cooks, Restaurant (35-2014.00)");
  });
});

describe("request limits", () => {
  it("keeps 6 turns of history and trims long text", () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 ? "assistant" : "user") as "user" | "assistant",
      content: "x".repeat(3000),
    }));
    const { request } = buildChatRequest({ question: "q".repeat(900), history, profile: null, sharesProfile: false, data });
    expect(request.messages).toHaveLength(12);
    expect(request.messages[0].content).toHaveLength(2000);
    expect(request.messages.at(-1)).toEqual({ role: "user", content: "q".repeat(500) });
    expect(new TextEncoder().encode(JSON.stringify(request)).length).toBeLessThan(40_000);
  });
});
