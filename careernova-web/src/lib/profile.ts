import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "./constants";
import type { Profile } from "./types";

const EVENT = "careernova:profile";

export function emptyProfile(): Profile {
  return {
    schemaVersion: 1,
    tools: [],
    skills: Array(10).fill(3),
    interests: [],
    updatedAt: new Date().toISOString(),
  };
}

function read(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profile);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.tools) || parsed.skills?.length !== 10) return null;
    return parsed;
  } catch {
    return null;
  }
}

// useSyncExternalStore needs a stable snapshot between changes
let cached: Profile | null | undefined;

function snapshot() {
  if (cached === undefined) cached = read();
  return cached;
}

function subscribe(onChange: () => void) {
  const handler = () => {
    cached = undefined;
    onChange();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function saveProfile(profile: Profile) {
  const next = { ...profile, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(next));
  } catch {
    // Storage may be blocked (private mode). The app still works for this visit.
  }
  cached = next;
  window.dispatchEvent(new Event(EVENT));
}

export function updateProfile(patch: Partial<Profile>) {
  saveProfile({ ...(snapshot() ?? emptyProfile()), ...patch });
}

export function useProfile() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

/** No tools and every skill left at "Not sure": every career scores about the same. */
export function isThinProfile(p: Profile) {
  return p.tools.length === 0 && p.skills.every(s => s === 3);
}

export function hasResults(p: Profile | null): p is Profile & { completedAt: string } {
  return !!p?.completedAt;
}
