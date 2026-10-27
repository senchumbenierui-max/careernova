import { EDUCATION_OPTIONS, SKILLS } from "../constants";
import type { Dataset } from "../data";
import { buildPlan, rankAll, type Match } from "../match";
import { hasResults } from "../profile";
import { buildCorpus, type Chunk } from "../rag/chunks";
import { createRetriever } from "../rag/retrieve";
import type { Profile } from "../types";
import { LIMITS, type ChatMessage, type ChatMode, type ChatRequest } from "./protocol";

const TOP_MATCHES = 5;
const SOURCES = 5;

/** Personal answers need a finished profile and the student's consent. Anything else is general. */
export function chatMode(profile: Profile | null, sharesProfile: boolean): ChatMode {
  return hasResults(profile) && sharesProfile ? "personal" : "general";
}

function matchLines(m: Match, rank?: number) {
  const o = m.occupation;
  const parts = m.parts.map(p => `${p.label.replace(/ match$/, "")} ${p.points}/${p.max}`).join(", ");
  const missing = m.missingInDemand.slice(0, 5).map(t => t.name);
  const below = m.skillRows.filter(r => !r.meets).map(r => `${r.name} (you ${r.you}, needed ${r.needed})`);
  const plan = buildPlan(m).map(s => s.title);
  return [
    `${rank ? `${rank}. ` : ""}${o.title} (${o.code}): match score ${m.total}/100. ${parts}.`,
    missing.length ? `   Missing in-demand tools: ${missing.join(", ")}.` : "   Has all of its in-demand tools.",
    below.length ? `   Skills below the job's level: ${below.join("; ")}.` : "   All 10 skills meet the job's level.",
    `   Plan: ${plan.join("; ")}.`,
  ];
}

/**
 * The student's profile and best matches as plain text for the model. Leaves out the name and anything
 * from the CV beyond the tool names already in the profile.
 */
export function profileSummary(profile: Profile, data: Dataset, viewingCode?: string) {
  const matches = rankAll(data.occupations, profile, data.tools, data.toolByFull, data.fields);
  const top = matches.slice(0, TOP_MATCHES);
  const viewing = viewingCode && !top.some(m => m.occupation.code === viewingCode)
    ? matches.find(m => m.occupation.code === viewingCode)
    : undefined;

  const education = EDUCATION_OPTIONS.find(e => e.value === profile.education)?.label ?? "not given";
  const tools = profile.tools.map(full => data.toolByFull.get(full)?.name ?? full);
  const lines = [
    `Education: ${education}`,
    profile.branch ? `Branch: ${profile.branch.slice(0, 80)}` : null,
    `Tools: ${tools.length ? tools.join(", ") : "none added"}`,
    `Skill self-ratings (1 to 5, 3 also means "not sure"): ${SKILLS.map((s, i) => `${s} ${profile.skills[i]}`).join(", ")}`,
    `Interest fields: ${profile.interests.map(f => data.fields[f] ?? f).join(", ") || "none picked"}`,
    `Top ${top.length} matches (match score out of 100 measures overlap, not a probability):`,
    ...top.flatMap((m, i) => matchLines(m, i + 1)),
    ...(viewing ? ["Career the student is viewing now:", ...matchLines(viewing)] : []),
  ];
  return {
    text: lines.filter(l => l !== null).join("\n").slice(0, LIMITS.profileChars),
    topCodes: top.map(m => m.occupation.code),
  };
}

const retrievers = new WeakMap<Dataset, ReturnType<typeof createRetriever>>();

/** Builds the search index once per dataset (about 50 ms) */
export function retrieverFor(data: Dataset) {
  let retrieve = retrievers.get(data);
  if (!retrieve) {
    retrieve = createRetriever(buildCorpus(data));
    retrievers.set(data, retrieve);
  }
  return retrieve;
}

export interface BuildOptions {
  question: string;
  /** Earlier turns, oldest first */
  history: ChatMessage[];
  profile: Profile | null;
  sharesProfile: boolean;
  data: Dataset;
  /** The career page the chat was opened from */
  viewingCode?: string;
}

export function buildChatRequest({ question, history, profile, sharesProfile, data, viewingCode }: BuildOptions): {
  request: ChatRequest;
  sources: Chunk[];
} {
  const mode = chatMode(profile, sharesProfile);
  const personal = mode === "personal" ? profileSummary(profile!, data, viewingCode) : undefined;
  const retrieved = retrieverFor(data)(question, {
    k: SOURCES,
    pinCodes: viewingCode ? [viewingCode] : undefined,
    boostCodes: personal?.topCodes,
  });

  const messages: ChatMessage[] = [
    ...history.slice(-(LIMITS.messages - 1)).map(m => ({ role: m.role, content: m.content.slice(0, LIMITS.messageChars) })),
    { role: "user", content: question.slice(0, LIMITS.questionChars) },
  ];
  const request: ChatRequest = {
    mode,
    messages,
    sources: retrieved.map(r => ({ id: r.chunk.id, text: r.chunk.text.slice(0, LIMITS.sourceChars) })),
    ...(personal ? { profile: personal.text } : {}),
  };
  return { request, sources: retrieved.map(r => r.chunk) };
}
