import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type Svg from 'react-native-svg';

import { StoryCanvas } from '@/components/forge/StoryCanvas';
import type { StoryDrawing } from '@/domain/share/story-card';

/**
 * Rasterises the share picture on a phone — the `ShareCardHost` arrangement, for the 1080×1920 story.
 *
 * `toDataURL` is a method on a MOUNTED `Svg`, so the picture has to exist in the view tree before it can
 * become a PNG. This is that tree: one `StoryCanvas` at full size, off-screen, driven by a module-level
 * queue so the caller still gets a promise. Off-screen rather than `opacity: 0` / `display: none`, which
 * have each returned a blank image on one platform or another (see `share-card-host.tsx`).
 *
 * No new native module — react-native-svg is already in the binary — so this reaches phones over the air.
 */

type Resolver = (base64: string | null) => void;
interface Job {
  drawing: StoryDrawing;
  photo: string | null;
}

type Host = (job: Job, resolve: Resolver) => void;
/**
 * Every mounted host, newest last. A stack, not one slot: Workout Complete mounts one for its post picture
 * and `/share-story` (pushed over it) mounts another — with a single slot, leaving `/share-story` cleared
 * the slot and stranded Workout Complete's host.
 */
const hosts: Host[] = [];

export function storyHostReady(): boolean {
  return hosts.length > 0;
}

/** Draw and snapshot. Null when no host is mounted, the platform declines, or six seconds pass. */
export function rasterizeStory(drawing: StoryDrawing, photo: string | null): Promise<string | null> {
  const host = hosts[hosts.length - 1];
  if (!host) return Promise.resolve(null);
  return new Promise<string | null>((resolve) => {
    let settled = false;
    const once: Resolver = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const timer = setTimeout(() => once(null), 6000);
    host({ drawing, photo }, (v) => {
      clearTimeout(timer);
      once(v);
    });
  });
}

export function StoryCardHost() {
  const svgRef = useRef<Svg>(null);
  const [job, setJob] = useState<Job | null>(null);
  /** The job whose photo has decoded — set by the photo's own load event, never guessed from a delay. */
  const [loadedJob, setLoadedJob] = useState<Job | null>(null);
  const pending = useRef<Resolver | null>(null);

  useEffect(() => {
    const host: Host = (next, resolve) => {
      pending.current = resolve;
      setJob(next);
    };
    hosts.push(host);
    return () => {
      const at = hosts.indexOf(host);
      if (at >= 0) hosts.splice(at, 1);
      // Unmounting mid-rasterise releases the caller rather than leaving it on the timeout.
      pending.current?.(null);
      pending.current = null;
    };
  }, []);

  const capture = useCallback(() => {
    const resolve = pending.current;
    pending.current = null;
    if (!resolve || !job || !svgRef.current?.toDataURL) {
      resolve?.(null);
      setJob(null);
      return;
    }
    svgRef.current.toDataURL(
      (base64) => {
        resolve(base64 ?? null);
        setJob(null);
      },
      { width: job.drawing.width, height: job.drawing.height },
    );
  }, [job]);

  /*
   * ⚠ WAIT FOR THE PHOTO, NOT FOR A GUESS (PO 11-08). This was a flat 250 ms before the snapshot, and a
   * phone photo that took longer to decode would have gone out as the numbers on an empty frame. Now the
   * snapshot fires 60 ms after the photo's own load event; the 3-second line is only for a platform that
   * never sends one, and is no worse than before.
   */
  useEffect(() => {
    if (!job) return;
    const ready = !job.photo || loadedJob === job;
    const id = setTimeout(capture, ready ? 60 : 3000);
    return () => clearTimeout(id);
  }, [job, loadedJob, capture]);

  if (!job) return null;
  return (
    <View style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <StoryCanvas ref={svgRef} drawing={job.drawing} photoUri={job.photo} onPhotoLoad={() => setLoadedJob(job)} />
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -20000, top: 0, opacity: 1 },
});
