# CLAUDE.md

Student B.Tech final-year project: **CareerNova AI**. The ML part predicts an O\*NET occupation's `Job_Zone` (classes 2–5) from skill and technology features. See `README.md` for the dataset, method and results. This is not a git repo.

## Files

- `CareerNova_fixed.ipynb`: the main notebook. Edit this one.
- `CNN.ipynb`: the original notebook, which has target leakage. Keep it unchanged as a historical reference.
- `Career_Nova_Final_Clean_Optimized_Dataset.csv`: 1016 rows × 19 columns. The notebook loads it by relative path.
- `Blue Modern Futuristic Presentation.pptx`: project review slides. It is a binary file; read its text by unzipping `ppt/slides/slide*.xml`.
- `careernova-web/`: the student web app (React + Vite, runs in the browser, plus one serverless chat proxy for Vercel). See `careernova-web/README.md`.
- `CareerNova_Design_Brief.md`: the brief sent to Claude for the app design. The resulting Figma file is `https://www.figma.com/design/bybmqOX9nRW5epKnZo2UJR` (page "CareerNova", handoff notes in frame "06 Handoff notes").
- `report_analysis.py`: supplementary analyses for the report (bootstrap CIs, ordinal error, feature ablation). Writes `report_analysis_results.json`. It takes the CNN's and Random Forest's test predictions from their stored confusion matrices, because the forest's numbers change between scikit-learn versions.
- `CareerNova_AI_Mini_Project_Report_Final.docx` / `.pdf`: the final report (Senchumbeni C Erui, Reg. No. 2306107014). The student's own half draft is in `~/Downloads/CareerNova_AI_Mini_Project_Report.docx`; leave it untouched.
- `.venv/`: empty. Nothing is installed in it.

## Environment

- Packages are installed in the system Python 3.9 (`C:\Users\mongj\AppData\Local\Programs\Python\Python39\python.exe`), not in `.venv`: TensorFlow 2.20, scikit-learn 1.6.1, pandas 2.3.3, matplotlib 3.9.4.
- `nbconvert`, `nbclient` and `ipykernel` are **not** installed. To run the notebook headlessly, load the `.ipynb` JSON and `exec` its code cells in order, using matplotlib's `Agg` backend and patching `plt.show` to save figures to the scratchpad. A full run takes a few minutes, mostly CNN cross-validation.
- TensorFlow prints oneDNN and "retracing" warnings during the CV loop. Both are harmless.

## Web app (`careernova-web/`)

- Node 24 and npm are available. Commands: `npm run dev`, `npm test` (vitest, matching engine), `npm run build`, `npm run data` (regenerates `public/data/*.json` from the CSV and retrains the Random Forest).
- Rerun `npm run data` whenever the CSV or `scripts/build_data.py` changes. Matching (`src/lib/match.ts`), CV parsing and storage all run in the browser.
- The only server code is the chat proxy: `api/chat.ts` (Vercel function) wrapping `api/_chat.ts`. It needs `GROQ_API_KEY` (in `.env.local` for `npm run dev`, which serves `/api/chat` through a Vite middleware; in Vercel's environment variables in production). Never put the key in a `VITE_` variable or in client code. Files under `api/` can't use the `@/` alias and import with `.js` extensions.
- Chat retrieval is BM25 in the browser (`src/lib/rag/`). `npm test` prints recall@5 on `src/lib/rag/eval.json`; rerun it after changing `bm25.ts`, `chunks.ts`, `retrieve.ts` or `src/content/knowledge.md`, and update the number in `careernova-web/README.md`. Numbers in `knowledge.md` must be `{{placeholders}}` filled in `chunks.ts`, never typed in.
- General mode must send no profile data (tested in `src/lib/chat/context.test.ts`). The profile summary never includes the name or CV text.
- Follow the design tokens in `src/index.css` (from the Figma handoff). Don't add colors outside them.
- Honesty rules carried over from the brief: no invented numbers, the match score is never called a probability or confidence, and O\*NET is credited in the footer. The chat's system prompt in `api/_chat.ts` enforces the same rules.
- To check screens visually, `puppeteer-core` (a dev dependency) can drive the installed Edge: `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`.

## Rules that keep the results valid

- **Never use `Job_Zone` or `has_job_zone` as features.** The notebook asserts that the target is not in `features`.
- Drop rows without a label **before** imputation. Fit imputers and scalers inside the training folds only, through `make_pipeline` / `prepare_cnn_inputs`.
- The `*_count` columns in the CSV are wrong: they hold only 0 or 1. The notebook recomputes them from the `|`-separated list columns. Keep that step ahead of feature selection.
- Choose models by 5-fold CV macro F1 on the training set. Use the test set (185 rows) only for the final report, and don't tune on it.
- Keep `SEED = 42` everywhere, so reported numbers stay reproducible.
- When results change, update the Results table in `README.md`.

## Current results

CV accuracy is about 69–70% and macro F1 is about 0.66–0.68 for the CNN, Random Forest and Logistic Regression. The three are statistically tied. The baseline is 36.5%. Zone 3 is the weakest class.

## Known gaps

The slides say things the code doesn't do yet:

- The slides describe student-profile inputs, but the data is about occupations.
- The slides name Random Forest only, but the notebook compares three models.
- The slides describe a Flask app with a hybrid engine. The web app in `careernova-web/` is a static React app instead. It does implement skill-gap analysis, course links (search URLs only) and explanations.
- The chat assistant (Groq LLM + BM25 retrieval through one Vercel function) is not in the slides at all. If it is added, describe it as it is: retrieval over O\*NET data, not a trained chatbot, and not Flask.

When helping with the slides or a report, flag these mismatches rather than papering over them.
