import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ModelInfo, Occupation, Tool } from "../types";
import { buildIndex, scoreAll, tokenize } from "./bm25";
import { buildCorpus, knowledgeChunks, type CorpusData } from "./chunks";
import evalSet from "./eval.json";
import { createRetriever } from "./retrieve";

const dataDir = path.resolve(import.meta.dirname, "../../../public/data");
const read = (file: string) => JSON.parse(readFileSync(path.join(dataDir, file), "utf8"));
const occFile = read("occupations.json");
const data: CorpusData = {
  occupations: occFile.occupations as Occupation[],
  fields: occFile.meta.fields,
  stats: occFile.meta.stats,
  tools: read("tools.json") as Tool[],
  model: read("model.json") as ModelInfo,
};
const corpus = buildCorpus(data);
const retrieve = createRetriever(corpus);
const ids = (query: string, options?: Parameters<typeof retrieve>[1]) => retrieve(query, options).map(r => r.chunk.id);

describe("bm25", () => {
  it("drops stopwords and folds plurals", () => {
    expect(tokenize("What do Software Developers do?")).toEqual(["software", "developer"]);
    expect(tokenize("libraries, classes, analysis")).toEqual(["library", "class", "analysis"]);
  });

  it("maps British spelling to O*NET's US spelling", () => {
    expect(tokenize("analysing the programme centre")).toEqual(tokenize("analyzing the program center"));
    expect(tokenize("data analysis")).toEqual(["data", "analysis"]);
  });

  it("keeps tool names with symbols", () => {
    expect(tokenize("C++ and C#")).toEqual(["c++", "c#"]);
  });

  it("ranks the document with the rarer matching term first", () => {
    const index = buildIndex(["nurse hospital care", "hospital porter", "hospital cleaner"]);
    const scores = scoreAll(index, "nurse in a hospital");
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeCloseTo(scores[2]);
  });
});

describe("corpus", () => {
  it("has one chunk per occupation and per tool, plus the knowledge sections", () => {
    const kb = corpus.filter(c => c.kind === "knowledge");
    expect(corpus.filter(c => c.kind === "occupation")).toHaveLength(1016);
    expect(corpus.filter(c => c.kind === "tool")).toHaveLength(331);
    expect(kb.length).toBeGreaterThanOrEqual(10);
    expect(new Set(corpus.map(c => c.id)).size).toBe(corpus.length);
  });

  it("fills every placeholder from the data", () => {
    for (const c of corpus) expect(c.text).not.toMatch(/\{\{|\}\}/);
    const model = corpus.find(c => c.id === "kb:the-job-zone-prediction-model")!;
    expect(model.text).toContain(`test set of ${data.model.testSize} careers`);
    expect(model.text).toContain("64.9% accuracy");
    expect(corpus.find(c => c.id === "kb:what-a-job-zone-is")!.text).toContain("93 occupations have no official Job Zone");
  });

  it("refuses an unknown placeholder instead of sending it to the model", () => {
    expect(() => knowledgeChunks(data, "## Test\nWe have {{salaries}} salaries.")).toThrow(/salaries/);
  });

  it("labels a predicted zone as a prediction", () => {
    const unrated = corpus.find(c => c.code === "45-2099.00")!;
    expect(unrated.text).toContain("not rated by O*NET. Predicted zone: 2");
    const dev = corpus.find(c => c.code === "15-1252.00")!;
    expect(dev.text).toContain("Job Zone: 4, considerable preparation");
    expect(dev.text).toMatch(/In-demand tools: .*\(12 of 30\)/);
  });

  it("lists a tool's careers with counts from the data", () => {
    const autocad = corpus.find(c => c.id === "tool:9")!;
    expect(autocad.text).toContain("In-demand for 39 careers");
    expect(autocad.text).toContain("first 25 of 39 by title");
  });

  it("keeps words every occupation shares out of the index", () => {
    for (const c of corpus.filter(c => c.kind === "occupation")) expect(c.indexText).not.toMatch(/\bzone\b/i);
  });
});

describe("retrieve", () => {
  it("returns at most k chunks", () => {
    expect(retrieve("software", { k: 3 })).toHaveLength(3);
  });

  it("pins an occupation code typed in the question", () => {
    const [first] = retrieve("what about 29-1141.00");
    expect(first.chunk.code).toBe("29-1141.00");
    expect(first.pinned).toBe(true);
  });

  it("pins two careers named for a comparison", () => {
    const top = ids("Compare web developers and software developers").slice(0, 2);
    expect(top).toEqual(expect.arrayContaining(["occ:15-1254.00", "occ:15-1252.00"]));
  });

  it("pins the career page the chat was opened from", () => {
    expect(ids("what should I learn first?", { pinCodes: ["17-2051.00"] })[0]).toBe("occ:17-2051.00");
  });

  it("boosts the student's matches without inventing hits", () => {
    const plain = retrieve("python");
    const last = plain[plain.length - 1].chunk;
    expect(last.kind).toBe("occupation");
    expect(ids("python", { boostCodes: [last.code!] }).indexOf(last.id)).toBeLessThan(plain.length - 1);
    expect(retrieve("zzzz", { boostCodes: ["15-1252.00"] })).toEqual([]);
  });
});

type EvalQuestion = { type: string; q: string; allOf?: string[]; anyOf?: string[] };

describe("retrieval eval", () => {
  it("reports recall@k", () => {
    const { k, questions } = evalSet as { k: number; questions: EvalQuestion[] };
    const byType = new Map<string, number[]>();
    const misses: string[] = [];
    for (const item of questions) {
      const got = ids(item.q, { k });
      const recall = item.allOf
        ? item.allOf.filter(id => got.includes(id)).length / item.allOf.length
        : Number(item.anyOf!.some(id => got.includes(id)));
      if (recall < 1) misses.push(`  ${item.q}  ->  ${got.slice(0, 3).join(", ")}`);
      byType.set(item.type, [...(byType.get(item.type) ?? []), recall]);
    }
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const overall = mean([...byType.values()].flat());
    const rows = [...byType].map(([type, xs]) => `  ${type.padEnd(11)} ${mean(xs).toFixed(2)} (${xs.length})`);
    console.log(`recall@${k} ${overall.toFixed(2)}\n${rows.join("\n")}\nmisses:\n${misses.join("\n") || "  none"}`);
    // A floor, not a target: it catches regressions without hiding the misses printed above
    expect(overall).toBeGreaterThanOrEqual(0.7);
  });
});
