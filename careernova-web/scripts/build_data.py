"""Build the static data files the CareerNova web app loads.

Reads the O*NET-based CSV from the project root and writes, into public/data/:

  occupations.json  one compact record per occupation (tools as ids into tools.json)
  tools.json        the 331 in-demand / hot tools with display names and usage counts
  software.json     full software list per occupation (loaded lazily by the app)
  model.json        Random Forest results: test confusion matrix, feature importances

Each occupation also gets the model's predicted Job Zone. Predictions for the 923
rated occupations are out-of-fold (5-fold CV), so no prediction comes from a model
that saw that occupation. The 93 unrated occupations are predicted by a model fitted
on all rated ones.

Usage (from careernova-web/):  python scripts/build_data.py
"""

import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import Pipeline

SEED = 42
ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT.parent / "Career_Nova_Final_Clean_Optimized_Dataset.csv"
OUT = ROOT / "public" / "data"

SKILLS = [
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
]

# SOC major group (first two digits of the O*NET-SOC code)
FIELDS = {
    "11": "Management",
    "13": "Business & Financial Operations",
    "15": "Computer & Mathematical",
    "17": "Architecture & Engineering",
    "19": "Life, Physical & Social Science",
    "21": "Community & Social Service",
    "23": "Legal",
    "25": "Educational Instruction & Library",
    "27": "Arts, Design, Entertainment, Sports & Media",
    "29": "Healthcare Practitioners & Technical",
    "31": "Healthcare Support",
    "33": "Protective Service",
    "35": "Food Preparation & Serving",
    "37": "Building & Grounds Maintenance",
    "39": "Personal Care & Service",
    "41": "Sales",
    "43": "Office & Administrative Support",
    "45": "Farming, Fishing & Forestry",
    "47": "Construction & Extraction",
    "49": "Installation, Maintenance & Repair",
    "51": "Production",
    "53": "Transportation & Material Moving",
    "55": "Military Specific",
}

