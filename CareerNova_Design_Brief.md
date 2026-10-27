# CareerNova AI — Web App Design Brief

**What I need from you:** design the revamped CareerNova AI web app. That means a visual direction, the screens listed below with all their states, and a developer handoff (format in [§9](#9-handoff-deliverables)). Another Claude session will build it from your handoff. Wherever the brief says something must be shown or must be honest, treat it as a hard requirement. Everything else is open to your design judgement.

---

## 1. The product in one paragraph

CareerNova AI is a final-year B.Tech Computer Science project: an **explainable career-mentoring web app for students**. A student describes what they can already do: the tools and technologies they know, a self-rating of 10 core skills, the fields they're interested in and their education level. CareerNova then matches them against **1,016 real occupations from the U.S. O\*NET database**. For each match it shows **why** it matched, which skills and tools are **missing**, how much **preparation** the job needs, and a short **plan** to close the gap. Every number on screen has a traceable reason. Nothing is a black box.

**Audience:**

1. **Students**, roughly 18–23, in Indian engineering and science colleges, mostly on phones. They're unsure which careers fit them and what to learn next.
2. **Project examiners and the supervisor**, who will judge whether it is technically credible and honest. They will open the "How it works" page.

## 2. What exists today (being replaced)

There is a working prototype in React, Tailwind, shadcn/ui and tRPC. Its main problems:

- It's one long page: a form, then a result with 3 tabs (overview / skill gaps / roadmap).
- Its "recommendation" is hardcoded and can only ever return one of 3 careers. That is what this revamp fixes.
- Its visual style is warm cream, dark teal and coral, with a DM Serif display face. **You don't need to keep it.**

The project presentation deck uses a **blue, modern, futuristic** theme. The site should feel related to it. Avoid generic AI clichés: purple gradients, glowing orbs, glassmorphism everywhere, robot icons, "✨ AI-powered" badges.

**Tone:** a calm, credible, encouraging mentor. Treat gaps as steps to take, not verdicts. Keep the copy short and plain, for readers whose first language may not be English.

## 3. The data (design with real content)

Every occupation has these fields. The example values are real, for **Software Developers** (`15-1252.00`):

| Field | Example | Notes for design |
| --- | --- | --- |
| `title` | Software Developers | Up to 105 characters (e.g. "First-Line Supervisors of Landscaping, Lawn Service, and Groundskeeping Workers"). **Long titles must wrap gracefully.** |
| `code` | 15-1252.00 | O\*NET-SOC code. The first 2 digits give the field (see below). |
| `description` | "Research, design, and develop computer and network software or specialized utility programs. Analyze user needs…" | Median length is 185 characters. Some are 400+. |
| `jobZone` | 4 | Level of preparation needed, 2–5. **Missing for 93 occupations.** |
| `coreSkills` | 10 items, each with `importance` (1–5) and `level` (1–7). E.g. Critical Thinking: importance 3.88, level 4.12 | **The same 10 skills for every occupation.** Only the numbers differ. |
| `inDemandSoftware` | Python, SQL, Git, Docker, React, AWS, Kubernetes… (~30 for this job) | The tools employers want most. 285 unique across the dataset. |
| `hotTechnologies` | Excel, Photoshop, Kafka, Hadoop… (100+ for this job) | Trending technologies. 176 unique. Lists can be **very long**. |
| `software` | Full software list (430 for some jobs) | Very long. Never show in full by default. |

**The 10 core skills:** Reading Comprehension, Active Listening, Writing, Speaking, Mathematics, Science, Critical Thinking, Active Learning, Learning Strategies, Monitoring.

**Job Zones** (use these labels):

| Zone | Label | Typical preparation |
| --- | --- | --- |
| 2 | Some preparation | High-school level plus some training or experience |
| 3 | Medium preparation | Vocational training, diploma or associate degree |
| 4 | Considerable preparation | Bachelor's degree |
| 5 | Extensive preparation | Master's, PhD or professional degree |

**Fields** (from the code prefix; 23 in total, e.g.): Computer & Mathematical · Architecture & Engineering · Life, Physical & Social Science · Healthcare Practitioners · Business & Financial · Arts, Design, Entertainment & Media · Educational · Legal · Management · Sales · Office & Administrative · Construction · Production · Transportation · and others.

**Edge cases the design must handle:**

- Occupations with no Job Zone (show "Not rated"; never hide the card).
- Occupations with no software list.
- Tool lists of 0, 3, 30 and 400 items.
- Very long titles.

## 4. How matching works (so the UI can explain it)

The fit score is **0–100**, built from four visible parts. Each part is shown with its points and a plain-language reason.

| Part | What it compares | Example explanation |
| --- | --- | --- |
| **Tools match** (largest) | The student's tools vs the occupation's in-demand and hot technologies | "You know 6 of the 31 in-demand tools: Python, SQL, Git…" |
| **Core skills match** | The student's 10 self-ratings vs the levels the occupation needs | "Your Critical Thinking (4/5) meets this job's level; Writing is below it." |
| **Interest match** | The student's chosen fields vs the occupation's field | "In your chosen field: Computer & Mathematical" |
| **Preparation match** | The student's education level vs the Job Zone | "Needs a bachelor's degree, which you're on track for" |

**The skill gap** has two parts:

- **Missing tools**: in-demand tools first, then hot technologies, ranked by how many occupations use them.
- **Core skills below the required level**: each shown as "you" vs "needed".

**Learning links:** each missing tool gets "Find courses" links that open searches on free and well-known platforms (e.g. Coursera, freeCodeCamp, YouTube). **There is no curated course database.** Design these as search links, not as specific course cards with fake ratings, prices or durations.

**The trained ML model's role.** The project also trained a classifier that predicts an occupation's Job Zone from its skill and technology profile. It reaches about 69–70% cross-validated accuracy, against a 36.5% baseline. The occupation detail page shows **O\*NET's official Job Zone** and the **model's predicted Job Zone** side by side, agreeing or not. Its full results go on the "How it works" page.

## 5. Honesty rules (hard requirements)

- **No invented numbers.** That means no "trusted by 10,000 students", no "95% accuracy", no salary figures (not in the data), no star ratings.
- **The only performance figures allowed are these:**
  - 1D-CNN: 70.1% CV accuracy, macro F1 0.675
  - Random Forest: 68.8%, macro F1 0.669
  - Logistic Regression: 69.1%, macro F1 0.662
  - Majority-class baseline: 36.5%
  - Test accuracy: 64.9–66.0% across the three models
- **The fit score is a match score, not a probability.** Never label it "confidence" or "% chance of success".
- **Credit O\*NET** as the data source in the footer and on the "How it works" page: "Includes information from O\*NET by the U.S. Department of Labor."
- **Explain that the data is U.S.-based**, briefly and without alarm: occupations and tools translate well, local job titles may differ.

## 6. Screens

The main flow is: Landing → Profile builder → Results → Occupation detail. The Explore and How it works pages are reachable from the navigation.

### 6.1 Landing (`/`)

- **Hero:** a short value proposition, e.g. "Find careers that fit what you can already do — and see exactly what to learn next.", with a primary button "Build my profile" and a secondary "Explore 1,016 careers".
- **A three-step "how it works" strip:** Tell us your skills → See matched careers with reasons → Get your skill-gap plan.
- **A visual of an explainable result**, e.g. a sample fit-score breakdown. It must be clearly a sample.
- **Credibility section:** real data (O\*NET, 1,016 occupations, 285 in-demand tools), plus "every score is explained". A link to How it works.
- **Footer:** project credit "B.Tech CSE project by Senchumbeni C Erui · Supervisor: Ma'am Salam Ameeta", the O\*NET attribution and the About link.

### 6.2 Profile builder (`/profile`)

A multi-step form with a progress indicator. Steps can be revisited, and progress is kept if the student navigates away (stored locally; there are no accounts).

1. **About you.** Name (optional, used for greetings only). Education level (select: Class 12 / Diploma / Bachelor's in progress / Bachelor's complete / Master's or higher). Degree or branch (free text, optional).
2. **Your tools and technologies.** A searchable multi-select with autocomplete over the 331 known tools (in-demand and hot combined). Popular tools appear as one-tap chips (Excel, Python, SQL, PowerPoint, AutoCAD, Photoshop, Java, Git…). Selected tools appear as removable chips.
   - **Optional CV upload** (PDF, DOCX or TXT, max 8 MB). It pre-fills tools found in the CV for the student to review. It needs these states: idle, reading, found N tools (review), nothing found, and errors (wrong type, too large, unreadable).
3. **Rate your core skills.** The 10 core skills, each with a 1–5 control and a one-line plain description. Example: "Active Learning: understanding how new information affects current and future problems." There's a "Not sure" default at 3, and the step should be quick on a phone.
4. **Your interests.** Pick 1–5 fields from the 23. Large tappable cards or chips with icons.
5. **Review.** A summary of everything, with edit links per section and a "Find my careers" button.

**Validation:** at least 1 tool or a completed skill rating, and at least 1 interest. Show messages inline, never as alerts.

### 6.3 Results (`/results`)

- **Header:** a greeting ("Here's where your profile fits best, Asha"), a one-line profile summary, and an "Edit profile" button.
- **Top match:** a large card with:
  - the title, field and Job Zone badge
  - the fit score 0–100
  - **the 4-part score breakdown** (mini bars with points)
  - the top 3 matched tools
  - the top 3 missing tools
  - an "Open career plan" button
- **More matches:** the next ~9 occupations as a compact list or grid, each showing title, field, fit score, Job Zone and "x of y tools".
- **Filters and sort:** by field, by Job Zone (preparation level), and "show only careers that need ≤ my education".
- **Comparing 2–3 careers side by side** would be nice to have. Design it if it fits naturally.
- **States:**
  - Loading: matching takes about 1 second; use a skeleton.
  - Strong matches.
  - Weak matches only: no fit above 40. The tone should be encouraging, e.g. "add more tools to sharpen results".
  - Error, with retry.
  - The profile is too thin to match.

### 6.4 Occupation detail / career plan (`/career/:code`)

Opened from results, where it shows personal fit, or from Explore, where it shows general info and a prompt to build a profile.

- **Header:** title, field, code, description, and a Job Zone badge with its preparation label. Show **O\*NET's Job Zone vs the model's predicted Job Zone** with a short "what's this?" tooltip.
- **Why this fits you:** the 4-part breakdown in full, with the plain-language reasons from §4.
- **Tools:**
  - "You have" (matched): green chips
  - "Most wanted, missing" (in-demand): highlighted
  - "Also useful" (hot technologies): collapsed, with "show all N"
  - the full software list behind a "show all" link
- **Core skills chart:** the 10 skills comparing **you** vs **needed** (bars, a dumbbell chart or a radar chart; your choice, but it must stay readable on a phone and in dark mode). Gaps highlighted.
- **Your plan:** 3–5 ordered steps generated from the biggest gaps. Example: "1 · Learn SQL (used by 40 careers) — Find courses ↗". Each step has course-search links. The tone is a 30–60 day plan, not a lifetime one.
- **Related careers:** 3–4 from the same field with similar tools.

### 6.5 Explore (`/explore`)

- Search all 1,016 occupations by title or tool.
- Filters: field, Job Zone, and "uses tool X".
- Results as a list with title, field, Job Zone and its top 3 in-demand tools. It must handle 1,016 items, via pagination or virtual scrolling.
- A **field overview**: 23 field tiles with the occupation count in each.

### 6.6 How it works (`/about`)

Written for examiners as much as students.

- Data source (O\*NET), what's in it, and the U.S. note.
- **The matching method:** the 4 score parts with their weights, shown as a diagram.
- **The ML model.** The task is predicting Job Zone. Show:
  - **a results table** of the 4 models (figures from §5)
  - **a confusion matrix**, as an image or a styled grid
  - **feature importance**: avg essential-skill importance 0.35, software skill count 0.20, max essential-skill importance 0.19, hot technology count 0.15, in-demand software count 0.11
  - **a short "what we fixed" note**: the first model reported 97.8% because the answer leaked into its inputs; after the fix, accuracy is about 70%.
- **Limitations:** U.S. data, self-reported skills, no salary or demand data, and the plan is guidance.
- **Project credit.**

### 6.7 Global

- **Navigation:** logo/wordmark "CareerNova", Explore, How it works, and "My results" (when results exist).
- **Theme:** light and dark mode with a toggle; follow the system setting by default.
- **Pages:** a 404 page, and a "results expired / no profile yet" empty state.
- **No sign-in in this version.**

## 7. Components I expect

Please design these as reusable components with their variants:

- **Fit score:** large, compact and inline sizes.
- **Score breakdown:** 4 bars with labels and points.
- **Job Zone badge:** zones 2–5, plus "Not rated".
- **Model vs official comparison chip.**
- **Tool chip:** matched, missing in-demand, missing hot, neutral, and removable.
- **Tool autocomplete multi-select.**
- **Skill rating control:** 1–5.
- **Field picker card.**
- **Occupation card:** full and compact.
- **Plan step:** with course links.
- **Skills comparison chart.**
- **Stepper/progress** for the profile builder.
- **CV upload dropzone:** all states.
- **Empty, error and loading skeletons.**
- **Tooltip, info popover, toast.**

## 8. Constraints

- **Mobile first.** Design at **375px**, then **768px** and **1280px+**. No horizontal scrolling. Long tool lists must wrap or collapse.
- **Accessibility:**
  - WCAG AA contrast in both themes.
  - Visible focus states, and every control usable by keyboard.
  - Never communicate by color alone. Matched/missing chips also need an icon or label.
  - Charts need a text or table alternative.
  - Respect reduced-motion settings.
- **Implementation stack:** React, Tailwind CSS and shadcn/ui (Radix) components, Recharts for charts and lucide-react icons. Fonts from Google Fonts. Please design with things these can build. Custom illustrations are fine as SVG.
- **Motion:** subtle and purposeful (score count-up, step transitions). Nothing that delays reading results.
- **Performance:** the app is light and fast on mid-range Android phones on slow connections. No heavy hero video or 3D.

## 9. Handoff deliverables

Please give me:

1. **Design tokens:** colors (light and dark), type scale with font families, spacing, radii, shadows and breakpoints, as CSS variables or a Tailwind theme snippet.
2. **Every screen** in §6 at mobile and desktop widths, including the listed states. Where a state is a small change, an annotated variant is enough.
3. **A component spec** for each item in §7: anatomy, variants, sizes, states (default, hover, focus, disabled, error), and which shadcn/ui primitive it extends.
4. **The copy:** all headings, button labels, helper text, empty, error and loading messages, and tooltips. Write final copy, not lorem ipsum.
5. **Interaction notes:** step navigation, filtering, expand/collapse behavior, chart interactions, and what persists locally.
6. **Assets:** logo or wordmark, icons beyond lucide, and illustrations, as SVG.
7. **Open questions:** anything you had to assume, listed clearly.

If you produce HTML/CSS prototypes, include them. The developer can lift structure and tokens directly from them.
