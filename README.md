# CareerNova AI

**An Intelligent, Explainable Career Mentoring System Using Hybrid Machine Learning & Knowledge Graphs**

B.Tech Computer Science & Engineering project by Senchumbeni C Erui, supervised by Ma'am Salam Ameeta.

This repository holds the machine-learning part of CareerNova: a model that predicts an occupation's **O\*NET Job Zone**, the level of preparation the job needs (Zone 2 = some preparation, Zone 5 = extensive preparation), from the occupation's skill and technology profile.

## Files

| File | Description |
|---|---|
| `CareerNova_fixed.ipynb` | **Main notebook.** Data cleaning, model comparison (Logistic Regression, Random Forest, 1D-CNN) and evaluation. |
| `CNN.ipynb` | First version, kept for reference. Its 97.8% accuracy is **not valid** (see [Target leakage](#target-leakage-in-the-first-version)). |
| `Career_Nova_Final_Clean_Optimized_Dataset.csv` | Dataset: 1016 O\*NET occupations, 19 columns. |
| `Blue Modern Futuristic Presentation.pptx` | Project review presentation. |
| `careernova-web/` | **The student web app.** Explainable career matching against all 1,016 occupations. See [its README](careernova-web/README.md). |
| `CareerNova_Design_Brief.md` | Design brief used to produce the app's Figma design. |

## Dataset

Each row is one occupation from the [O\*NET](https://www.onetcenter.org/database.html) database, identified by `ONETSOC_Code` (e.g. `13-2011.00`, Accountants and Auditors).

| Column(s) | Meaning |
|---|---|
| `Title`, `Description`, `ONETSOC_Code` | Occupation identity |
| `Job_Zone` | **Target.** 2–5; missing for 93 occupations |
| `essential_skills`, `essential_skill_details` | Top essential skills, separated by `\|` |
| `avg_essential_importance`, `max_essential_importance` | O\*NET importance ratings of those skills |
| `software_skills`, `hot_technologies`, `in_demand_software` | Software and technology lists, separated by `\|` |
| `*_count` columns | Number of items in each list (recomputed in the notebook, see below) |
| `has_*`, `data_completeness_pct` | Data-quality flags |

The 923 occupations that have a Job Zone are used: Zone 2 has 337, Zone 3 has 208, Zone 4 has 226 and Zone 5 has 152.

## Setup

Python 3.9 or newer:

```bash
pip install pandas numpy matplotlib scikit-learn tensorflow notebook ipykernel
```

Keep the CSV in the same folder as the notebook, then open `CareerNova_fixed.ipynb` and run all cells. A full run takes a few minutes on a CPU, most of it CNN cross-validation.

## Method

1. **Recount the skill counts.** In the CSV, the `*_count` columns only hold 0 or 1. They are recomputed from the `|`-separated lists.
2. **Select features.** Eight numeric skill and technology features. `Job_Zone` and `has_job_zone` are excluded, and columns that are constant in the training set are dropped.
3. **Split the data.** Stratified 80/20 train/test split (738 / 185 occupations). The test set is used only once, at the end.
4. **Preprocess inside each training fold.** Missing values are filled with the median and features are scaled. Both are fitted on training data only, so nothing leaks from validation or test data.
5. **Compare models** with stratified 5-fold cross-validation on the training set:
   - majority-class baseline
   - Logistic Regression
   - Random Forest (300 trees, balanced class weights)
   - 1D-CNN (two Conv1D layers, dense head, dropout, early stopping)
6. **Evaluate** on the held-out test set: accuracy, macro F1, weighted F1, a per-class report and a confusion matrix. Macro F1 is the main metric because the classes are imbalanced.

Random seeds are fixed (`SEED = 42`), so results are reproducible.

## Results

| Model | CV accuracy | CV macro F1 | Test accuracy | Test macro F1 |
|---|---|---|---|---|
| 1D-CNN | 70.1% ± 4.2 | 0.675 | 66.0% | 0.626 |
| Random Forest | 68.8% ± 3.3 | 0.669 | 64.9% | 0.612 |
| Logistic Regression | 69.1% ± 3.6 | 0.662 | 65.4% | 0.622 |
| Baseline (always predicts Zone 2) | 36.5% | 0.134 | 36.8% | 0.134 |

- All three models reach about 69–70% cross-validated accuracy, nearly double the baseline. The differences between them are within the cross-validation spread.
- Zone 2 is predicted best (F1 ≈ 0.8). Zone 3 is hardest (F1 ≈ 0.4), because it sits between Zones 2 and 4.
- The most important Random Forest features are average essential-skill importance, software skill count, maximum essential-skill importance and hot technology count.

## Target leakage in the first version

`CNN.ipynb` used `Job_Zone` as both an input feature and the label, so the model could read the answer from its input. That is why it reported 97.8% test accuracy and 100% validation accuracy. `CareerNova_fixed.ipynb` removes the leak, and its numbers above are the honest performance.

## Limitations and next steps

- The features describe **occupations, not students**. Recommending careers to a student needs student-profile data, or a way to match a student's skills against these occupation profiles.
- Only counts and averages of skills are used. Using the skill and technology names themselves (e.g. "has Python", "has Excel") is the most promising way to improve accuracy, and it would also support skill-gap analysis.
- The web app (`careernova-web/`) covers matching, explanations, skill-gap analysis and course search links. It is a static React app, not the Flask app the slides describe.
