import { useCallback, useEffect, useState } from "react";

export type Settings = { music: boolean; sfx: boolean };

const KEY = "hourglass-settings";
const DEFAULTS: Settings = { music: true, sfx: true };

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
    } catch {
      /* ignore */
    }
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { settings, update };
}

export const PROGRESS_KEY = "hourglass-progress";

export type Progress = { wins1: number; wins2: number; games: number };

export const emptyProgress: Progress = { wins1: 0, wins2: 0, games: 0 };

export function readProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (raw) return { ...emptyProgress, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    /* ignore */
  }
  return emptyProgress;
}

export function writeProgress(p: Progress) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
