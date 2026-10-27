/**
 * CareerNova matching: compares a student profile with one occupation and explains
 * the result in four parts that add up to a 0–100 match score.
 *
 *   Tools        40  in-demand tools count fully, hot technologies count half;
 *                    full marks need about 40% of the career's tool list, at least 5 and
 *                    at most 15 tools (so a career listing only 1–2 tools can't give full marks)
 *   Core skills  30  importance-weighted: a skill at or above the needed level counts fully,
 *                    each level below loses half of that skill's share
 *   Interest     15  occupation is in a field the student picked
 *   Preparation  15  Job Zone vs the student's education level: full at or one zone below,
 *                    6 one zone above, 0 beyond that, 8 when two or more zones below
 *
 * Parts with no O*NET data count as neutral (half marks) so missing data never
 * pushes a career to the top or bottom.
 */
import { EDUCATION_ZONE, SKILLS, SKILL_TIPS, WEIGHTS, ZONE_NEEDS } from "./constants";
import type { Occupation, Profile, Tool, Zone } from "./types";
import { joinNames, plural } from "./utils";

export type PartKey = "tools" | "skills" | "interest" | "prep";

export interface ScorePart {
  key: PartKey;
  label: string;
  points: number;
  max: number;
  reason: string;
}

export interface SkillRow {
  name: string;
  you: number;
  /** O*NET level (1–7) converted to the 1–5 scale */
  needed: number;
  importance: number;
  meets: boolean;
}

export interface Match {
  occupation: Occupation;
  total: number;
  parts: ScorePart[];
  /** Tools the student has, in-demand first */
  have: Tool[];
  /** In-demand tools the student lacks, most wanted across the dataset first */
  missingInDemand: Tool[];
  /** Hot technologies the student lacks */
  missingHot: Tool[];
  /** Size of in-demand ∪ hot for this occupation */
  toolsTotal: number;
  inDemandHave: number;
  skillRows: SkillRow[];
  belowCount: number;
}

export interface PlanStep {
  title: string;
  why: string;
  searchTopic: string;
}

export const PART_LABELS: Record<PartKey, string> = {
  tools: "Tools match",
  skills: "Core skills match",
  interest: "Interest match",
  prep: "Preparation match",
};

/** O*NET skill level (1–7) onto the student's 1–5 scale (handoff open question 2) */
export function toFivePoint(level: number) {
  return Math.min(5, Math.max(1, Math.round(((level - 1) / 6) * 4 + 1)));
}

export function zoneFor(o: Occupation): { zone: Zone; predicted: boolean } {
  return o.zone ? { zone: o.zone, predicted: false } : { zone: o.predictedZone, predicted: true };
}

function toolsPart(o: Occupation, owned: Set<number>, tools: Tool[]) {
  const inDemand = o.inDemand.map(id => tools[id]);
  const hot = o.hot.map(id => tools[id]);
  const haveD = inDemand.filter(t => owned.has(t.id));
  const haveH = hot.filter(t => owned.has(t.id));
  const max = WEIGHTS.tools;

  let points: number;
  let reason: string;
  if (inDemand.length + hot.length === 0) {
    points = max / 2;
    reason = "O*NET lists no software for this career, so this part counts as neutral.";
  } else {
    // A short list is weak evidence: knowing 1 of 1 tools should not be full marks
    const available = inDemand.length + hot.length / 2;
    const target = Math.max(5, Math.min(15, available * 0.4));
    points = Math.round(max * Math.min(1, (haveD.length + haveH.length / 2) / target));
    if (inDemand.length === 0) {
      reason = haveH.length
        ? `You know ${haveH.length} of the ${hot.length} hot technologies: ${joinNames(haveH.slice(0, 6).map(t => t.name))}.`
        : `You don't have any of the ${hot.length} hot technologies for this career yet.`;
    } else if (haveD.length) {
      reason = `You know ${haveD.length} of the ${inDemand.length} in-demand tools: ${joinNames(haveD.slice(0, 6).map(t => t.name))}.`;
    } else {
      reason = `You don't have any of the ${inDemand.length} in-demand tools yet.`;
      if (haveH.length) reason += ` You know ${plural(haveH.length, "other useful tool")}: ${joinNames(haveH.slice(0, 4).map(t => t.name))}.`;
    }
  }

  const byWanted = (a: Tool, b: Tool) => b.inDemandCareers - a.inDemandCareers || b.careers - a.careers;
  return {
    part: { key: "tools" as const, label: PART_LABELS.tools, points, max, reason },
    have: [...haveD, ...haveH],
    missingInDemand: inDemand.filter(t => !owned.has(t.id)).sort(byWanted),
    missingHot: hot.filter(t => !owned.has(t.id)).sort((a, b) => b.careers - a.careers),
    toolsTotal: inDemand.length + hot.length,
    inDemandHave: haveD.length,
  };
}

