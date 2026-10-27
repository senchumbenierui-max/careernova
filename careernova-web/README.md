# CareerNova web app

The student-facing app for CareerNova AI. Students enter their tools, rate 10 core skills and pick fields they like. The app matches them against 1,016 O\*NET occupations, explains every score in four parts, and builds a short skill-gap plan.

Built from the Figma design ("CareerNova" file, Astryx library) in React, TypeScript, Vite, Tailwind CSS v4, Radix UI, cmdk and lucide-react.

Everything except the chat assistant runs in the browser:

- **No accounts and no server storage.** The profile is saved in `localStorage`.
- **CV files are read locally and never uploaded.** PDF uses pdf.js; DOCX uses mammoth.
- **Matching runs on the student's device.**
- **The chat assistant is optional.** It uses one serverless function (`api/chat.ts`) that holds the Groq API key. See [Chat assistant](#chat-assistant).

## Run it

```bash
npm install
cp .env.example .env.local   # then paste a free Groq key into GROQ_API_KEY (optional, for the chat)
npm run dev        # http://localhost:5173, also serves /api/chat
npm test           # matching, retrieval, chat context and proxy tests (vitest)
npm run build      # production build in dist/
npm run preview    # serve the production build (no /api/chat)
```

Without a key the app works fully; the chat says it isn't set up yet.

### Deploy to Vercel

1. Import the project in Vercel with **Root Directory** set to `careernova-web`. `vercel.json` sets the Vite build and the route rewrite.
2. In Project → Settings → Environment Variables, add `GROQ_API_KEY` (and optionally `GROQ_MODEL`, `GROQ_FALLBACK_MODEL`, `ALLOWED_ORIGINS`, see `.env.example`).
3. Deploy. `api/chat.ts` becomes the function at `/api/chat`; everything else is static.

The static part alone (`dist/`) still runs on any static host, without the chat.

## Data

`public/data/*.json` is generated from `../Career_Nova_Final_Clean_Optimized_Dataset.csv`:

```bash
npm run data       # = python scripts/build_data.py  (needs pandas, scikit-learn)
```

| File | Contents |
| --- | --- |
| `occupations.json` | One record per occupation: code, title, field, Job Zone, predicted Job Zone, 10 skills (importance, level), tool ids |
| `tools.json` | The 331 in-demand and hot tools, with short display names ("SQL", not "Structured query language SQL"), usage counts and CV aliases |
| `software.json` | Full software lists, loaded only when a student opens one |
| `model.json` | Random Forest test confusion matrix, feature importances, accuracy |

The script also:

- **Recounts the skill lists.** The CSV's `*_count` columns are wrong (they only hold 0 or 1).
- **Trains the Random Forest** that predicts each occupation's Job Zone. Rated occupations get out-of-fold (5-fold CV) predictions. The 93 unrated ones are predicted by a model trained on all rated occupations.

## Matching (`src/lib/match.ts`)

| Part | Points | Rule |
| --- | --- | --- |
| Tools | 40 | In-demand tools count 1, hot technologies 0.5. Full marks at about 40% of the career's list (minimum 5 tools, maximum 15) |
| Core skills | 30 | Needed level = O\*NET level 1–7 mapped to 1–5. Weighted by importance. A skill at or above the needed level counts fully; each level below loses half of that skill's share |
| Interest | 15 | The career is in a field the student picked |
| Preparation | 15 | Education → zone (Class 12 → 2, Diploma → 3, Bachelor's → 4, Master's → 5). Full marks at or one zone below the student's level (12 when the student is on track for a bachelor's). 6 one zone above. 0 two or more zones above. 8 two or more zones below |

Parts with no O\*NET data score half marks. Unrated careers use the predicted zone, and the app says so. The 4 parts with their weights and the confusion matrix are on the How it works page.

## Chat assistant

A small retrieval-augmented (RAG) chatbot. Retrieval runs in the browser; only the answer is written by an LLM.

