import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import type { PickedFile } from '@/data/crm-live';

/**
 * One row of the "Add a document" sheet — native fallback. The web twin (`FilePick.web.tsx`) is the design's
 * `<label>` around a hidden `<input type=file>` (with `capture=environment` for "Take a photo").
 *
 * Native opens the document picker (images only for the photo row). `expo-document-picker` is loaded INSIDE
 * the tap, never at the top of the file — a native module imported at the top would crash an older build this
 * JavaScript reaches by OTA (the `pick-text-file.ts` rule, same as `UploadDrop.tsx`).
 */
export function FilePick({
  label,
  sub,
  photo,
  onFile,
  onError,
}: {
  label: string;
  sub: string;
  photo?: boolean;
  onFile: (f: PickedFile) => void;
  onError: (msg: string) => void;
}) {
  const { c } = useCrm();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    let picker: typeof import('expo-document-picker');
    try {
      picker = await import('expo-document-picker');
    } catch {
      onError('File upload needs the next app build. Use the web dashboard for now.');
      return;
    }
    setBusy(true);
    try {
      const res = await picker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true, type: photo ? 'image/*' : '*/*' });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      const blob: Blob = (a as { file?: File }).file ?? (await (await fetch(a.uri)).blob());
      onFile({ name: a.name, size: a.size ?? blob.size, type: a.mimeType || blob.type || '', blob });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Couldn’t read that file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={() => void pick()}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60, borderBottomWidth: 1, borderBottomColor: c.line }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 17, color: c.ink }}>{busy ? 'Reading…' : label}</Text>
        <Text style={{ marginTop: 2, fontSize: 13, color: c.ink3 }}>{sub}</Text>
      </View>
      <Text style={{ fontSize: 22, color: c.ink3 }}>›</Text>
    </Pressable>
  );
}
