import { useRef, useState } from 'react';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import { loadAllBlobs } from '../../data/db';
import type { ScrapbookDoc } from '../../types';
import { Icon } from '../UI/Icon';
import { AdminHeader, Field, Input, Textarea, Toggle } from './ui';

const BACKUP_KIND = 'kabbu-scrapbook-backup';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read a photo.'));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  return response.blob();
}

export function SettingsScreen() {
  const doc = useAppStore((state) => state.doc);
  const user = useAppStore((state) => state.user);
  const backendMode = useAppStore((state) => state.backendMode);
  const backendNote = useAppStore((state) => state.backendNote);
  const updateMeta = useAppStore((state) => state.updateMeta);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const changePasscode = useAppStore((state) => state.changePasscode);
  const restoreBackup = useAppStore((state) => state.restoreBackup);
  const signOut = useAppStore((state) => state.signOut);
  const notify = useAppStore((state) => state.notify);

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!doc) return null;
  const meta = doc.meta;
  const settings = doc.settings;

  const handlePasscode = async () => {
    if (newPass.length < 4) {
      notify('Use at least four characters for the passcode.', 'error');
      return;
    }
    if (newPass !== confirmPass) {
      notify('The two passcodes do not match.', 'error');
      return;
    }
    await changePasscode(newPass);
    setNewPass('');
    setConfirmPass('');
  };

  const exportBackup = async () => {
    try {
      const blobs = await loadAllBlobs();
      const encoded: Record<string, { type: string; dataUrl: string }> = {};
      for (const [key, blob] of blobs) {
        encoded[key] = { type: blob.type, dataUrl: await blobToDataUrl(blob) };
      }
      const safeDoc: ScrapbookDoc = {
        ...doc,
        meta: { ...doc.meta, passHash: '' },
      };
      const payload = {
        kind: BACKUP_KIND,
        exportedAt: Date.now(),
        doc: safeDoc,
        blobs: encoded,
      };
      const file = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kabbu-scrapbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      notify(`Backup downloaded — ${Object.keys(encoded).length} media files included.`, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The backup could not be created.', 'error');
    }
  };

  const importBackup = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as {
        kind?: string;
        doc?: ScrapbookDoc;
        blobs?: Record<string, { dataUrl: string }>;
      };
      if (payload.kind !== BACKUP_KIND || !payload.doc?.pages?.length) {
        throw new Error('That file is not a Kabbu scrapbook backup.');
      }
      const blobs = new Map<string, Blob>();
      for (const [key, entry] of Object.entries(payload.blobs ?? {})) {
        blobs.set(key, await dataUrlToBlob(entry.dataUrl));
      }
      const restored: ScrapbookDoc = {
        ...payload.doc,
        meta: { ...payload.doc.meta, passHash: doc.meta.passHash },
      };
      if (!window.confirm('Replace the current draft with this backup? The live book is unaffected until you publish.')) {
        return;
      }
      setReplacing(true);
      await restoreBackup(restored, blobs);
      notify('Backup restored into the draft.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'That backup could not be restored.', 'error');
    } finally {
      setImporting(false);
      setReplacing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const leave = async () => {
    const dirty = useAppStore.getState().dirty;
    if (dirty && !window.confirm('There are changes that have not been saved yet. Sign out anyway?')) {
      return;
    }
    await signOut();
    navigate('/admin/login', true);
  };

  return (
    <div>
      <AdminHeader
        title="Settings"
        subtitle="The words on the cover, the sound of the book, the way you sign in, and a portable backup of everything."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="admin-card p-4 sm:p-5">
          <h2 className="font-display text-lg text-ink">Book details</h2>
          <p className="mb-3 mt-1 text-[0.72rem] text-ink/50">
            These appear on the envelope, cover, and welcome page.
          </p>
          <div className="space-y-3">
            <Field label="Title">
              <Input
                value={meta.title}
                maxLength={60}
                onChange={(event) => updateMeta({ title: event.target.value })}
              />
            </Field>
            <Field label="Subtitle">
              <Input
                value={meta.subtitle}
                maxLength={90}
                onChange={(event) => updateMeta({ subtitle: event.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="For (recipient)">
                <Input
                  value={meta.recipient}
                  maxLength={60}
                  onChange={(event) => updateMeta({ recipient: event.target.value })}
                />
              </Field>
              <Field label="From (sender)">
                <Input
                  value={meta.sender}
                  maxLength={60}
                  onChange={(event) => updateMeta({ sender: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Welcome note" hint="A line on the envelope before the book opens.">
              <Textarea
                rows={2}
                value={meta.welcomeNote}
                maxLength={240}
                onChange={(event) => updateMeta({ welcomeNote: event.target.value })}
              />
            </Field>
            <Field label="Cover note">
              <Textarea
                rows={2}
                value={meta.coverNote}
                maxLength={240}
                onChange={(event) => updateMeta({ coverNote: event.target.value })}
              />
            </Field>
          </div>
        </section>

        <div className="space-y-5">
          <section className="admin-card p-4 sm:p-5">
            <h2 className="font-display text-lg text-ink">Sound</h2>
            <p className="mb-3 mt-1 text-[0.72rem] text-ink/50">
              Sound never starts on its own — the reader turns it on.
            </p>
            <div className="space-y-3">
              <Toggle
                label="Background music"
                hint="Soft instrumental loops while reading."
                checked={settings.music}
                onChange={(music) => updateSettings({ music })}
              />
              <Toggle
                label="Page and envelope sounds"
                hint="Gentle taps, page turns, and a rustle for letters."
                checked={settings.sfx}
                onChange={(sfx) => updateSettings({ sfx })}
              />
              <label className="block">
                <span className="label flex items-baseline justify-between">
                  <span>Volume</span>
                  <span className="tabular-nums opacity-60">{Math.round(settings.volume * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.volume}
                  onChange={(event) => updateSettings({ volume: Number(event.target.value) })}
                  className="kabbu-range mt-1 w-full"
                  aria-label="Volume"
                />
              </label>
            </div>
          </section>

          <section className="admin-card p-4 sm:p-5">
            <h2 className="font-display text-lg text-ink">Account & access</h2>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-[rgba(156,100,116,.16)] bg-[rgba(255,251,243,.6)] px-3 py-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3dcdc] text-[0.78rem] font-semibold text-deeprose">
                {(user?.name || user?.email || 'A').slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">
                  {user?.name || 'Administrator'}
                </span>
                <span className="block truncate text-[0.68rem] text-ink/45">
                  {user?.email || 'Local passcode account'}
                </span>
              </span>
              <button type="button" className="chip min-h-8 text-[0.68rem]" onClick={() => void leave()}>
                <Icon name="logout" size={13} /> Sign out
              </button>
            </div>
            <p className="mt-2 text-[0.68rem] leading-relaxed text-ink/45">{backendNote}</p>

            {backendMode === 'local' ? (
              <div className="mt-4 space-y-3">
                <Field label="New passcode" hint="At least four characters. Stored as a salted hash.">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={newPass}
                    onChange={(event) => setNewPass(event.target.value)}
                  />
                </Field>
                <Field label="Confirm passcode">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPass}
                    onChange={(event) => setConfirmPass(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handlePasscode();
                    }}
                  />
                </Field>
                <button
                  type="button"
                  className="btn btn-primary min-h-10 w-full"
                  onClick={() => void handlePasscode()}
                >
                  <Icon name="lock" size={14} /> Update passcode
                </button>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-[rgba(156,100,116,.16)] bg-[rgba(255,251,243,.6)] px-3 py-2.5 text-[0.7rem] leading-relaxed text-ink/55">
                This studio is secured by Supabase Authentication. Change the password from the
                Supabase dashboard → Authentication → Users. There is no public sign-up.
              </p>
            )}
          </section>

          <section className="admin-card p-4 sm:p-5">
            <h2 className="font-display text-lg text-ink">Backup</h2>
            <p className="mt-1 text-[0.72rem] leading-relaxed text-ink/50">
              Download the whole draft and every photo as one file. Your current passcode is never
              included in the backup.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary min-h-10"
                onClick={() => void exportBackup()}
                disabled={importing || replacing}
              >
                <Icon name="download" size={14} /> Download backup
              </button>
              <button
                type="button"
                className="btn btn-ghost min-h-10"
                onClick={() => fileRef.current?.click()}
                disabled={importing || replacing || backendMode === 'supabase'}
                title={
                  backendMode === 'supabase'
                    ? 'Backup restore is only available in local mode.'
                    : undefined
                }
              >
                <Icon name="upload" size={14} />
                {importing || replacing ? 'Restoring…' : 'Restore backup'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importBackup(file);
                }}
              />
            </div>
            {backendMode === 'supabase' && (
              <p className="mt-2 text-[0.66rem] leading-relaxed text-ink/45">
                With Supabase, data lives in Postgres and Storage — use the Supabase dashboard or SQL
                editor for restores.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
