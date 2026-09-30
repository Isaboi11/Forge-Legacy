import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View, type TextStyle } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import {
  Btn,
  Chip,
  DeleteBtn,
  ErrorLine,
  Field,
  FieldGrid,
  FormPanel,
  Input,
  Opt,
  PageHeader,
  Panel,
  Row,
  Skeleton,
  useLayout,
  useToast,
  useTwoTap,
  when,
} from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { Select } from '@/components/forge/admin/Select';
import { UploadDrop } from '@/components/forge/admin/UploadDrop';
import { deleteDocument, documentLink, fetchDocuments, saveDocument, uploadDocumentFiles, type Doc, type PickedFile } from '@/data/crm-live';
import { bytes, DOC_CATEGORIES, guessCategory, parseTags, type DocCategory } from '@/domain/admin/crm-core';
import { documentsNote } from '@/domain/admin/notes/documents';
import { rawErrorMessage as errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Documents (Admin-Analytics-Amendment-002, AA-D16), built to `Forge CRM.dc.html`.
 *
 * Files live in the PRIVATE `ops-docs` bucket and open through a five-minute signed link, minted on tap
 * and never stored. Links (Drive, Figma…) are stored as-is and open in a new tab.
 *
 * The whole library is fetched once (it is small) and the shelf chips, the search and the counts all work
 * on those rows, so a chip's count and the list under it always agree.
 */

const MAX_BYTES = 50 * 1024 * 1024;
const TOO_BIG = 'Too big. Files can be up to 50 MB.';
const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };
const SHELF_OPTIONS = DOC_CATEGORIES.map((d) => ({ value: d.key, label: d.label }));
const shelfLabel = (k: DocCategory) => DOC_CATEGORIES.find((d) => d.key === k)?.label ?? k;
const isLink = (d: Doc) => !!d.url && !d.storage_path;

/** "PDF" / "XLSX" / "LINK": the file's own extension first (what the operator recognises), then the mime. */
function kindOf(d: Doc): string {
  if (isLink(d)) return 'LINK';
  const ext = d.storage_path?.match(/\.([a-z0-9]{1,5})$/i)?.[1];
  if (ext) return ext.toUpperCase().slice(0, 4);
  const m = (d.mime ?? '').toLowerCase();
  if (m.includes('pdf')) return 'PDF';
  if (m.includes('spreadsheet') || m.includes('excel')) return 'XLSX';
  if (m.includes('zip')) return 'ZIP';
  if (m.includes('presentation') || m.includes('keynote')) return 'KEY';
  if (m.includes('markdown')) return 'MD';
  if (m.startsWith('image/')) return m.slice(6, 10).toUpperCase();
  return 'FILE';
}

interface QueueItem {
  key: string;
  file: PickedFile;
  shelf: DocCategory;
  /** Over 50 MB: never sent. */
  tooBig: boolean;
  /** The reason from the last attempt; the row stays so it can be retried or removed. */
  failed: string | null;
}

interface LinkForm {
  title: string;
  url: string;
  tags: string;
  shelf: DocCategory;
}

interface EditState {
  id: string;
  title: string;
  tags: string;
  shelf: DocCategory;
}

let queueSeq = 0;

