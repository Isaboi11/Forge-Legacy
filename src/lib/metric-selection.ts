import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * P-2 metric selection — which lifts appear on the Progress Hub's Strength cards, and in what order
 * (device-local, mirrors the .dc's `forge.metrics.selected` localStorage). Up to four; an empty list means
 * "use the default" (the screen falls back to the athlete's most-recent lifts).
 */

const KEY = 'forge.metrics.selected.v1';
export const METRIC_CAP = 4;

async function read(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as string[]) : [];
  } catch {
    return [];
  }
}

async function write(list: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, METRIC_CAP)));
  } catch {
    // best-effort; selection is a convenience, not canonical data
  }
}

export interface MetricSelection {
  /** Explicit saved selection (empty until the athlete edits — screen falls back to a default). */
  selected: string[];
  loaded: boolean;
  /** Persist a new ordered list (capped) and update state. */
  persist: (list: string[]) => void;
}

export function useMetricSelection(): MetricSelection {
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void read().then((list) => {
      if (!cancelled) {
        setSelected(list);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((list: string[]) => {
    const capped = list.slice(0, METRIC_CAP);
    setSelected(capped);
    void write(capped);
  }, []);

  return { selected, loaded, persist };
}
