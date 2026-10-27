import knowledgeMd from "@/content/knowledge.md?raw";
import { MODEL_RESULTS, SKILLS, WEIGHTS, ZONE_LABELS, ZONE_NEEDS } from "../constants";
import type { Dataset } from "../data";
import { toFivePoint } from "../match";
import type { Tool, Zone } from "../types";

export interface Chunk {
  /** "occ:15-1252.00", "tool:12" or "kb:what-a-job-zone-is" */
  id: string;
  kind: "occupation" | "tool" | "knowledge";
  title: string;
  /** Occupation code, for occupation chunks */
  code?: string;
  /** What the LLM reads */
  text: string;
  /** What BM25 indexes. Leaves out words every occupation shares ("zone", "skills"), which would drown the knowledge chunks. */
  indexText: string;
}

export type CorpusData = Pick<Dataset, "occupations" | "tools" | "fields" | "stats" | "model">;

const TOOLS_SHOWN = 12;
const SKILLS_SHOWN = 4;

const percent = (x: number) => `${Math.round(x * 1000) / 10}%`;

function zoneLine(zone: Zone) {
  return `${zone}, ${ZONE_LABELS[zone].toLowerCase()} (usually needs ${ZONE_NEEDS[zone]})`;
}

/** Most widely used first, so the shortened list keeps the tools students are likeliest to know */
function toolNames(ids: number[], tools: Tool[]) {
  return ids.map(id => tools[id]).sort((a, b) => b.careers - a.careers || a.name.localeCompare(b.name));
}

function listWithCount(names: string[]) {
  const shown = names.slice(0, TOOLS_SHOWN).join(", ");
  return names.length > TOOLS_SHOWN ? `${shown} (${TOOLS_SHOWN} of ${names.length})` : shown;
}

function occupationChunks(data: CorpusData): Chunk[] {
  return data.occupations.map(o => {
    const field = data.fields[o.field] ?? "Other";
    const inDemand = toolNames(o.inDemand, data.tools).map(t => t.name);
    const hot = toolNames(o.hot, data.tools).map(t => t.name);
    const topSkills = o.skills
      .map(([importance, level], i) => ({ name: SKILLS[i], importance, level }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, SKILLS_SHOWN)
      .map(s => `${s.name} (needed level ${toFivePoint(s.level)} of 5)`);

    const lines = [
      `${o.title} (${o.code})`,
      `Field: ${field}`,
      o.zone
        ? `Job Zone: ${zoneLine(o.zone)}`
        : `Job Zone: not rated by O*NET. Predicted zone: ${zoneLine(o.predictedZone)}`,
      `Description: ${o.description}`,
      topSkills.length ? `Most important core skills: ${topSkills.join("; ")}` : "Core skills: no O*NET data",
      inDemand.length ? `In-demand tools: ${listWithCount(inDemand)}` : "In-demand tools: none listed",
      hot.length ? `Hot technologies: ${listWithCount(hot)}` : null,
    ];

    return {
      id: `occ:${o.code}`,
      kind: "occupation",
      title: o.title,
      code: o.code,
      text: lines.filter(Boolean).join("\n"),
      // Title twice, so a title hit outweighs a passing mention in another career's description
      indexText: [o.title, o.title, field, o.description, ...inDemand, ...hot].join(" "),
    };
  });
}

const CAREERS_SHOWN = 25;

/** "Which careers use X?" is a lookup, not a text search, so each tool gets a chunk listing its careers */
function toolChunks(data: CorpusData): Chunk[] {
  const inDemandFor = new Map<number, string[]>();
  const hotFor = new Map<number, number>();
  for (const o of data.occupations) {
    for (const id of o.inDemand) inDemandFor.set(id, [...(inDemandFor.get(id) ?? []), `${o.title} (${o.code})`]);
    for (const id of o.hot) hotFor.set(id, (hotFor.get(id) ?? 0) + 1);
  }

  return data.tools.map(t => {
    const careers = (inDemandFor.get(t.id) ?? []).sort((a, b) => a.localeCompare(b));
    const hot = hotFor.get(t.id) ?? 0;
    const shown = careers.slice(0, CAREERS_SHOWN).join("; ");
    const lines = [
      t.name === t.full ? t.name : `${t.name} (${t.full})`,
      `In-demand for ${careers.length} careers. A hot technology for ${hot} more.`,
      careers.length
        ? `Careers that list it as in-demand${careers.length > CAREERS_SHOWN ? `, first ${CAREERS_SHOWN} of ${careers.length} by title` : ""}: ${shown}`
        : null,
    ];
    return {
      id: `tool:${t.id}`,
      kind: "tool",
      title: t.name,
      text: lines.filter(Boolean).join("\n"),
      indexText: [t.name, t.name, t.full, ...t.aliases].join(" "),
    };
  });
}

function placeholders(data: CorpusData): Record<string, string> {
  const { model } = data;
  return {
    occupations: data.occupations.length.toLocaleString("en-IN"),
    unrated: String(data.occupations.filter(o => !o.zone).length),
    inDemandUnique: String(data.stats.inDemandUnique),
    hotUnique: String(data.stats.hotUnique),
    zones: ([2, 3, 4, 5] as Zone[]).map(z => `zone ${z} is ${ZONE_LABELS[z].toLowerCase()} (${ZONE_NEEDS[z]})`).join("; "),
    skills: SKILLS.join(", "),
    "w.tools": String(WEIGHTS.tools),
    "w.skills": String(WEIGHTS.skills),
    "w.interest": String(WEIGHTS.interest),
    "w.prep": String(WEIGHTS.prep),
    modelResults: MODEL_RESULTS.map(r =>
      r.f1 === "n/a" ? `${r.model} ${r.accuracy} accuracy` : `${r.model} ${r.accuracy} accuracy and ${r.f1} macro F1`,
    ).join("; "),
    testSize: String(model.testSize),
    rfTestAccuracy: percent(model.testAccuracy),
    rfTestF1: model.testMacroF1.toFixed(3),
    rfOutOfFold: percent(model.outOfFoldAccuracy),
  };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function knowledgeChunks(data: CorpusData, markdown = knowledgeMd): Chunk[] {
  const values = placeholders(data);
  const fill = (s: string) =>
    s.replace(/\{\{([\w.]+)\}\}/g, (_, key: string) => {
      if (!(key in values)) throw new Error(`knowledge.md: unknown placeholder {{${key}}}`);
      return values[key];
    });

  return markdown
    .replace(/<!--[\s\S]*?-->/g, "")
    .split(/^## /m)
    .slice(1)
    .map(section => {
      const [heading, ...rest] = section.split("\n");
      const title = heading.trim();
      const body = fill(rest.join("\n").trim());
      return { id: `kb:${slug(title)}`, kind: "knowledge" as const, title, text: `${title}\n${body}`, indexText: `${title} ${title} ${body}` };
    });
}

export function buildCorpus(data: CorpusData): Chunk[] {
  return [...knowledgeChunks(data), ...toolChunks(data), ...occupationChunks(data)];
}
