const STOPWORDS = new Set(
  (
    "a an and are as at be been but by can could do does did for from has have how i if in into is it its me my " +
    "of on or our should so that the their them then there these they this to was we were what when where which " +
    "who why will with would you your about any some get more most much very just also than " +
    // Words students put in almost every question but occupation texts rarely use, so they would
    // otherwise score as rare terms and pull in the FAQ sections
    "job jobs career careers use uses used using"
  ).split(" "),
);

/** O*NET uses US spelling; students in India mostly write British spelling */
const US_SPELLING: [RegExp, string][] = [
  [/\banalys(e|es|ed|ing)\b/g, "analyz$1"],
  [/\borganis(e|es|ed|ing|ation|ations)\b/g, "organiz$1"],
  [/\b(behavio|colo|labo|favo)ur(s?)\b/g, "$1r$2"],
  [/\bcentre(s?)\b/g, "center$1"],
  [/\bprogramme(s?)\b/g, "program$1"],
  [/\bdefence\b/g, "defense"],
  [/\blicence\b/g, "license"],
];

/** Light stemming: enough for "developers" to match "developer", without a stemming library. */
function stem(word: string) {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && /(ch|sh|ss|x|z)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us") && !word.endsWith("is")) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string): string[] {
  let lower = text.toLowerCase().replace(/'s\b/g, "");
  for (const [pattern, us] of US_SPELLING) lower = lower.replace(pattern, us);
  return (lower.match(/[a-z0-9+#]+/g) ?? [])
    .filter(w => !STOPWORDS.has(w))
    .map(stem);
}

export interface Bm25Index {
  docs: Map<string, number>[];
  lengths: number[];
  avgLength: number;
  idf: Map<string, number>;
}

export function buildIndex(texts: string[]): Bm25Index {
  const docs = texts.map(t => {
    const tf = new Map<string, number>();
    for (const term of tokenize(t)) tf.set(term, (tf.get(term) ?? 0) + 1);
    return tf;
  });
  const lengths = docs.map(d => [...d.values()].reduce((s, n) => s + n, 0));
  const df = new Map<string, number>();
  for (const d of docs) for (const term of d.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  const n = docs.length;
  // BM25+ style idf that never goes negative for very common terms
  const idf = new Map([...df].map(([term, count]) => [term, Math.log(1 + (n - count + 0.5) / (count + 0.5))]));
  return { docs, lengths, avgLength: lengths.reduce((s, x) => s + x, 0) / Math.max(n, 1), idf };
}

const K1 = 1.2;
const B = 0.75;

/** Scores every document against the query. Index i in the result is document i. */
export function scoreAll(index: Bm25Index, query: string): number[] {
  const terms = [...new Set(tokenize(query))];
  return index.docs.map((tf, i) => {
    let score = 0;
    const norm = K1 * (1 - B + (B * index.lengths[i]) / index.avgLength);
    for (const term of terms) {
      const f = tf.get(term);
      if (!f) continue;
      score += (index.idf.get(term) ?? 0) * ((f * (K1 + 1)) / (f + norm));
    }
    return score;
  });
}
