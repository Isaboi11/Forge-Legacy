import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import type { PickedFile } from '@/data/crm-live';

/**
 * The upload form's drop zone — native fallback (the web twin, `UploadDrop.web.tsx`, takes drag-and-drop
 * and a real multi-file input). Here the zone is a button that opens the document picker.
 *
 * `expo-document-picker` is loaded INSIDE the tap, never at the top of the file: it is a native module, and
 * a top-level import would crash any older build this JavaScript reaches by OTA at launch (the
 * `pick-text-file.ts` rule, same as `pickAndUploadDocuments`).
 */
export function UploadDrop({ onFiles, onError }: { onFiles: (files: PickedFile[]) => void; onError: (msg: string) => void }) {
  const { c } = useCrm();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    let picker: typeof import('expo-document-picker');
    try {
      picker = await import('expo-document-picker');
    } catch {
      onError('File upload needs the next app build — use the web dashboard for now.');
      return;
    }
    setBusy(true);
    try {
      const res = await picker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
      if (res.canceled) return;
      const files: PickedFile[] = [];
      for (const a of res.assets) {
        const blob: Blob = (a as { file?: File }).file ?? (await (await fetch(a.uri)).blob());
        files.push({ name: a.name, size: a.size ?? blob.size, type: a.mimeType || blob.type || '', blob });
      }
      onFiles(files);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Couldn’t read those files.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={() => void pick()}
      accessibilityRole="button"
      accessibilityLabel="Choose files to upload"
      style={{ minHeight: 120, padding: 20, gap: 6, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.fieldBd, backgroundColor: c.field, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: 15, fontWeight: '500', color: c.ink, textAlign: 'center' }}>{busy ? 'Reading files…' : 'Choose files'}</Text>
      <Text style={{ fontSize: 12.5, color: c.ink3, textAlign: 'center' }}>Several at once. Up to 50 MB each. I’ll guess the shelf from the file name.</Text>
    </Pressable>
  );
}
