<!--
Knowledge base for the CareerNova chat assistant. Each "## " section becomes one retrieval chunk.
{{name}} placeholders are filled from the app's data in src/lib/rag/chunks.ts, so numbers here never drift
from what the rest of the app shows. Do not type numbers in by hand.
-->

## What CareerNova is
CareerNova is a career guidance app for students. You enter the tools you know, rate yourself on 10 core skills and pick fields you are interested in. CareerNova compares that profile with {{occupations}} occupations, explains every match score in four parts, and builds a short skill-gap plan for each career. It is a B.Tech final-year project.

## Where the data comes from
All career data comes from O*NET, the occupational database of the U.S. Department of Labor. For each of the {{occupations}} occupations it has a description, a Job Zone, the importance and level of 10 core skills, in-demand software ({{inDemandUnique}} unique tools) and hot technologies ({{hotUnique}} unique). Occupations and tools translate well to India, but local job titles and degree paths may differ, so read a match as "this kind of work", not a specific job posting.

## What a Job Zone is
A Job Zone is O*NET's rating of how much preparation an occupation needs, from education, training and experience. CareerNova uses zones 2 to 5: {{zones}}. A higher zone means more preparation. {{unrated}} occupations have no official Job Zone from O*NET; CareerNova shows them as "Not rated" and uses the model's predicted zone instead, labelled as a prediction.

## The match score is not a probability
The match score runs from 0 to 100 and adds up four parts: tools ({{w.tools}} points), core skills ({{w.skills}}), interest ({{w.interest}}) and preparation ({{w.prep}}). It measures how much your profile overlaps with what an occupation asks for. It is not a probability, a confidence or a prediction that you will get or enjoy the job.

## How the tools part is scored
The tools part is worth {{w.tools}} points. Your tools are compared with the occupation's in-demand software and hot technologies. An in-demand tool counts 1, a hot technology counts 0.5. Full marks need about 40% of the career's list, with a minimum of 5 tools and a maximum of 15, so a career that lists only one or two tools can't give full marks.

## How the core skills part is scored
The core skills part is worth {{w.skills}} points and compares your self-ratings with the job. You rate yourself from 1 to 5 on 10 skills: {{skills}}. O*NET gives each occupation a needed level from 1 to 7 for each skill, which CareerNova converts to the 1 to 5 scale. Each skill is weighted by how important it is for the job. A rating at or above the needed level counts fully; each level below loses half of that skill's share.

## How the interest part is scored
The interest part is worth {{w.interest}} points. You get the full {{w.interest}} when the occupation is in one of the fields you picked (up to 5 fields), and 0 otherwise.

## How the preparation part is scored
The preparation part is worth {{w.prep}} points and compares your education with the Job Zone. Education maps to a zone: Class 12 is zone 2, Diploma is zone 3, a Bachelor's (in progress or complete) is zone 4, a Master's or higher is zone 5. You get full marks when the career is at your level or one zone below it, 12 when you are still studying for the bachelor's a zone 4 career needs, 6 when it is one zone above you, 0 when it is two or more zones above, and 8 when it is two or more zones below (so low-preparation jobs don't flood a graduate's results).

## What happens when data is missing
When O*NET has no data for a part, that part scores half marks, so missing data never pushes a career up or down. When an occupation has no official Job Zone, the predicted zone is used for the preparation part and the app says so.

## The skill-gap plan
Each career page has a short 30 to 60 day plan built from your biggest gaps. It lists the most-wanted in-demand tools you are missing first, ordered by how many occupations use them, then the core skill where you are furthest below the needed level, weighted by importance. If you already cover everything, it suggests building and sharing a small project. Each step links to search pages on Coursera, freeCodeCamp and YouTube; CareerNova does not recommend specific courses.

## The Job Zone prediction model
A machine-learning classifier predicts an occupation's Job Zone (2 to 5) from its skill and technology profile. The project compared three models with stratified 5-fold cross-validation: {{modelResults}}. The three are statistically tied. Zone 3 is the hardest class to predict. Career pages use the Random Forest. On the held-out test set of {{testSize}} careers it scored {{rfTestAccuracy}} accuracy and {{rfTestF1}} macro F1, and its cross-validated predictions agree with O*NET on {{rfOutOfFold}} of rated careers. The model never uses the Job Zone itself as an input.

## Reading your CV
You can upload a CV as PDF or DOCX to fill in your tools. The file is read inside your browser to find tool names, then discarded. It is never uploaded or stored.

## Privacy and your data
CareerNova has no accounts. Your profile is saved in your browser's local storage and you can delete it from the Privacy page. Matching runs on your device using a copy of the O*NET data.

## What CareerNova does not know
CareerNova's data has no salaries, job openings, hiring demand, growth outlook, company names, colleges, entrance exams or India-specific job titles. It cannot tell you whether you will get a job or how much it pays. For those, check current job portals, official college and exam sites, and people working in the field.
