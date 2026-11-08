import { Image } from 'react-native';

import { fetchRouteBits, type ShareStoryData } from '@/data/share-story-live';
import { reportError } from '@/lib/diagnostics';

/**
 * What Workout Complete needs, beyond the completion it already holds, to draw the stats-on-the-photo post
 * picture (PO 2026-10-02): the session's route bits and the photo's natural size. The completion is NOT
 * fetched again — the picture must show the numbers the seal screen just showed.
 */
export interface PostPictureBits {
  extras: Omit<ShareStoryData, 'completion'>;
  size: { w: number; h: number };
}

function imageSize(uri: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (w, h) => resolve(w > 0 && h > 0 ? { w, h } : null),
      () => resolve(null),
    );
  });
}

/**
 * Null when the photo cannot be measured — the overlay is then simply not offered. Reported when that happens
 * (PO 11-08): with the choice hidden and nothing said, a broken measure read as "the feature isn't there".
 */
export async function postPictureBits(workoutId: string, photoUrl: string): Promise<PostPictureBits | null> {
  const [extras, size] = await Promise.all([fetchRouteBits(workoutId), imageSize(photoUrl)]);
  if (!size) reportError(new Error('Post picture not offered: the photo could not be measured'), { screen: 'post.picture' });
  return size ? { extras, size } : null;
}
