import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import {
  Block,
  Btn,
  Chip,
  Chips,
  Empty,
  ErrorText,
  Field,
  ListRow,
  Note,
  PageHead,
  Panel,
  QueryGate,
  RowMeta,
  RowTitle,
  Tag,
  useWide,
  when,
} from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import {
  deleteDocument,
  documentLink,
  fetchDocuments,
  pickAndUploadDocuments,
  saveDocument,
  type Doc,
} from '@/data/crm-live';
import { bytes, DOC_CATEGORIES, parseTags, type DocCategory } from '@/domain/admin/crm-core';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Documents (Admin-Analytics-Amendment-002, AA-D16). Files live in the PRIVATE `ops-docs` bucket and are
 * opened through a five-minute signed link, minted on tap and never stored. Links (Drive, Notion…) are
 * stored as-is.
 */

function categoryLabel(k: DocCategory): string {
  return DOC_CATEGORIES.find((c) => c.key === k)?.label ?? k;
}

/** Two-tap confirm: the first tap arms for ~4 s, the second acts. */
function useTwoTap(): [boolean, () => void, () => void] {
  const [armed, setArmed] = useState(false);
  const arm = () => {
    setArmed(true);
    setTimeout(() => setArmed(false), 4000);
  };
  return [armed, arm, () => setArmed(false)];
}

