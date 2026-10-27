"""
Supplementary analyses for the project report (Chapter 6).

Reuses the exact data preparation of CareerNova_fixed.ipynb (recounted *_count columns,
unlabelled rows dropped first, stratified 80/20 split, SEED = 42, imputation and scaling
inside pipelines) and adds:

  1. A check that the classical models reproduce the notebook's numbers.
  2. 95% bootstrap confidence intervals for test accuracy and macro F1.
  3. Ordinal error analysis: share of test predictions within one Job Zone.
  4. A feature-group ablation and a leave-one-feature-out analysis
     (5-fold CV on the training set only; the test set is not used for these).

The 1D-CNN is not retrained here. Its test predictions are rebuilt from the confusion
matrix printed by the notebook, which is enough for every metric used below. The Random
Forest's test predictions come from careernova-web/public/data/model.json for the same
reason: forest results change between scikit-learn versions, so a rerun on another version
does not reproduce the notebook's forest exactly (both are recorded in the output).

Run:  python report_analysis.py   ->  writes report_analysis_results.json
"""
import json

import numpy as np
import pandas as pd
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler

SEED = 42
TARGET = "Job_Zone"

# Test-set confusion matrix of the 1D-CNN, from CareerNova_fixed.ipynb (rows: true zone 2-5)
CNN_CONFUSION = np.array([[56, 11, 1, 0], [17, 16, 7, 2], [0, 3, 32, 10], [0, 4, 8, 18]])


def count_items(text):
    if pd.isna(text) or not str(text).strip():
        return 0
    return len([item for item in str(text).split("|") if item.strip()])


def load():
    df = pd.read_csv("Career_Nova_Final_Clean_Optimized_Dataset.csv")
    for count_column, list_column in {
        "essential_skill_count": "essential_skills",
        "software_skill_count": "software_skills",
        "hot_technology_count": "hot_technologies",
        "in_demand_software_count": "in_demand_software",
    }.items():
        df[count_column] = df[list_column].apply(count_items)

    features = [
        "essential_skill_count", "avg_essential_importance", "max_essential_importance",
        "software_skill_count", "hot_technology_count", "in_demand_software_count",
        "has_essential_skills", "has_software_skills", "data_completeness_pct",
    ]
    assert TARGET not in features, "Target must not be used as a feature"
    for column in features + [TARGET]:
        df[column] = pd.to_numeric(df[column], errors="coerce")
    df = df[df[TARGET].notna()].reset_index(drop=True)

    y = LabelEncoder().fit_transform(df[TARGET])
    X_train, X_test, y_train, y_test = train_test_split(
        df[features], y, test_size=0.20, random_state=SEED, stratify=y
    )
    features = [c for c in features if X_train[c].nunique(dropna=True) > 1]
    return X_train[features], X_test[features], y_train, y_test, features


def make_pipeline(model, scale=False):
    steps = [("impute", SimpleImputer(strategy="median"))]
    if scale:
        steps.append(("scale", StandardScaler()))
    steps.append(("model", model))
    return Pipeline(steps)


def models():
    return {
        "Logistic Regression": make_pipeline(LogisticRegression(max_iter=2000, random_state=SEED), scale=True),
        "Random Forest": make_pipeline(
            RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=SEED, n_jobs=-1)
        ),
        "Baseline (majority class)": make_pipeline(DummyClassifier(strategy="most_frequent")),
    }


CV = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)


def cv_scores(pipeline, X, y):
    s = cross_validate(pipeline, X, y, cv=CV, scoring=["accuracy", "f1_macro"])
    return {
        "acc": float(s["test_accuracy"].mean()), "acc_std": float(s["test_accuracy"].std()),
        "f1": float(s["test_f1_macro"].mean()), "f1_std": float(s["test_f1_macro"].std()),
    }


def pairs_from_confusion(cm):
    true, pred = [], []
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            true += [i] * cm[i, j]
            pred += [j] * cm[i, j]
    return np.array(true), np.array(pred)


