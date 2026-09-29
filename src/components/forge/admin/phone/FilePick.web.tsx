import { useCrm } from '@/components/forge/admin/crm-theme';
import type { PickedFile } from '@/data/crm-live';

/**
 * One row of the "Add a document" sheet (web twin of `FilePick.tsx`): the design's `<label>` around a hidden
 * file input. "Take a photo" adds `accept=image/*` and `capture=environment`, which a phone browser honours by
 * opening the rear camera.
 */
export function FilePick({
  label,
  sub,
  photo,
  onFile,
}: {
  label: string;
  sub: string;
  photo?: boolean;
  onFile: (f: PickedFile) => void;
  onError: (msg: string) => void;
}) {
  const { c } = useCrm();
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 60,
        borderBottom: `1px solid ${c.line}`,
        fontSize: 17,
        color: c.ink,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <span>
        {label}
        <div style={{ fontSize: 13, color: c.ink3, marginTop: 2 }}>{sub}</div>
      </span>
      <span style={{ color: c.ink3, fontSize: 22 }}>›</span>
      <input
        type="file"
        {...(photo ? { accept: 'image/*', capture: 'environment' as const } : {})}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          // Clear it so choosing the same file again still fires a change.
          e.target.value = '';
          if (f) onFile({ name: f.name, size: f.size, type: f.type, blob: f as Blob });
        }}
      />
    </label>
  );
}
