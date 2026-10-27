import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "a", "a and b", "a, b and c" */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

export function courseLinks(topic: string) {
  const q = encodeURIComponent(topic);
  return [
    { label: "Coursera", href: `https://www.coursera.org/search?query=${q}` },
    { label: "freeCodeCamp", href: `https://www.freecodecamp.org/news/search/?query=${q}` },
    { label: "YouTube", href: `https://www.youtube.com/results?search_query=${q}+tutorial` },
  ];
}
