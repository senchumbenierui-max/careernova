import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findTools } from "./cv";
import { buildPlan, matchOccupation, ownedToolIds, rankAll, relatedOccupations, toFivePoint } from "./match";
import { emptyProfile, isThinProfile } from "./profile";
import type { Occupation, Profile, Tool } from "./types";

const dataDir = path.resolve(import.meta.dirname, "../../public/data");
const occFile = JSON.parse(readFileSync(path.join(dataDir, "occupations.json"), "utf8"));
const occupations: Occupation[] = occFile.occupations;
const fields: Record<string, string> = occFile.meta.fields;
const tools: Tool[] = JSON.parse(readFileSync(path.join(dataDir, "tools.json"), "utf8"));
const toolByFull = new Map(tools.map(t => [t.full, t]));
const byName = (name: string) => tools.find(t => t.name === name)!;
const dev = occupations.find(o => o.code === "15-1252.00")!;

function profile(patch: Partial<Profile> = {}): Profile {
  return { ...emptyProfile(), completedAt: "now", ...patch };
}

function match(p: Profile, o = dev) {
  return matchOccupation(o, p, tools, ownedToolIds(p, toolByFull), fields[o.field]);
}

describe("data", () => {
  it("has the expected shape", () => {
    expect(occupations).toHaveLength(1016);
    expect(tools).toHaveLength(331);
    expect(occupations.filter(o => o.zone === null)).toHaveLength(93);
    expect(Object.keys(fields)).toHaveLength(23);
  });
});

describe("toFivePoint", () => {
  it("maps O*NET 1–7 onto 1–5", () => {
    expect(toFivePoint(1)).toBe(1);
    expect(toFivePoint(4)).toBe(3);
    expect(toFivePoint(7)).toBe(5);
  });
});

describe("matchOccupation", () => {
  it("parts always add up to the total and stay within their max", () => {
    const p = profile({ tools: ["Python", "Git", "Oracle Java"], interests: ["15"], education: "bachelors-progress" });
    for (const o of occupations.slice(0, 200)) {
      const m = match(p, o);
      expect(m.total).toBe(m.parts.reduce((s, x) => s + x.points, 0));
      for (const part of m.parts) {
        expect(part.points).toBeGreaterThanOrEqual(0);
        expect(part.points).toBeLessThanOrEqual(part.max);
      }
      expect(m.total).toBeLessThanOrEqual(100);
    }
  });

  it("explains the tools part with real counts", () => {
    const p = profile({ tools: [byName("Python").full, byName("Git").full] });
    const m = match(p);
    expect(m.have.map(t => t.name)).toEqual(expect.arrayContaining(["Python", "Git"]));
    expect(m.parts[0].reason).toContain(`of the ${dev.inDemand.length} in-demand tools`);
    expect(m.missingInDemand.some(t => t.name === "Python")).toBe(false);
  });

  it("gives full interest points only in a chosen field", () => {
    expect(match(profile({ interests: ["15"] })).parts[2].points).toBe(15);
    expect(match(profile({ interests: ["29"] })).parts[2].points).toBe(0);
  });

  it("scores preparation from education vs Job Zone", () => {
    expect(dev.zone).toBe(4);
    expect(match(profile({ education: "bachelors-progress" })).parts[3].points).toBe(12);
    expect(match(profile({ education: "masters" })).parts[3].points).toBe(15);
    expect(match(profile({ education: "diploma" })).parts[3].points).toBe(6);
    expect(match(profile({ education: "class12" })).parts[3].points).toBe(0);
  });

  it("gives partial preparation points when a career needs far less than you have", () => {
    const low = occupations.find(o => o.zone === 2)!;
    expect(match(profile({ education: "masters" }), low).parts[3].points).toBe(8);
  });

  it("never gives full tool marks for a career that lists only one tool", () => {
    const tiny = occupations.find(o => o.inDemand.length + o.hot.length === 1)!;
    const only = tools[[...tiny.inDemand, ...tiny.hot][0]];
    expect(match(profile({ tools: [only.full] }), tiny).parts[0].points).toBeLessThan(20);
  });

  it("uses the predicted zone, and says so, when O*NET has not rated a career", () => {
    const unrated = occupations.find(o => o.zone === null)!;
    const m = match(profile({ education: "masters" }), unrated);
    expect(m.parts[3].reason).toContain("our model predicts");
  });

  it("marks skills below the needed level", () => {
    const low = match(profile({ skills: Array(10).fill(1) }));
    const high = match(profile({ skills: Array(10).fill(5) }));
    expect(low.belowCount).toBeGreaterThan(0);
    expect(high.belowCount).toBe(0);
    expect(high.parts[1].points).toBe(30);
    expect(low.parts[1].points).toBeLessThan(high.parts[1].points);
  });
});