export function DocumentsPage(_props: PageProps) {
  const { c } = useCrm();
  const { w } = useLayout();
  const toast = useToast();
  // One clock per mount: the note's "days ago" is read against it (no Date.now() in render).
  const [now] = useState(() => Date.now());

  const lib = useQuery(() => fetchDocuments(null, null), []);

  // ── Filters ──
  const [shelf, setShelf] = useState<DocCategory | 'all'>('all');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const onSearch = (v: string) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setQ(v.trim().toLowerCase()), 250);
  };
  const clearFilters = () => {
    if (timer.current) clearTimeout(timer.current);
    setText('');
    setQ('');
    setShelf('all');
  };

  // ── Forms ──
  const [form, setForm] = useState<'link' | 'upload' | null>(null);
  const [link, setLink] = useState<LinkForm>({ title: '', url: '', tags: '', shelf: 'other' });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ── Rows ──
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [rowErr, setRowErr] = useState<{ id: string; msg: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const { armed, tap } = useTwoTap();

  // ── Derived ──
  const all = lib.data?.rows ?? [];
  const shown = all.filter(
    (d) =>
      (shelf === 'all' || d.category === shelf) &&
      (!q || `${d.title} ${d.tags.join(' ')} ${d.notes ?? ''} ${shelfLabel(d.category)}`.toLowerCase().includes(q)),
  );
  const count = (k: DocCategory) => all.filter((d) => d.category === k).length;

  const latest = all.reduce<Doc | null>((m, d) => (!m || d.updated_at > m.updated_at ? d : m), null);
  const dayStart = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const note = lib.data
    ? documentsNote({
        total: all.length,
        links: all.filter(isLink).length,
        sizeLabel: bytes(lib.data.bytes),
        latest: latest ? { title: latest.title, daysAgo: Math.round((dayStart(now) - dayStart(new Date(latest.updated_at).getTime())) / 86_400_000) } : null,
      })
    : null;

  const sendable = queue.filter((f) => !f.tooBig);

  // ── Writes ──
  const openForm = (kind: 'link' | 'upload') => {
    setForm(kind);
    setFormErr(null);
    setLink({ title: '', url: '', tags: '', shelf: 'other' });
    setQueue([]);
  };

  const addFiles = (files: PickedFile[]) => {
    setQueue((qq) => qq.concat(files.map((f) => ({ key: `f${queueSeq++}`, file: f, shelf: guessCategory(f.name), tooBig: f.size > MAX_BYTES, failed: null }))));
    setFormErr(null);
  };

  const saveLink = async () => {
    const title = link.title.trim();
    const url = link.url.trim();
    if (!title) return setFormErr('Give the link a title.');
    if (!/^https?:\/\/\S+\.\S+/.test(url)) return setFormErr('Paste a full link starting with https://');
    setBusy(true);
    setFormErr(null);
    try {
      await saveDocument(null, { title, url, category: link.shelf, tags: parseTags(link.tags) });
      setForm(null);
      clearFilters();
      lib.refetch();
      toast('Link added');
    } catch (e) {
      setFormErr(`Couldn’t add it. ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const upload = async () => {
    if (!sendable.length) return setFormErr(queue.length ? 'None of these can be uploaded.' : 'Choose at least one file.');
    setBusy(true);
    setFormErr(null);
    try {
      const res = await uploadDocumentFiles(sendable.map((f) => ({ ...f.file, shelf: f.shelf })));
      // One result per file sent, in queue order.
      const outcome = new Map(sendable.map((f, i) => [f.key, res[i]]));
      const done = res.filter((r) => r.ok).length;
      const left = queue
        .filter((f) => !outcome.get(f.key)?.ok)
        .map((f) => {
          const r = outcome.get(f.key);
          return r ? { ...f, failed: `Couldn’t upload. ${r.reason ?? 'upload failed'}` } : f;
        });
      if (done) {
        clearFilters();
        lib.refetch();
        toast(done === 1 ? '1 file uploaded' : `${done} files uploaded`);
      }
      if (left.length) setQueue(left);
      else {
        setQueue([]);
        setForm(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const open = async (d: Doc) => {
    setOpening(d.id);
    setRowErr(null);
    try {
      const url = await documentLink(d);
      if (Platform.OS === 'web') {
        const opener = (globalThis as unknown as { open?: (u: string, t: string, f: string) => unknown }).open;
        if (!opener) throw new Error('This browser can’t open a new tab.');
        // `noopener` makes browsers return null even on success, so the return value says nothing.
        opener(url, '_blank', 'noopener');
      } else {
        await Linking.openURL(url);
      }
    } catch (e) {
      setRowErr({ id: d.id, msg: `Couldn’t open it. ${errorMessage(e)}` });
    } finally {
      setOpening(null);
    }
  };

  const startEdit = (d: Doc) => {
    setEdit({ id: d.id, title: d.title, tags: d.tags.join(', '), shelf: d.category });
    setEditErr(null);
    setRowErr(null);
  };

  const saveEdit = async () => {
    if (!edit) return;
    const title = edit.title.trim();
    if (!title) return setEditErr('The title can’t be empty.');
    setEditBusy(true);
    setEditErr(null);
    try {
      await saveDocument(edit.id, { title, tags: parseTags(edit.tags), category: edit.shelf });
      setEdit(null);
      lib.refetch();
      toast('Saved');
    } catch (e) {
      setEditErr(`Couldn’t save. ${errorMessage(e)}`);
    } finally {
      setEditBusy(false);
    }
  };

  const remove = async (d: Doc) => {
    setDeleting(d.id);
    setRowErr(null);
    try {
      await deleteDocument(d.id);
      if (edit?.id === d.id) setEdit(null);
      lib.refetch();
    } catch (e) {
      setRowErr({ id: d.id, msg: `Couldn’t delete it. ${errorMessage(e)}` });
    } finally {
      setDeleting(null);
    }
  };

  // ── Table ──
  const docWide = w >= 1240;
  const cols = docWide ? [110, 80, 90, 190] : [96, 190];
  const head = docWide ? ['Shelf', 'Size', 'Updated', ''] : ['Shelf', ''];
  const cell = (width: number): TextStyle => ({ width, flexShrink: 0 });

  const table = (
    /* The design's `overflow-x:auto`: on a phone the table scrolls sideways rather than crushing titles. */
    <ScrollView horizontal keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, minWidth: 560 }}>
        <View style={{ flexDirection: 'row', gap: 14, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
          {['Title', ...head].map((h, i) => (
            <Text key={i} style={[{ fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: c.ink3 }, i === 0 ? { flex: 1, minWidth: 0 } : cell(cols[i - 1])]}>
              {h}
            </Text>
          ))}
        </View>
        {shown.map((d) => (
          <View key={d.id}>
            <DocRow>
              <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', gap: 10, alignItems: 'baseline' }}>
                <Text style={{ width: 34, flexShrink: 0, fontSize: 10.5, fontWeight: '700', letterSpacing: 1, color: c.ink3 }}>{kindOf(d)}</Text>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14.5, color: c.ink }}>
                    {d.title}
                  </Text>
                  {d.tags.length ? <Text style={{ fontSize: 12, color: c.ink3 }}>{d.tags.join(', ')}</Text> : null}
                </View>
              </View>
              <Text style={[cell(cols[0]), { fontSize: 13.5, color: c.ink2 }]}>{shelfLabel(d.category)}</Text>
              {docWide ? (
                <>
                  <Text style={[cell(cols[1]), { fontSize: 13.5, color: c.ink3 }, TABULAR]}>{isLink(d) ? '—' : bytes(d.size_bytes)}</Text>
                  <Text style={[cell(cols[2]), { fontSize: 13.5, color: c.ink3 }, TABULAR]}>{when(d.updated_at)}</Text>
                </>
              ) : null}
              <View style={[{ width: cols[cols.length - 1], flexShrink: 0 }, { flexDirection: 'row', gap: 6, justifyContent: 'flex-end' }]}>
                <SmallBtn label={opening === d.id ? 'Opening…' : 'Open'} bordered onPress={() => void open(d)} />
                <SmallBtn label="Edit" onPress={() => (edit?.id === d.id ? setEdit(null) : startEdit(d))} />
                <DeleteBtn size="xs" armed={armed === d.id} busy={deleting === d.id} onPress={() => tap(d.id, () => void remove(d))} />
              </View>
            </DocRow>
            {rowErr?.id === d.id ? <Text style={{ paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: c.crit }}>{rowErr.msg}</Text> : null}
            {edit?.id === d.id ? (
              <Panel pad={18} gap={14} style={{ marginTop: 8, marginBottom: 12, borderRadius: 12 }}>
                <FieldGrid>
                  <Field label="Title">
                    <Input
                      value={edit.title}
                      onChangeText={(t) => {
                        setEdit({ ...edit, title: t });
                        setEditErr(null);
                      }}
                      style={{ height: 38 }}
                    />
                  </Field>
                  <Field label="Tags">
                    <Input value={edit.tags} onChangeText={(t) => setEdit({ ...edit, tags: t })} placeholder="Comma separated" style={{ height: 38 }} />
                  </Field>
                  <Field label="Shelf">
                    <Select value={edit.shelf} options={SHELF_OPTIONS} onChange={(v) => setEdit({ ...edit, shelf: v as DocCategory })} accessibilityLabel="Shelf" />
                  </Field>
                </FieldGrid>
                <Row gap={10}>
                  <Btn size="sm" kind="primary" label="Save changes" busy={editBusy} onPress={() => void saveEdit()} />
                  <Btn size="sm" label="Cancel" onPress={() => setEdit(null)} />
                  {editErr ? <Text style={{ fontSize: 13, color: c.crit }}>{editErr}</Text> : null}
                </Row>
              </Panel>
            ) : null}
          </View>
        ))}
        {shown.length === 0 ? (
          <Text style={{ paddingVertical: 18, paddingHorizontal: 12, fontSize: 14.5, color: c.ink2 }}>
            {all.length === 0 ? 'Nothing filed yet. Upload a file, or add a link to something kept elsewhere.' : 'Nothing matches that search. Try a tag, or clear the shelf filter.'}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );

  return (
    <View>
      <PageHeader
        title="Documents"
        purpose="One private place for the business’s paperwork. Links to files expire after five minutes."
        note={note}
        actions={[
          { label: 'Add a link', kind: 'quiet', onPress: () => openForm('link') },
          { label: 'Upload files', kind: 'primary', onPress: () => openForm('upload') },
        ]}
      />

      {form === 'link' ? (
        <FormPanel title="Add a link" saveLabel="Add link" onSave={() => void saveLink()} onCancel={() => setForm(null)} busy={busy} error={formErr}>
          <FieldGrid>
            <Field label="Title">
              <Input
                value={link.title}
                onChangeText={(t) => {
                  setLink({ ...link, title: t });
                  setFormErr(null);
                }}
                placeholder="e.g. Press kit"
              />
            </Field>
            <Field label="Link">
              <Input
                value={link.url}
                onChangeText={(t) => {
                  setLink({ ...link, url: t });
                  setFormErr(null);
                }}
                placeholder="https://"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
            <Field label="Tags">
              <Input value={link.tags} onChangeText={(t) => setLink({ ...link, tags: t })} placeholder="Optional, comma separated" />
            </Field>
          </FieldGrid>
          <Field label="Shelf">
            <Row gap={6}>
              {DOC_CATEGORIES.map((s) => (
                <Opt key={s.key} label={s.label} on={link.shelf === s.key} onPress={() => setLink({ ...link, shelf: s.key })} />
              ))}
            </Row>
          </Field>
          <Text style={{ fontSize: 12.5, color: c.ink3 }}>For things kept in Google Drive, Figma and so on. The link opens in a new tab.</Text>
        </FormPanel>
      ) : null}

      {form === 'upload' ? (
        <FormPanel
          title="Upload files"
          saveLabel={busy ? 'Uploading…' : sendable.length > 1 ? `Upload ${sendable.length} files` : 'Upload'}
          onSave={() => void upload()}
          onCancel={() => {
            setForm(null);
            setQueue([]);
          }}
          busy={busy}
          error={formErr}
        >
          <UploadDrop onFiles={addFiles} onError={setFormErr} />
          {queue.length ? (
            <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
              {queue.map((f) => {
                const err = f.tooBig ? TOO_BIG : f.failed;
                return (
                  <View key={f.key} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text numberOfLines={1} style={{ fontSize: 13.5, color: c.ink }}>
                        {f.file.name}
                      </Text>
                      {err ? <Text style={{ fontSize: 12.5, color: c.crit }}>{err}</Text> : null}
                    </View>
                    <Text style={[{ fontSize: 13.5, color: c.ink3 }, TABULAR]}>{bytes(f.file.size)}</Text>
                    <Select
                      compact
                      value={f.shelf}
                      options={SHELF_OPTIONS}
                      accessibilityLabel={`Shelf for ${f.file.name}`}
                      onChange={(v) => setQueue((qq) => qq.map((x) => (x.key === f.key ? { ...x, shelf: v as DocCategory } : x)))}
                    />
                    <Text onPress={busy ? undefined : () => setQueue((qq) => qq.filter((x) => x.key !== f.key))} accessibilityRole="button" style={{ fontSize: 13, color: c.ink3 }}>
                      Remove
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </FormPanel>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingBottom: 16 }}>
        <Input value={text} onChangeText={onSearch} placeholder="Search by title, tag or note" accessibilityLabel="Search documents" style={{ flex: 1, maxWidth: 420, paddingHorizontal: 14 }} />
        <View style={{ flex: 1 }} />
        {lib.data ? <Text style={[{ fontSize: 13, color: c.ink3 }, TABULAR]}>{bytes(lib.data.bytes)} used · files up to 50 MB each</Text> : null}
      </View>

      <Row gap={8} style={{ paddingBottom: 20 }}>
        <Chip label="All" count={lib.data ? all.length : null} on={shelf === 'all'} onPress={() => setShelf('all')} />
        {DOC_CATEGORIES.map((s) => (
          <Chip key={s.key} label={s.label} count={lib.data ? count(s.key) : null} on={shelf === s.key} onPress={() => setShelf(s.key)} />
        ))}
      </Row>

      {lib.loading && !lib.data ? <Skeleton /> : lib.error ? <ErrorLine onRetry={lib.refetch}>Couldn’t load documents. {lib.error}</ErrorLine> : table}
    </View>
  );
}

/** A table row with the design's hover wash (web). */
function DocRow({ children }: { children: React.ReactNode }) {
  const { c } = useCrm();
  return (
    <Pressable
      accessible={false}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
        backgroundColor: hovered ? c.hover : 'transparent',
      })}
    >
      {children}
    </Pressable>
  );
}

/** The row's 28 px "Open" (bordered) and "Edit" (bare) buttons. */
function SmallBtn({ label, onPress, bordered }: { label: string; onPress: () => void; bordered?: boolean }) {
  const { c } = useCrm();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ height: 28, paddingHorizontal: 10, borderRadius: 7, justifyContent: 'center', borderWidth: bordered ? 1 : 0, borderColor: c.fieldBd }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: bordered ? '600' : '500', color: bordered ? c.ink : c.ink2 }}>{label}</Text>
    </Pressable>
  );
}