# O*NET uses long vendor names; students know the short ones.
DISPLAY = {
    "Microsoft Office software": "Microsoft Office", "Microsoft Excel": "Excel",
    "Microsoft Word": "Word", "Microsoft Outlook": "Outlook",
    "Microsoft PowerPoint": "PowerPoint", "Microsoft Access": "Access",
    "SAP software": "SAP", "Microsoft Windows": "Windows", "Autodesk AutoCAD": "AutoCAD",
    "Structured query language SQL": "SQL", "Microsoft SharePoint": "SharePoint",
    "Adobe Photoshop": "Photoshop", "Adobe Acrobat": "Acrobat", "Microsoft Visio": "Visio",
    "The MathWorks MATLAB": "MATLAB", "Adobe Illustrator": "Illustrator",
    "Oracle Java": "Java", "ESRI ArcGIS software": "ArcGIS",
    "Salesforce software": "Salesforce", "Adobe InDesign": "InDesign",
    "Adobe Creative Cloud software": "Adobe Creative Cloud",
    "Microsoft SQL Server": "SQL Server", "Microsoft Visual Basic": "Visual Basic",
    "IBM SPSS Statistics": "SPSS", "Extensible markup language XML": "XML",
    "Intuit QuickBooks": "QuickBooks", "Hypertext markup language HTML": "HTML",
    "Epic Systems": "Epic", "Oracle PeopleSoft": "PeopleSoft", "MEDITECH software": "Meditech",
    "Amazon Web Services AWS software": "AWS", "Microsoft Azure software": "Azure",
    "Dassault Systemes SolidWorks": "SolidWorks", "Atlassian JIRA": "Jira",
    "Apple macOS": "macOS", "Bentley MicroStation": "MicroStation",
    "Oracle Primavera Enterprise Project Portfolio Management": "Oracle Primavera",
    "Autodesk Revit": "Revit", "Teradata Database": "Teradata",
    "Microsoft Active Server Pages ASP": "ASP", "eClinicalWorks EHR software": "eClinicalWorks",
    "Microsoft Visual Studio": "Visual Studio",
    "Microsoft Visual Basic for Applications VBA": "VBA",
    "Adobe After Effects": "After Effects", "Cascading style sheets CSS": "CSS",
    "Microsoft Power BI": "Power BI", "Trimble SketchUp Pro": "SketchUp",
    "Autodesk AutoCAD Civil 3D": "Civil 3D", "Microsoft Teams": "Microsoft Teams",
    "Microsoft PowerShell": "PowerShell", "Atlassian Confluence": "Confluence",
    "Yardi software": "Yardi", "Eclipse IDE": "Eclipse",
    "Microsoft SQL Server Reporting Services SSRS": "SSRS", "Ansible software": "Ansible",
    "Microsoft .NET Framework": ".NET", "Learning management system LMS": "LMS",
    "Marketo Marketing Automation": "Marketo", "Google Workspace software": "Google Workspace",
    "Mozilla Firefox": "Firefox", "Microsoft Windows Server": "Windows Server",
    "Red Hat Enterprise Linux": "Red Hat Linux", "JavaScript Object Notation JSON": "JSON",
    "Cisco Webex": "Webex", "Oracle PL/SQL": "PL/SQL", "Splunk Enterprise": "Splunk",
    "Amazon Elastic Compute Cloud EC2": "AWS EC2", "Apple Safari": "Safari",
    "Apache Subversion SVN": "SVN", "Microsoft Active Directory": "Active Directory",
    "Google Angular": "Angular", "Microsoft ASP.NET": "ASP.NET",
    "Amazon Web Services AWS CloudFormation": "AWS CloudFormation",
    "Amazon DynamoDB": "DynamoDB", "Microsoft SQL Server Integration Services SSIS": "SSIS",
    "Jenkins CI": "Jenkins", "Workday software": "Workday", "Apple iOS": "iOS",
    "HubSpot software": "HubSpot", "Geographic information system GIS systems": "GIS systems",
    "IBM Terraform": "Terraform", "Hibernate ORM": "Hibernate", "Microsoft Edge": "Microsoft Edge",
    "Henry Schein Dentrix": "Dentrix", "Red Hat OpenShift": "OpenShift",
    "Google Android": "Android", "Kronos Workforce Timekeeper": "Kronos", "IBM DB2": "DB2",
    "Border Gateway Protocol BGP": "BGP", "IBM WebSphere MQ": "WebSphere MQ",
    "Oracle Java 2 Platform Enterprise Edition J2EE": "J2EE", "Alteryx software": "Alteryx",
    "Warehouse management system WMS": "WMS", "Google Looker Analytics": "Looker",
    "Procore software": "Procore", "Grafana Labs Grafana Cloud": "Grafana",
    "Informatica software": "Informatica",
    "Microsoft Team Foundation Server": "Team Foundation Server",
    "Adobe Premiere Pro": "Premiere Pro", "Oracle SQL Developer": "SQL Developer",
    "Microsoft Power Platform software": "Power Platform", "Oracle Cloud software": "Oracle Cloud",
    "Autodesk Navisworks": "Navisworks", "MathWorks Simulink": "Simulink",
    "StataCorp Stata": "Stata", "Atlassian Bitbucket": "Bitbucket",
    "McNeel Rhinoceros 3D": "Rhino 3D", "ANSYS simulation software": "ANSYS",
    "Microsoft Power Automate": "Power Automate", "Intuit TurboTax": "TurboTax",
    "PTC Creo Parametric": "Creo", "Autodesk Maya": "Maya",
    "Content management systems CMS": "CMS", "Unreal Technology Unreal Engine": "Unreal Engine",
    "Apple Final Cut Pro": "Final Cut Pro", "ESRI ArcGIS Survey 123": "Survey123",
    "Dassault Systemes CATIA": "CATIA", "Geographic information system GIS software": "GIS software",
    "Mastercam computer-aided design and manufacturing software": "Mastercam",
    "Thomson Reuters Westlaw": "Westlaw", "Blackbaud The Raiser's Edge": "Raiser's Edge",
    "Student information systems SIS software": "SIS software", "Chaos Enscape": "Enscape",
    "Property management system PMS software": "PMS software", "Tenable Nessus": "Nessus",
    "Unity Technologies Unity": "Unity", "Moz search engine optimization SEO software": "Moz SEO",
    "Mechanical electrical plumbing MEP design software": "MEP design software",
    "National Instruments LabVIEW": "LabVIEW",
    "Very high speed integrated circuit VHSIC hardware description language VHDL simulation software": "VHDL",
    "Maxon Cinema 4D": "Cinema 4D", "Ahrefs Site Explorer": "Ahrefs",
    "Microsoft Internet Information Services (IIS) Manager": "IIS Manager",
    "Microsoft Internet Information Services (IIS)": "IIS",
    "Amazon Web Services AWS SageMaker": "AWS SageMaker", "ConstructConnect PlanSwift": "PlanSwift",
    "Microsoft Azure DevOps Services": "Azure DevOps", "Xactware Xactimate": "Xactimate",
    "Adobe Audition": "Audition", "Sparta Systems TrackWise": "TrackWise",
    "Perforce software": "Perforce", "Qualtrics Insight": "Qualtrics", "SideFX Houdini": "Houdini",
    "Aurora HelioScope": "HelioScope", "Portswigger BurP Suite": "Burp Suite",
    "On Center On-Screen Takeoff": "On-Screen Takeoff", "Amadeus CRS": "Amadeus",
    "Springshare LibGuides": "LibGuides", "Microsoft Playwright": "Playwright",
    "Autodesk Inventor": "Inventor", "Shopify software": "Shopify",
    "Siemens Teamcenter": "Teamcenter", "Tool command language Tcl": "Tcl",
    "Single sign-on SSO": "SSO", "Autodesk Fusion 360": "Fusion 360",
    "Microsoft Azure Data Factory": "Azure Data Factory", "PTV Vissim": "Vissim",
    "Rust programming language": "Rust", "Forsk Atoll": "Atoll", "RockWare ArcMap": "ArcMap",
    "Screaming Frog SEO Spider": "Screaming Frog",
    "REDCap Research Electronic Data Capture": "REDCap", "ESRI ArcGIS ArcPy": "ArcPy",
    "SAS JMP": "JMP", "Cubic Synchro Studio": "Synchro Studio", "ESRI ArcView": "ArcView",
    "Operational Data Store ODS software": "ODS software",
    "Transportation management system TMS software": "TMS software",
    "TechSmith Camtasia": "Camtasia", "RockWare MODFLOW": "MODFLOW",
    "Simulation program with integrated circuit emphasis SPICE": "SPICE",
    "Orion Law Management Systems Orion": "Orion", "Adobe Photoshop Lightroom": "Lightroom",
    "Articulate Storyline": "Storyline", "Qualys Cloud Platform": "Qualys",
    "Outage management system OMS": "OMS", "Enterprise application integration EAI software": "EAI software",
    "Sabre Central Command": "Sabre", "Guidance Software EnCase Enterprise": "EnCase",
    "PCI Express PCIe": "PCIe",
}

