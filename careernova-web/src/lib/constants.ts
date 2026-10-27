import type { Education, Zone } from "./types";

export const SKILLS = [
  "Reading Comprehension",
  "Active Listening",
  "Writing",
  "Speaking",
  "Mathematics",
  "Science",
  "Critical Thinking",
  "Active Learning",
  "Learning Strategies",
  "Monitoring",
] as const;

export const SKILL_DESCRIPTIONS: Record<string, string> = {
  "Reading Comprehension": "Understanding written text in work documents.",
  "Active Listening": "Giving full attention to what people say, and asking good questions.",
  Writing: "Writing clearly for the people who will read it.",
  Speaking: "Explaining things out loud so others understand.",
  Mathematics: "Using maths to solve problems.",
  Science: "Using scientific methods to solve problems.",
  "Critical Thinking": "Using logic to weigh up options and spot weak points.",
  "Active Learning": "Understanding how new information affects current and future problems.",
  "Learning Strategies": "Choosing good ways to learn, or to teach, something new.",
  Monitoring: "Checking how well work is going, and correcting course.",
};

export const SKILL_TIPS: Record<string, string> = {
  "Reading Comprehension": "Read one technical article or documentation page a day and sum it up in three lines.",
  "Active Listening": "In your next group project, repeat back what others said before you reply.",
  Writing: "Write a short README for each project you build.",
  Speaking: "Explain one of your projects out loud in two minutes, then again in one.",
  Mathematics: "Work through one practice problem set a week in the area this job uses.",
  Science: "Pick one small experiment or analysis and write up the method and the result.",
  "Critical Thinking": "For each decision in a project, write down two options and why you chose one.",
  "Active Learning": "Learn one new thing a week and use it in something you are building.",
  "Learning Strategies": "Teach a classmate something you learned and notice what helped them get it.",
  Monitoring: "Keep a weekly log of what went well and what you will change.",
};

export const ZONE_LABELS: Record<Zone, string> = {
  2: "Some preparation",
  3: "Medium preparation",
  4: "Considerable preparation",
  5: "Extensive preparation",
};

/** "Usually needs ..." wording per zone */
export const ZONE_NEEDS: Record<Zone, string> = {
  2: "some training or experience",
  3: "vocational training or a diploma",
  4: "a bachelor's degree",
  5: "a master's degree or higher",
};

export const EDUCATION_OPTIONS: { value: Education; label: string }[] = [
  { value: "class12", label: "Class 12" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelors-progress", label: "Bachelor's in progress" },
  { value: "bachelors-complete", label: "Bachelor's complete" },
  { value: "masters", label: "Master's or higher" },
];

/** Assumed education → Job Zone mapping (handoff open question 6) */
export const EDUCATION_ZONE: Record<Education, Zone> = {
  class12: 2,
  diploma: 3,
  "bachelors-progress": 4,
  "bachelors-complete": 4,
  masters: 5,
};

/** Score weights (handoff open question 1) */
export const WEIGHTS = { tools: 40, skills: 30, interest: 15, prep: 15 } as const;

export const POPULAR_TOOLS = [
  "Python",
  "SQL",
  "Excel",
  "Git",
  "PowerPoint",
  "AutoCAD",
  "Photoshop",
  "Java",
  "JavaScript",
  "Linux",
  "MATLAB",
  "C++",
  "Tableau",
  "R",
];

export const MAX_INTERESTS = 5;

// From CareerNova_fixed.ipynb (stratified 5-fold CV on the training split, then the held-out test set)
export const MODEL_RESULTS: { model: string; accuracy: string; f1: string; best?: boolean }[] = [
  { model: "1D-CNN", accuracy: "70.1%", f1: "0.675", best: true },
  { model: "Logistic Regression", accuracy: "69.1%", f1: "0.662" },
  { model: "Random Forest", accuracy: "68.8%", f1: "0.669" },
  { model: "Majority-class baseline", accuracy: "36.5%", f1: "n/a" },
];

export const STORAGE_KEYS = {
  profile: "careernova.profile",
  results: "careernova.results",
  theme: "careernova.theme",
  chat: "careernova.chat",
  chatHistory: "careernova.chat.history",
} as const;