describe("rankAll", () => {
  it("puts software careers on top for a software profile", () => {
    const p = profile({
      tools: ["Python", "Structured query language SQL", "Git", "JavaScript", "Oracle Java", "Linux", "React", "Docker"],
      skills: [4, 3, 3, 3, 4, 3, 4, 4, 3, 3],
      interests: ["15"],
      education: "bachelors-progress",
    });
    const ranked = rankAll(occupations, p, tools, toolByFull, fields);
    expect(ranked).toHaveLength(1016);
    expect(ranked[0].occupation.field).toBe("15");
    expect(ranked.slice(0, 10).every((m, i, a) => i === 0 || a[i - 1].total >= m.total)).toBe(true);
  });

  it("keeps careers outside the chosen fields with tiny tool lists out of the top 10", () => {
    const p = profile({
      tools: ["Python", "Structured query language SQL", "Microsoft Excel", "Git", "Linux", "Oracle Java", "Microsoft PowerPoint", "Adobe Photoshop", "C++", "The MathWorks MATLAB", "Tableau", "R"],
      skills: [4, 3, 2, 3, 4, 3, 4, 3, 3, 3],
      interests: ["15", "27"],
      education: "bachelors-progress",
    });
    const top = rankAll(occupations, p, tools, toolByFull, fields).slice(0, 10);
    expect(top.every(m => ["15", "27"].includes(m.occupation.field) || m.toolsTotal >= 5)).toBe(true);
  });
});

describe("buildPlan", () => {
  it("starts with the most-wanted missing tool and has at most 4 steps", () => {
    const m = match(profile({ tools: ["Python"], skills: Array(10).fill(2) }));
    const plan = buildPlan(m);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.length).toBeLessThanOrEqual(4);
    expect(plan[0].title).toBe(`Learn ${m.missingInDemand[0].name}`);
    expect(plan.some(s => s.title.startsWith("Practise"))).toBe(true);
  });
});

describe("relatedOccupations", () => {
  it("returns other careers from the same field", () => {
    const related = relatedOccupations(dev, occupations);
    expect(related).toHaveLength(4);
    expect(related.every(o => o.field === dev.field && o.code !== dev.code)).toBe(true);
  });
});

describe("isThinProfile", () => {
  it("is thin with no tools and all skills at 3", () => {
    expect(isThinProfile(profile())).toBe(true);
    expect(isThinProfile(profile({ tools: ["Python"] }))).toBe(false);
    expect(isThinProfile(profile({ skills: [4, 3, 3, 3, 3, 3, 3, 3, 3, 3] }))).toBe(false);
  });
});

describe("findTools (CV)", () => {
  it("finds tools by short name, full name and alias", () => {
    const text = "Skills: Python, SQL, MS Excel, ReactJS, C++ and C#. Used Git and GitHub. Proficient in R and Java.";
    const names = findTools(text, tools).map(t => t.name);
    expect(names).toEqual(expect.arrayContaining(["Python", "SQL", "Excel", "React", "C++", "C#", "Git", "GitHub", "R", "Java"]));
  });

  it("does not match everyday words", () => {
    const text = "I wrote a word report, had access to the lab, and led a project on the edge of campus. Go team.";
    const names = findTools(text, tools).map(t => t.name);
    expect(names).not.toContain("Word");
    expect(names).not.toContain("Access");
    expect(names).not.toContain("C");
    expect(names).not.toContain("R");
  });
});
