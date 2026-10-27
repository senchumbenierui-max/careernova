/**
 * Reads a CV in the browser and finds known tools in it. Nothing is uploaded or stored.
 * The student always reviews what was found before anything is added.
 */
import type { Tool } from "./types";

export const MAX_CV_BYTES = 8 * 1024 * 1024;
const ACCEPTED = [".pdf", ".docx", ".txt"];

export type CvError = "type" | "size" | "unreadable";

export class CvReadError extends Error {
  constructor(public kind: CvError) {
    super(kind);
  }
}

export const CV_ERROR_MESSAGES: Record<CvError, string> = {
  type: "That file type isn't supported. Use a PDF, DOCX or TXT file.",
  size: "That file is over 8 MB. Try a smaller file or a PDF export.",
  unreadable: "We couldn't read this file. It may be damaged or password-protected.",
};

function extension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

async function pdfText(buffer: ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n");
}

async function docxText(buffer: ArrayBuffer) {
  const mammoth = (await import("mammoth/mammoth.browser.js")).default;
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

/** Validates before reading (8 MB check first, per the handoff). */
export async function readCvText(file: File): Promise<string> {
  const ext = extension(file.name);
  if (!ACCEPTED.includes(ext)) throw new CvReadError("type");
  if (file.size > MAX_CV_BYTES) throw new CvReadError("size");
  try {
    if (ext === ".txt") return await file.text();
    const buffer = await file.arrayBuffer();
    return ext === ".pdf" ? await pdfText(buffer) : await docxText(buffer);
  } catch {
    throw new CvReadError("unreadable");
  }
}

// Short names that are also everyday words: only match the exact capitalisation,
// and only as a standalone token.
const CASE_SENSITIVE = new Set(["C", "R", "Go", "Swift", "Chef", "Puppet", "Unity", "SAS", "Rust", "Ruby", "Perl", "Bash"]);
// Never match these by their short name alone ("Word", "Access" ...): rely on full names/aliases.
const SHORT_NAME_UNSAFE = new Set(["Word", "Access", "Edge", "Teams", "Google", "Project"]);

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenPattern(term: string, flags: string) {
  // Boundaries that also respect C++, C#, .NET and Node.js
  return new RegExp(`(?<![A-Za-z0-9+#.])${escape(term)}(?![A-Za-z0-9+#])`, flags);
}

export function findTools(text: string, tools: Tool[]): Tool[] {
  const found: Tool[] = [];
  for (const tool of tools) {
    const insensitive = new Set([tool.full, ...tool.aliases].map(t => t.toLowerCase()));
    if (!CASE_SENSITIVE.has(tool.name) && !SHORT_NAME_UNSAFE.has(tool.name)) insensitive.add(tool.name.toLowerCase());
    const hit =
      [...insensitive].some(term => term.length > 1 && tokenPattern(term, "i").test(text)) ||
      (CASE_SENSITIVE.has(tool.name) && tokenPattern(tool.name, "").test(text));
    if (hit) found.push(tool);
  }
  return found.sort((a, b) => b.careers - a.careers);
}