function skillsPart(o: Occupation, profile: Profile) {
  const max = WEIGHTS.skills;
  if (o.skills.length !== SKILLS.length) {
    return {
      part: { key: "skills" as const, label: PART_LABELS.skills, points: max / 2, max, reason: "O*NET has no skill ratings for this career, so this part counts as neutral." },
      rows: [] as SkillRow[],
    };
  }
  const rows: SkillRow[] = SKILLS.map((name, i) => {
    const [importance, level] = o.skills[i];
    const you = profile.skills[i] ?? 3;
    const needed = toFivePoint(level);
    return { name, you, needed, importance, meets: you >= needed };
  });
  let weighted = 0;
  let totalImportance = 0;
  for (const r of rows) {
    const share = r.meets ? 1 : Math.max(0, 1 - (r.needed - r.you) / 2);
    weighted += r.importance * share;
    totalImportance += r.importance;
  }
  const below = rows.filter(r => !r.meets);
  const meets = rows.length - below.length;
  const reason = below.length
    ? `${meets} of 10 skills meet this job's level. ${joinNames(below.map(r => r.name))} ${below.length === 1 ? "is" : "are"} below it.`
    : "All 10 skills meet this job's level.";
  return {
    part: { key: "skills" as const, label: PART_LABELS.skills, points: Math.round((max * weighted) / totalImportance), max, reason },
    rows,
  };
}

function interestPart(o: Occupation, profile: Profile, fieldName: string): ScorePart {
  const max = WEIGHTS.interest;
  const inField = profile.interests.includes(o.field);
  return {
    key: "interest",
    label: PART_LABELS.interest,
    points: inField ? max : 0,
    max,
    reason: inField ? `In your chosen field: ${fieldName}.` : `Not in a field you picked (${fieldName}).`,
  };
}

function prepPart(o: Occupation, profile: Profile): ScorePart {
  const max = WEIGHTS.prep;
  const label = PART_LABELS.prep;
  const { zone, predicted } = zoneFor(o);
  const prefix = predicted ? `O*NET has not rated this career; our model predicts Zone ${zone}. ` : "";
  if (!profile.education) {
    return { key: "prep", label, points: Math.round(max / 2), max, reason: `${prefix}Add your education level to score this part.` };
  }
  const yours = EDUCATION_ZONE[profile.education];
  const needs = ZONE_NEEDS[zone];
  let points: number;
  let reason: string;
  if (zone <= yours - 2) {
    points = 8;
    reason = `Needs ${needs}, much less preparation than you have.`;
  } else if (zone <= yours) {
    const onTrack = profile.education === "bachelors-progress" && zone === 4;
    points = onTrack ? 12 : max;
    reason = onTrack ? `Needs ${needs}, which you are on track for.` : `Needs ${needs}, which you have.`;
  } else if (zone === yours + 1) {
    points = 6;
    reason = `Usually needs ${needs}, one step beyond your current level.`;
  } else {
    points = 0;
    reason = `Usually needs ${needs}, well beyond your current level.`;
  }
  return { key: "prep", label, points, max, reason: prefix + reason };
}

