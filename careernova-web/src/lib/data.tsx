import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ModelInfo, Occupation, Tool } from "./types";

export interface Dataset {
  occupations: Occupation[];
  byCode: Map<string, Occupation>;
  tools: Tool[];
  toolByFull: Map<string, Tool>;
  toolByName: Map<string, Tool>;
  fields: Record<string, string>;
  fieldCounts: Record<string, number>;
  stats: { inDemandUnique: number; hotUnique: number };
  model: ModelInfo;
}

interface OccupationsFile {
  meta: { skills: string[]; fields: Record<string, string>; stats: Dataset["stats"] };
  occupations: Occupation[];
}

type State = { status: "loading" } | { status: "error"; retry: () => void } | { status: "ready"; data: Dataset };

const DataContext = createContext<State>({ status: "loading" });

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function loadDataset(): Promise<Dataset> {
  const [occFile, tools, model] = await Promise.all([
    fetchJson<OccupationsFile>("occupations.json"),
    fetchJson<Tool[]>("tools.json"),
    fetchJson<ModelInfo>("model.json"),
  ]);
  const occupations = occFile.occupations;
  const fieldCounts: Record<string, number> = {};
  for (const o of occupations) fieldCounts[o.field] = (fieldCounts[o.field] ?? 0) + 1;
  return {
    occupations,
    byCode: new Map(occupations.map(o => [o.code, o])),
    tools,
    toolByFull: new Map(tools.map(t => [t.full, t])),
    toolByName: new Map(tools.map(t => [t.name.toLowerCase(), t])),
    fields: occFile.meta.fields,
    fieldCounts,
    stats: occFile.meta.stats,
    model,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    loadDataset()
      .then(data => alive && setState({ status: "ready", data }))
      .catch(() => alive && setState({ status: "error", retry: () => setAttempt(a => a + 1) }));
    return () => {
      alive = false;
    };
  }, [attempt]);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

export function useDataState() {
  return useContext(DataContext);
}

/** Only call inside <DataGate>, where the data is guaranteed to be ready. */
export function useData(): Dataset {
  const state = useContext(DataContext);
  if (state.status !== "ready") throw new Error("useData used before data was ready");
  return state.data;
}

let softwareCache: Promise<Record<string, string[]>> | null = null;

/** Full software lists are large, so they load only when someone opens one. */
export function useSoftwareList(code: string, enabled: boolean) {
  const [list, setList] = useState<string[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    softwareCache ??= fetchJson<Record<string, string[]>>("software.json");
    let alive = true;
    softwareCache
      .then(all => alive && setList(all[code] ?? []))
      .catch(() => {
        softwareCache = null;
        if (alive) setList([]);
      });
    return () => {
      alive = false;
    };
  }, [code, enabled]);
  return list;
}

export function useFieldName() {
  const { fields } = useData();
  return useMemo(() => (code: string) => fields[code] ?? "Other", [fields]);
}