# Extra spellings for CV extraction (lower-case), keyed by display name.
ALIASES = {
    "Excel": ["ms excel", "microsoft excel"], "Word": ["ms word", "microsoft word"],
    "PowerPoint": ["ms powerpoint", "powerpoint"], "Access": ["ms access", "microsoft access"],
    "Microsoft Office": ["ms office", "microsoft office"], "SQL": ["sql"],
    "Java": ["java"], "JavaScript": ["javascript", "js", "es6"], "TypeScript": ["typescript", "ts"],
    "Node.js": ["node.js", "nodejs", "node js"], "React": ["react", "react.js", "reactjs"],
    "Vue.js": ["vue", "vue.js", "vuejs"], "Angular": ["angular", "angularjs"],
    "AWS": ["aws", "amazon web services"], "Azure": ["azure", "microsoft azure"],
    "Go": ["golang"], "C#": ["c#", "c sharp"], "C++": ["c++", "cpp"],
    "PostgreSQL": ["postgresql", "postgres"], "Kubernetes": ["kubernetes", "k8s"],
    "MATLAB": ["matlab"], "AutoCAD": ["autocad"], "Photoshop": ["photoshop"],
    "Power BI": ["power bi", "powerbi"], "Jira": ["jira"], "SPSS": ["spss"],
    "Git": ["git"], "GitHub": ["github"], "GitLab": ["gitlab"], ".NET": [".net", "dotnet"],
    "Scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
    "TensorFlow": ["tensorflow"], "PyTorch": ["pytorch"], "pandas": ["pandas"],
    "NumPy": ["numpy"], "HTML": ["html", "html5"], "CSS": ["css", "css3"],
    "Google Workspace": ["g suite", "google workspace"], "Microsoft Teams": ["ms teams", "microsoft teams"],
    "Microsoft Project": ["ms project", "microsoft project"], "Microsoft Edge": ["microsoft edge"],
}