export function DocumentsPage(_props: PageProps) {
  const [category, setCategory] = useState<DocCategory | null>(null);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    setText(v);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => setQ(v.trim()), 300));
  };

  const docs = useQuery(() => fetchDocuments(category, q || null), [category, q]);
  const counts = docs.data?.counts ?? {};
  const total = Object.values(counts).reduce<number>((a, n) => a + (n ?? 0), 0);
  const rows = docs.data?.rows ?? [];

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const upload = async () => {
    setUploading(true);
    setUploadMsg(null);
    setUploadErr(null);
    try {
      const out = await pickAndUploadDocuments(category ?? 'auto');
      if (out) {
        const failed = out.failed.map((f) => `${f.name} (${f.reason})`).join(', ');
        setUploadMsg(`Uploaded ${out.uploaded}${failed ? ` · failed: ${failed}` : ''}`);
        docs.refetch();
      }
    } catch (e) {
      setUploadErr(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const specsEmpty = category === 'spec';

  return (
    <View style={{ gap: 28 }}>
      <PageHead
        title="Documents"
        lede="Legal, finance, business, marketing and spec files — in one private place."
        right={
          <>
            <Btn label="Add a link" onPress={() => setAdding(!adding)} />
            <Btn label="Upload files" kind="primary" onPress={() => void upload()} busy={uploading} />
          </>
        }
      />

      <View style={{ gap: 6 }}>
        <Note>
          {docs.data ? `${bytes(docs.data.bytes)} stored. ` : ''}Files live in a private bucket; links to them expire after 5 minutes
          (AA-D16).
        </Note>
        {uploadMsg ? <Note>{uploadMsg}</Note> : null}
        {uploadErr ? <ErrorText>{uploadErr}</ErrorText> : null}
      </View>

      {adding ? (
        <LinkForm
          initialCategory={category ?? 'other'}
          onDone={() => {
            setAdding(false);
            docs.refetch();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : null}

      <Block label="Library">
        <Chips>
          <Chip label="All" count={docs.data ? total : null} on={category == null} onPress={() => setCategory(null)} />
          {DOC_CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              count={docs.data ? (counts[c.key] ?? 0) : null}
              on={category === c.key}
              onPress={() => setCategory(c.key)}
            />
          ))}
        </Chips>
        <Field value={text} onChangeText={onSearch} placeholder="Search titles, tags and notes" autoCapitalize="none" autoCorrect={false} />
        <QueryGate state={docs}>
          {rows.length === 0 ? (
            <Empty>
              {q
                ? 'Nothing matches that.'
                : specsEmpty
                  ? "Upload the spec files from the repo's Docs folder here to keep them with everything else."
                  : category
                    ? `No ${categoryLabel(category).toLowerCase()} documents yet.`
                    : 'No documents yet — upload files or add a link.'}
            </Empty>
          ) : (
            rows.map((d) => <DocRow key={d.id} doc={d} onChanged={docs.refetch} />)
          )}
        </QueryGate>
      </Block>
    </View>
  );
}

// ── One row ────────────────────────────────────────────────────────────────

function DocRow({ doc, onChanged }: { doc: Doc; onChanged: () => void }) {
  const wide = useWide();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<'open' | 'delete' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [armed, arm, disarm] = useTwoTap();

  const open = async () => {
    setBusy('open');
    setErr(null);
    try {
      const url = await documentLink(doc);
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
      else await Linking.openURL(url);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!armed) {
      arm();
      return;
    }
    disarm();
    setBusy('delete');
    setErr(null);
    try {
      await deleteDocument(doc.id);
      setBusy(null);
      onChanged();
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(null);
    }
  };

  const meta = [categoryLabel(doc.category), doc.size_bytes != null ? bytes(doc.size_bytes) : null, `updated ${when(doc.updated_at)}`, doc.url ? 'link' : 'file']
    .filter(Boolean)
    .join(' · ');

  // Delete is quiet until armed: a red button on every row of a library reads as the row's main action.
  const actions = (
    <Chips>
      <Btn label="Open" small onPress={() => void open()} busy={busy === 'open'} />
      <Btn label={editing ? 'Close' : 'Edit'} small onPress={() => setEditing(!editing)} />
      <Btn label={armed ? 'Confirm delete' : 'Delete'} small kind={armed ? 'danger' : 'quiet'} onPress={() => void remove()} busy={busy === 'delete'} />
    </Chips>
  );
  const info = (
    <>
      <RowTitle>{doc.title}</RowTitle>
      <RowMeta>{meta}</RowMeta>
      {doc.tags.length ? (
        <Chips>
          {doc.tags.map((t) => (
            <Tag key={t} label={t} tone="muted" />
          ))}
        </Chips>
      ) : null}
      {doc.notes && !editing ? <RowMeta>{doc.notes}</RowMeta> : null}
    </>
  );

  return (
    <ListRow>
      {wide ? (
        <View style={styles.wideRow}>
          <View style={styles.wideInfo}>{info}</View>
          {actions}
        </View>
      ) : (
        <>
          {info}
          {actions}
        </>
      )}
      {err ? <ErrorText>{err}</ErrorText> : null}
      {editing ? (
        <DocEditor
          doc={doc}
          onDone={() => {
            setEditing(false);
            onChanged();
          }}
        />
      ) : null}
    </ListRow>
  );
}

function DocEditor({ doc, onDone }: { doc: Doc; onDone: () => void }) {
  const [title, setTitle] = useState(doc.title);
  const [category, setCategory] = useState<DocCategory>(doc.category);
  const [tags, setTags] = useState(doc.tags.join(', '));
  const [notes, setNotes] = useState(doc.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setErr('A title is required.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await saveDocument(doc.id, { title: title.trim(), category, tags: parseTags(tags), notes });
      setBusy(false);
      onDone();
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Panel>
      <Field label="Title" value={title} onChangeText={setTitle} />
      <Chips>
        {DOC_CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} on={category === c.key} onPress={() => setCategory(c.key)} />
        ))}
      </Chips>
      <Field label="Tags" value={tags} onChangeText={setTags} placeholder="comma, separated" autoCapitalize="none" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      {err ? <ErrorText>{err}</ErrorText> : null}
      <View style={{ alignSelf: 'flex-start' }}>
        <Btn label="Save" onPress={() => void save()} busy={busy} />
      </View>
    </Panel>
  );
}

function LinkForm({
  initialCategory,
  onDone,
  onCancel,
}: {
  initialCategory: DocCategory;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<DocCategory>(initialCategory);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const u = url.trim();
    if (!title.trim()) {
      setErr('A title is required.');
      return;
    }
    if (!/^https:\/\/\S+$/i.test(u)) {
      setErr('The link must start with https://');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await saveDocument(null, { title: title.trim(), url: u, category });
      setBusy(false);
      onDone();
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Panel>
      <Field label="Title" value={title} onChangeText={setTitle} />
      <Field label="Link" value={url} onChangeText={setUrl} placeholder="https://" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      <Chips>
        {DOC_CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} on={category === c.key} onPress={() => setCategory(c.key)} />
        ))}
      </Chips>
      {err ? <ErrorText>{err}</ErrorText> : null}
      <Chips>
        <Btn label="Add link" onPress={() => void save()} busy={busy} />
        <Btn label="Cancel" onPress={onCancel} />
      </Chips>
    </Panel>
  );
}

const styles = StyleSheet.create({
  // Wide: what the document is on the left, what you can do with it on the right, one line per file.
  wideRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  wideInfo: { flex: 1, minWidth: 0, gap: 4 },
});
