import { useState } from 'react';

import { useCrm } from '@/components/forge/admin/crm-theme';
import type { PickedFile } from '@/data/crm-live';

/**
 * The upload form's drop zone (web twin of `UploadDrop.tsx`): the design's dashed `<label>` wrapping a
 * hidden multi-file `<input>`, which also takes files dropped onto it. The browser hands back real `File`s,
 * which upload as-is.
 */
export function UploadDrop({ onFiles }: { onFiles: (files: PickedFile[]) => void; onError: (msg: string) => void }) {
  const { c } = useCrm();
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []).map((f) => ({ name: f.name, size: f.size, type: f.type, blob: f as Blob }));
    if (files.length) onFiles(files);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 120,
        padding: 20,
        boxSizing: 'border-box',
        borderRadius: 12,
        border: `1.5px dashed ${over ? c.brz : c.fieldBd}`,
        background: over ? c.brzTint : c.field,
        cursor: 'pointer',
        textAlign: 'center',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 500, color: c.ink }}>Drop files here, or choose them</span>
      <span style={{ fontSize: 12.5, color: c.ink3 }}>Several at once. Up to 50 MB each. I’ll guess the shelf from the file name.</span>
      <input
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          take(e.target.files);
          // Clear it so choosing the same file again still fires a change.
          e.target.value = '';
        }}
      />
    </label>
  );
}