def split_list(value):
    if pd.isna(value):
        return []
    return [item.strip() for item in str(value).split("|") if item.strip()]


def parse_skills(details):
    """'Name [importance=3.88; level=4.12] | ...' -> {name: (importance, level)}"""
    found = {}
    for item in split_list(details):
        m = re.match(r"(.+?)\s*\[importance=([\d.]+);\s*level=([\d.]+)\]", item)
        if m:
            found[m.group(1).strip()] = (float(m.group(2)), float(m.group(3)))
    return found


def train_model(df):
    """Same features and recount fix as CareerNova_fixed.ipynb."""
    data = df.copy()
    for count_col, list_col in {
        "essential_skill_count": "essential_skills",
        "software_skill_count": "software_skills",
        "hot_technology_count": "hot_technologies",
        "in_demand_software_count": "in_demand_software",
    }.items():
        data[count_col] = data[list_col].apply(lambda v: len(split_list(v)))

    features = [
        "essential_skill_count", "avg_essential_importance", "max_essential_importance",
        "software_skill_count", "hot_technology_count", "in_demand_software_count",
        "has_essential_skills", "data_completeness_pct",
    ]
    X = data[features].apply(pd.to_numeric, errors="coerce")
    y = pd.to_numeric(data["Job_Zone"], errors="coerce")
    rated = y.notna()

    def make():
        return Pipeline([
            ("impute", SimpleImputer(strategy="median")),
            ("model", RandomForestClassifier(
                n_estimators=300, class_weight="balanced", random_state=SEED, n_jobs=-1)),
        ])

    X_rated, y_rated = X[rated], y[rated].astype(int)

    # Held-out test set, identical split to the notebook
    X_train, X_test, y_train, y_test = train_test_split(
        X_rated, y_rated, test_size=0.20, random_state=SEED, stratify=y_rated)
    test_model = make().fit(X_train, y_train)
    test_pred = test_model.predict(X_test)
    zones = [2, 3, 4, 5]

    # Out-of-fold predictions for every rated occupation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    oof = cross_val_predict(make(), X_rated, y_rated, cv=cv)

    # Unrated occupations: model fitted on all rated ones
    full_model = make().fit(X_rated, y_rated)
    predicted = pd.Series(index=X.index, dtype="Int64")
    predicted[rated] = oof
    predicted[~rated] = full_model.predict(X[~rated])

    importances = full_model.named_steps["model"].feature_importances_
    model_info = {
        "model": "Random Forest (300 trees, balanced class weights)",
        "testSize": int(len(y_test)),
        "testAccuracy": round(float(accuracy_score(y_test, test_pred)), 4),
        "testMacroF1": round(float(f1_score(y_test, test_pred, average="macro")), 4),
        "confusion": {
            "zones": zones,
            "matrix": confusion_matrix(y_test, test_pred, labels=zones).tolist(),
        },
        "outOfFoldAccuracy": round(float(accuracy_score(y_rated, oof)), 4),
        "featureImportance": sorted(
            [{"feature": f, "importance": round(float(v), 3)} for f, v in zip(features, importances)],
            key=lambda d: -d["importance"],
        ),
    }
    return predicted, model_info