```
Browser                                              api/chat.ts (Vercel)          Groq
 question ─► BM25 search over 1,361 chunks ─┐
 profile summary (only if the student opts in) ├─POST─► checks limits, builds the ─► openai/gpt-oss-120b
 last 6 turns ─────────────────────────────┘        system prompt, streams text ◄─  (openai/gpt-oss-20b on 429)
```

| Part | Where | What it does |
| --- | --- | --- |
| Knowledge chunks | `src/lib/rag/chunks.ts`, `src/content/knowledge.md` | One chunk per occupation (1,016), per tool (331) and per section of `knowledge.md` (14). Numbers in `knowledge.md` are `{{placeholders}}` filled from the data, so the assistant can't quote a number the app doesn't show |
| Retrieval | `src/lib/rag/bm25.ts`, `retrieve.ts` | BM25 with light plural folding and British-to-US spelling. Pins occupations named by code or title and the career page the chat was opened from. Boosts the student's top matches |
| Personal context | `src/lib/chat/context.ts` | Education, branch, tools, skill ratings, interests and the top 5 matches with their four parts and plan. Never the name or CV text. Sent only when the profile is finished **and** "Use my profile" is ticked |
| Proxy | `api/_chat.ts` | Holds the key, owns the system prompt (honesty rules, general-only mode, citation format), validates size and shape, rate-limits per IP, falls back to the smaller model when the first is out of quota, streams plain text. Stores and logs nothing |
| UI | `src/components/chat/` | "Ask CareerNova" button on every page except the profile steps. First-use notice, opt-in checkbox, suggested questions, streamed answers, codes like `[15-2051.00]` become career links (unknown codes stay plain text), "Based on N sources" list |

**Modes.** *General* (no finished profile, or sharing off): the request carries no profile data, and the prompt tells the model it knows nothing about the student and to point personal questions to the profile builder. *Personal*: adds the profile summary.

**Retrieval eval.** `src/lib/rag/eval.json` has 31 hand-written questions (knowledge, named careers, paraphrases, tools). `npm test` prints recall@5; it is **0.95** now (0.83 before plural/stopword/spelling fixes and tool chunks). The questions were written by the developer and used while making those fixes, so treat 0.95 as optimistic; a held-out set written by other students would be a fairer measure. Known misses: "I want to design buildings" (BM25 can't match paraphrases to Architects) and only one of two tool chunks for "Python and SQL".

**Free-tier budget.** A request is about 2,000 to 3,000 tokens with 5 sources (about 800 tokens of sources). Groq's free tier limits per model per day; when both models are out, the chat says to try again later. With no card on the account it can't cost money.

## Where things are

```
api/            chat.ts (Vercel function), _chat.ts (proxy logic + tests)
src/
  lib/          types, constants, data loading, matching engine, profile store, CV parsing
  lib/rag/      BM25, chunks, retriever, retrieval eval
  lib/chat/     request protocol, personal context, browser client
  content/      knowledge.md (chat knowledge base)
  components/   layout, score parts, career bits, skills chart, tool search, CV upload, chat/, ui/
  pages/        Landing, Profile (5 steps), Results, Career, Explore, HowItWorks, About, Privacy, NotFound
scripts/        build_data.py
public/data/    generated JSON
```

## Decisions on the design's open questions

| # | Question | Decision |
| --- | --- | --- |
| 1 | Score weights | 40 / 30 / 15 / 15, as designed |
| 2 | Skill scale conversion | `round((level − 1) / 6 × 4 + 1)` |
| 3 | When does a skill "meet" the level? | Your rating ≥ the converted needed level |
| 4 | Placeholder numbers | All counts are computed from the data. The landing page sample stays, labelled "Example data" |
| 5 | Confusion matrix | Real counts from the **Random Forest** test set. Career pages use the Random Forest, so the matrix matches the model you see |
| 6 | Education → zone | As designed. Overqualification (2+ zones below) scores 8 of 15, so low-preparation jobs don't flood a graduate's results |
| 7 | Compare careers | Left out of v1, as designed |
| 8 | Course links | Coursera, freeCodeCamp and YouTube search URLs |
| 9 | Logo | Blue dot plus "CareerNova" wordmark |
