export type Zone = 2 | 3 | 4 | 5;

export interface Occupation {
  code: string;
  title: string;
  description: string;
  /** Two-digit SOC major group, e.g. "15" */
  field: string;
  /** Official O*NET Job Zone, null when O*NET has not rated it */
  zone: Zone | null;
  /** Random Forest prediction (out-of-fold for rated occupations) */
  predictedZone: Zone;
  /** [importance 1–5, level 1–7] in the order of `skills`; empty when unrated */
  skills: [number, number][];
  /** Tool ids, see Tool */
  inDemand: number[];
  /** Hot technologies that are not also in-demand for this occupation */
  hot: number[];
  softwareCount: number;
}

export interface Tool {
  id: number;
  name: string;
  full: string;
  kind: "in-demand" | "hot";
  /** Occupations listing it as in-demand or hot */
  careers: number;
  /** Occupations listing it as in-demand */
  inDemandCareers: number;
  aliases: string[];
}

export interface ModelInfo {
  model: string;
  testSize: number;
  testAccuracy: number;
  testMacroF1: number;
  confusion: { zones: Zone[]; matrix: number[][] };
  outOfFoldAccuracy: number;
  featureImportance: { feature: string; importance: number }[];
}

export type Education =
  | "class12"
  | "diploma"
  | "bachelors-progress"
  | "bachelors-complete"
  | "masters";

export interface Profile {
  schemaVersion: 1;
  name?: string;
  education?: Education;
  branch?: string;
  /** Full O*NET tool names, so stored profiles survive a data rebuild */
  tools: string[];
  /** Self-ratings 1–5 in the order of SKILLS; 3 means "Not sure" */
  skills: number[];
  /** Field codes, max 5 */
  interests: string[];
  updatedAt: string;
  /** Set when the student pressed "Find my careers" */
  completedAt?: string;
}