def main():
    df = pd.read_csv(CSV)
    print("Rows:", len(df))

    # Tools: in-demand and hot technologies across all occupations
    in_demand_count, career_count, full_names, hot_names = Counter(), Counter(), set(), set()
    for _, row in df.iterrows():
        d, h = set(split_list(row.in_demand_software)), set(split_list(row.hot_technologies))
        full_names |= d | h
        hot_names |= h
        for t in d:
            in_demand_count[t] += 1
        for t in d | h:
            career_count[t] += 1

    names = sorted(full_names, key=lambda t: (-career_count[t], t))
    displays = [DISPLAY.get(t, t) for t in names]
    dupes = {d for d, n in Counter(displays).items() if n > 1}
    tools = []
    for i, full in enumerate(names):
        display = DISPLAY.get(full, full)
        if display in dupes:
            display = full
        tools.append({
            "id": i,
            "name": display,
            "full": full,
            "kind": "in-demand" if in_demand_count[full] else "hot",
            "careers": career_count[full],
            "inDemandCareers": in_demand_count[full],
            "aliases": ALIASES.get(display, []),
        })
    tool_id = {t["full"]: t["id"] for t in tools}

    predicted, model_info = train_model(df)

    occupations, software = [], {}
    for idx, row in df.iterrows():
        code = row.ONETSOC_Code
        skills = parse_skills(row.essential_skill_details)
        d = split_list(row.in_demand_software)
        h = [t for t in split_list(row.hot_technologies) if t not in set(d)]
        sw = split_list(row.software_skills)
        zone = None if pd.isna(row.Job_Zone) else int(row.Job_Zone)
        occupations.append({
            "code": code,
            "title": row.Title,
            "description": row.Description if pd.notna(row.Description) else "",
            "field": code[:2],
            "zone": zone,
            "predictedZone": int(predicted[idx]),
            # [importance, level] in SKILLS order, or [] when O*NET has no ratings
            "skills": [list(skills[s]) for s in SKILLS] if len(skills) == len(SKILLS) else [],
            "inDemand": sorted({tool_id[t] for t in d}),
            "hot": sorted({tool_id[t] for t in h}),
            "softwareCount": len(sw),
        })
        software[code] = sw

    OUT.mkdir(parents=True, exist_ok=True)
    meta = {
        "skills": SKILLS,
        "fields": FIELDS,
        "stats": {"inDemandUnique": len(in_demand_count), "hotUnique": len(hot_names)},
    }
    for name, payload in {
        "occupations.json": {"meta": meta, "occupations": occupations},
        "tools.json": tools,
        "software.json": software,
        "model.json": model_info,
    }.items():
        with open(OUT / name, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        print(f"{name}: {(OUT / name).stat().st_size / 1024:.0f} KB")

    rated = [o for o in occupations if o["zone"]]
    agree = sum(o["zone"] == o["predictedZone"] for o in rated)
    print(f"Tools: {len(tools)}  | rated occupations: {len(rated)}  | model agrees on {agree / len(rated):.1%}")
    print("Test accuracy:", model_info["testAccuracy"], " confusion:", model_info["confusion"]["matrix"])


if __name__ == "__main__":
    main()
