import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Body-metrics UI prefs (device-local, mirrors the .dc's `forge.body.enabled` / `forge.body.showtrend`
 * localStorage): whether the section is shown at all, and whether the delta chip renders. Entries live
 * server-side (0028); these two are just per-device display toggles. Body is OFF by default — opt-in.
 */

const ENABLED = 'forge.body.enabled.v1';
const SHOWTREND = 'forge.body.showtrend.v1';

const get = async (k: string) => {
  try {
    return await AsyncStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string) => {
  void AsyncStorage.setItem(k, v).catch(() => {});
};

export function useBodyPrefs(): {
  enabled: boolean;
  showTrend: boolean;
  loaded: boolean;
  setEnabled: (v: boolean) => void;
  setShowTrend: (v: boolean) => void;
} {
  const [enabled, setEnabledState] = useState(false);
  const [showTrend, setShowTrendState] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([get(ENABLED), get(SHOWTREND)]).then(([e, s]) => {
      if (cancelled) return;
      setEnabledState(e === '1');
      setShowTrendState(s !== '0');
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    set(ENABLED, v ? '1' : '0');
  }, []);
  const setShowTrend = useCallback((v: boolean) => {
    setShowTrendState(v);
    set(SHOWTREND, v ? '1' : '0');
  }, []);

  return { enabled, showTrend, loaded, setEnabled, setShowTrend };
}