export function matchOccupation(
  o: Occupation,
  profile: Profile,
  tools: Tool[],
  owned: Set<number>,
  fieldName: string,
): Match {
  const t = toolsPart(o, owned, tools);
  const s = skillsPart(o, profile);
  const parts = [t.part, s.part, interestPart(o, profile, fieldName), prepPart(o, profile)];
  return {
    occupation: o,
    total: parts.reduce((sum, p) => sum + p.points, 0),
    parts,
    have: t.have,
    missingInDemand: t.missingInDemand,
    missingHot: t.missingHot,
    toolsTotal: t.toolsTotal,
    inDemandHave: t.inDemandHave,
    skillRows: s.rows,
    belowCount: s.rows.filter(r => !r.meets).length,
  };
}

export function ownedToolIds(profile: Profile, toolByFull: Map<string, Tool>) {
  const ids = new Set<number>();
  for (const name of profile.tools) {
    const tool = toolByFull.get(name);
    if (tool) ids.add(tool.id);
  }
  return ids;
}

export function rankAll(
  occupations: Occupation[],
  profile: Profile,
  tools: Tool[],
  toolByFull: Map<string, Tool>,
  fields: Record<string, string>,
): Match[] {
  const owned = ownedToolIds(profile, toolByFull);
  return occupations
    .map(o => matchOccupation(o, profile, tools, owned, fields[o.field] ?? "Other"))
    .sort(
      (a, b) =>
        b.total - a.total || b.inDemandHave - a.inDemandHave || a.occupation.title.localeCompare(b.occupation.title),
    );
}

/** A short 30–60 day plan from the biggest gaps: most-wanted tools first, then the widest skill gap. */
export function buildPlan(m: Match): PlanStep[] {
  const toolSteps: PlanStep[] = m.missingInDemand.slice(0, 3).map((t, i) => ({
    title: `Learn ${t.name}`,
    why:
      i === 0
        ? `Most-wanted tool you are missing. Used by ${t.careers} careers in the dataset.`
        : i === 1
          ? `In-demand for this job and ${t.inDemandCareers - 1} others.`
          : `Asked for by employers in ${t.inDemandCareers} careers, including this one.`,
    searchTopic: t.name,
  }));
  if (toolSteps.length === 0) {
    for (const t of m.missingHot.slice(0, 2)) {
      toolSteps.push({
        title: `Learn ${t.name}`,
        why: `A hot technology for this job, used by ${t.careers} careers in the dataset.`,
        searchTopic: t.name,
      });
    }
  }

  const skillSteps: PlanStep[] = m.skillRows
    .filter(r => !r.meets)
    .sort((a, b) => (b.needed - b.you) * b.importance - (a.needed - a.you) * a.importance)
    .slice(0, 2)
    .map(r => ({
      title: `Practise ${r.name.toLowerCase()}`,
      why: `Your ${r.name} is ${r.needed - r.you} below this job's level. ${SKILL_TIPS[r.name]}`,
      searchTopic: `${r.name} skills`,
    }));

  // Interleave: tool, tool, skill, then whatever is left
  const ordered = [...toolSteps.slice(0, 2), ...skillSteps.slice(0, 1), ...toolSteps.slice(2), ...skillSteps.slice(1)];
  const steps = ordered.slice(0, 4);
  if (steps.length === 0) {
    const tool = m.have[0]?.name;
    steps.push({
      title: "Show what you can do",
      why: `You already cover this job's most-wanted tools and skill levels. Build a small project${tool ? ` with ${tool}` : ""} and share it.`,
      searchTopic: `${m.occupation.title} project ideas`,
    });
  }
  return steps;
}

/** Same field, most similar tool lists (Jaccard). */
export function relatedOccupations(o: Occupation, all: Occupation[], limit = 4) {
  const mine = new Set([...o.inDemand, ...o.hot]);
  return all
    .filter(x => x.field === o.field && x.code !== o.code)
    .map(x => {
      const theirs = [...x.inDemand, ...x.hot];
      const shared = theirs.filter(id => mine.has(id)).length;
      const union = mine.size + theirs.length - shared;
      return { occupation: x, similarity: union ? shared / union : 0 };
    })
    .sort((a, b) => b.similarity - a.similarity || a.occupation.title.localeCompare(b.occupation.title))
    .slice(0, limit)
    .map(x => x.occupation);
}
