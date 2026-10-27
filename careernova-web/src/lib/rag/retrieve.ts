import { buildIndex, scoreAll, tokenize } from "./bm25";
import type { Chunk } from "./chunks";

export interface RetrieveOptions {
  /** How many chunks to return in total. Default 5. */
  k?: number;
  /** Occupations that must be included, e.g. the career page the chat was opened from */
  pinCodes?: string[];
  /** Occupations to nudge up, e.g. the student's top matches. Only affects chunks BM25 already found. */
  boostCodes?: string[];
}

export interface Retrieved {
  chunk: Chunk;
  score: number;
  /** Included because of a pin, a code or a title in the question, not by score */
  pinned: boolean;
}

const BOOST = 0.15;
/** Title mentions pinned per question, so "compare X and Y" brings both */
const MAX_TITLE_PINS = 2;
const SOC_CODE = /\b\d{2}-\d{4}\.\d{2}\b/g;

function containsRun(haystack: string[], needle: string[]) {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

export function createRetriever(chunks: Chunk[]) {
  const index = buildIndex(chunks.map(c => c.indexText));
  const byCode = new Map(chunks.filter(c => c.code).map(c => [c.code!, c]));
  // One-word titles ("Models", "Actors") are too easy to hit by accident; BM25 handles those
  const titles = chunks
    .filter(c => c.kind === "occupation")
    .map(c => ({ chunk: c, tokens: tokenize(c.title) }))
    .filter(t => t.tokens.length >= 2)
    .sort((a, b) => b.tokens.length - a.tokens.length);

  /** Occupations the question names, longest title first; a title inside a longer pinned one is skipped */
  function mentionedTitles(query: string) {
    const q = tokenize(query);
    const found: { chunk: Chunk; tokens: string[] }[] = [];
    for (const t of titles) {
      if (found.length === MAX_TITLE_PINS) break;
      if (!containsRun(q, t.tokens)) continue;
      if (found.some(f => containsRun(f.tokens, t.tokens))) continue;
      found.push(t);
    }
    return found.map(f => f.chunk);
  }

  return function retrieve(query: string, options: RetrieveOptions = {}): Retrieved[] {
    const k = options.k ?? 5;
    const pinned: Chunk[] = [];
    const pin = (c: Chunk | undefined) => c && !pinned.includes(c) && pinned.push(c);
    options.pinCodes?.forEach(code => pin(byCode.get(code)));
    query.match(SOC_CODE)?.forEach(code => pin(byCode.get(code)));
    mentionedTitles(query).forEach(pin);

    const boost = new Set(options.boostCodes);
    const scores = scoreAll(index, query);
    const all = chunks.map((chunk, i) => ({
      chunk,
      score: chunk.code && boost.has(chunk.code) ? scores[i] * (1 + BOOST) : scores[i],
    }));
    const scoreOf = new Map(all.map(r => [r.chunk, r.score]));
    const ranked = all.filter(r => r.score > 0 && !pinned.includes(r.chunk)).sort((a, b) => b.score - a.score);

    const head = pinned.slice(0, k).map(chunk => ({ chunk, score: scoreOf.get(chunk)!, pinned: true }));
    const tail = ranked.slice(0, k - head.length).map(r => ({ ...r, pinned: false }));
    return [...head, ...tail];
  };
}