def bootstrap_ci(y_true, y_pred, n=2000):
    rng = np.random.default_rng(SEED)
    accs, f1s = [], []
    for _ in range(n):
        idx = rng.integers(0, len(y_true), len(y_true))
        accs.append(accuracy_score(y_true[idx], y_pred[idx]))
        f1s.append(f1_score(y_true[idx], y_pred[idx], average="macro", labels=[0, 1, 2, 3], zero_division=0))
    return [float(np.percentile(accs, 2.5)), float(np.percentile(accs, 97.5))], [
        float(np.percentile(f1s, 2.5)), float(np.percentile(f1s, 97.5))]


def test_summary(y_true, y_pred):
    distance = np.abs(y_true - y_pred)
    acc_ci, f1_ci = bootstrap_ci(y_true, y_pred)
    return {
        "acc": float(accuracy_score(y_true, y_pred)),
        "f1": float(f1_score(y_true, y_pred, average="macro")),
        "acc_ci": acc_ci, "f1_ci": f1_ci,
        "within_one": float((distance <= 1).mean()),
        "two_or_more_off": int((distance >= 2).sum()),
        "mean_abs_zone_error": float(distance.mean()),
        "per_class_f1": [float(v) for v in f1_score(y_true, y_pred, average=None, labels=[0, 1, 2, 3])],
        "confusion": confusion_matrix(y_true, y_pred, labels=[0, 1, 2, 3]).tolist(),
    }


def main():
    X_train, X_test, y_train, y_test, features = load()
    results = {"features": features, "n_train": len(X_train), "n_test": len(X_test), "cv": {}, "test": {}}

    for name, pipeline in models().items():
        results["cv"][name] = cv_scores(pipeline, X_train, y_train)
        pipeline.fit(X_train, y_train)
        results["test"][name] = test_summary(np.asarray(y_test), pipeline.predict(X_test))
        print(f"{name:28s} CV acc {results['cv'][name]['acc']:.4f} F1 {results['cv'][name]['f1']:.4f} | "
              f"test acc {results['test'][name]['acc']:.4f} F1 {results['test'][name]['f1']:.4f}")

    t, p = pairs_from_confusion(CNN_CONFUSION)
    results["test"]["1D-CNN"] = test_summary(t, p)
    print(f"{'1D-CNN (from notebook)':28s} test acc {results['test']['1D-CNN']['acc']:.4f}")

    # Random Forest results change between scikit-learn versions. The notebook (1.6.1) and the web
    # app's build script trained the same forest; its test confusion matrix is stored in model.json.
    results["sklearn_version"] = sklearn.__version__
    results["test"]["Random Forest (this run)"] = results["test"].pop("Random Forest")
    results["cv"]["Random Forest (this run)"] = results["cv"].pop("Random Forest")
    with open("careernova-web/public/data/model.json") as f:
        rf_confusion = np.array(json.load(f)["confusion"]["matrix"])
    t, p = pairs_from_confusion(rf_confusion)
    results["test"]["Random Forest"] = test_summary(t, p)
    print(f"{'Random Forest (model.json)':28s} test acc {results['test']['Random Forest']['acc']:.4f}")

    groups = {
        "Skill importance (avg, max)": ["avg_essential_importance", "max_essential_importance"],
        "Software and technology counts": ["software_skill_count", "hot_technology_count", "in_demand_software_count"],
        "Data-quality flags and skill count": ["essential_skill_count", "has_essential_skills", "data_completeness_pct"],
        "All except skill importance": [f for f in features if f not in ("avg_essential_importance", "max_essential_importance")],
        "All eight features": features,
    }
    results["ablation"] = {}
    for group, cols in groups.items():
        results["ablation"][group] = {}
        for name in ("Logistic Regression", "Random Forest"):
            results["ablation"][group][name] = cv_scores(models()[name], X_train[cols], y_train)
        print(f"ablation {group:38s} RF F1 {results['ablation'][group]['Random Forest']['f1']:.3f}")

    results["leave_one_out_rf"] = {}
    for f in features:
        cols = [c for c in features if c != f]
        results["leave_one_out_rf"][f] = cv_scores(models()["Random Forest"], X_train[cols], y_train)["f1"]

    with open("report_analysis_results.json", "w") as out:
        json.dump(results, out, indent=2)


if __name__ == "__main__":
    main()
