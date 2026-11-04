import { useEffect, useMemo, useState } from 'react';
import { useAppStore, validateForPublish } from '../../data/store';
import { Icon } from '../UI/Icon';
import { AdminHeader, EmptyState, Field, Input, StatCard, relativeTime } from './ui';

function defaultLabel(): string {
  const date = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `A little update · ${date}`;
}

export function PublishingScreen() {
  const doc = useAppStore((state) => state.doc);
  const publication = useAppStore((state) => state.publication);
  const versions = useAppStore((state) => state.versions);
  const versionsLoading = useAppStore((state) => state.versionsLoading);
  const publishing = useAppStore((state) => state.publishing);
  const publishProgress = useAppStore((state) => state.publishProgress);
  const dirty = useAppStore((state) => state.dirty);
  const saveState = useAppStore((state) => state.saveState);
  const publishNow = useAppStore((state) => state.publishNow);
  const restoreVersion = useAppStore((state) => state.restoreVersion);
  const loadVersions = useAppStore((state) => state.loadVersions);
  const backendMode = useAppStore((state) => state.backendMode);
  const backendNote = useAppStore((state) => state.backendNote);
  const [label, setLabel] = useState(defaultLabel);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  const problems = useMemo(() => (doc ? validateForPublish(doc) : ['The draft is still loading.']), [doc]);
  const busy = publishing || saveState === 'saving';

  const publish = async () => {
    const summary = await publishNow(label.trim() || defaultLabel());
    if (summary) {
      setLabel(defaultLabel());
      await loadVersions();
    }
  };

  const restore = async (id: string, versionNumber: number) => {
    if (
      !window.confirm(
        `Restore version ${versionNumber} into your draft? Your current unsaved draft will be replaced. The live scrapbook stays as it is until you publish again.`,
      )
    ) {
      return;
    }
    await restoreVersion(id);
  };

  return (
    <div>
      <AdminHeader
        title="Publishing"
        subtitle="Drafts live only in the studio. Publishing takes a frozen snapshot and serves it to everyone reading the scrapbook."
        actions={
          <a
            href="#/"
            target="_blank"
            rel="noreferrer"
            className="builder-tool min-h-10 px-3"
          >
            <Icon name="eye" size={14} /> Open live book
          </a>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Live version"
          value={publication ? `v${publication.versionNumber}` : '—'}
          hint={publication ? `Published ${relativeTime(publication.publishedAt)}` : 'Nothing live yet'}
          icon={<Icon name="cloud" size={16} />}
        />
        <StatCard
          label="Draft pages"
          value={doc?.pages.length ?? 0}
          hint={dirty ? 'Unsaved changes in the studio' : 'Draft is saved'}
          icon={<Icon name="pages" size={16} />}
        />
        <StatCard
          label="Stored in"
          value={backendMode === 'supabase' ? 'Supabase' : 'This device'}
          hint={backendNote}
          icon={<Icon name="info" size={16} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="admin-card p-4 sm:p-5">
          <h2 className="font-display text-lg text-ink">Publish the current draft</h2>
          <p className="mt-1 text-[0.74rem] leading-relaxed text-ink/55">
            Every publish creates a version you can restore later. Photos are copied into the
            published snapshot, so deleting a draft photo will never break the live book.
          </p>

          {publication && (
            <div className="mt-3 rounded-xl border border-[rgba(95,115,82,.3)] bg-[rgba(143,163,124,.14)] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[0.74rem] text-[#4f6344]">
                <Icon name="check" size={13} /> Version {publication.versionNumber} is live
              </p>
              <p className="mt-0.5 text-[0.68rem] text-ink/50">
                &ldquo;{publication.label}&rdquo; · {relativeTime(publication.publishedAt)}
              </p>
            </div>
          )}

          {problems.length > 0 ? (
            <div className="mt-4 rounded-xl border border-[rgba(155,79,93,.3)] bg-[rgba(155,79,93,.08)] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[0.74rem] text-[#8f4a56]">
                <Icon name="warning" size={13} /> Finish these before publishing
              </p>
              <ul className="mt-1 list-disc pl-5 text-[0.7rem] leading-relaxed text-ink/60">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-1.5 text-[0.72rem] text-[#4f6344]">
              <Icon name="check" size={13} /> The draft is ready to go live.
            </p>
          )}

          <div className="mt-4 space-y-3">
            <Field label="Version note" hint="A small label for this moment, shown in history.">
              <Input
                value={label}
                maxLength={80}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="A little update"
              />
            </Field>

            {publishing && publishProgress && (
              <div>
                <div className="mb-1 flex items-center justify-between text-[0.68rem] text-ink/55">
                  <span>{publishProgress.label}</span>
                  <span className="tabular-nums">
                    {publishProgress.total
                      ? `${publishProgress.done} / ${publishProgress.total}`
                      : '…'}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(156,100,116,.16)]">
                  <div
                    className="h-full rounded-full bg-[#c98c9d] transition-all"
                    style={{
                      width: publishProgress.total
                        ? `${Math.round((publishProgress.done / publishProgress.total) * 100)}%`
                        : '15%',
                    }}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary min-h-11 w-full"
              disabled={busy || problems.length > 0}
              onClick={() => void publish()}
            >
              <Icon name="cloud" size={15} />
              {publishing ? 'Publishing…' : 'Publish this draft'}
            </button>
            <p className="text-center text-[0.66rem] leading-relaxed text-ink/40">
              {dirty
                ? 'Your latest changes are saved automatically just before publishing.'
                : 'Readers see the new version as soon as publishing finishes.'}
            </p>
          </div>
        </section>

        <section className="admin-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg text-ink">Version history</h2>
              <p className="mt-1 text-[0.72rem] text-ink/50">
                Restoring brings a version back into the draft. Publish to make it live.
              </p>
            </div>
            <button
              type="button"
              className="builder-tool min-h-8 px-2.5 text-[0.68rem]"
              onClick={() => void loadVersions()}
              disabled={versionsLoading}
            >
              <Icon name="refresh" size={12} className={versionsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {versionsLoading && !versions.length ? (
            <p className="mt-6 text-center text-sm text-ink/45">Loading history…</p>
          ) : !versions.length ? (
            <div className="mt-4">
              <EmptyState
                icon="sparkles"
                title="No versions yet"
                body="The first publish will appear here with a snapshot of pages, photos, and letters."
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[rgba(156,100,116,.12)]">
              {versions.map((version) => {
                const live = publication?.versionId === version.id;
                return (
                  <li key={version.id} className="flex flex-wrap items-center gap-2 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f3dcdc] font-display text-[0.8rem] text-deeprose">
                      v{version.versionNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="min-w-0 truncate text-[0.8rem] text-ink">{version.label}</span>
                        {live && <span className="admin-tag live shrink-0">Live</span>}
                      </span>
                      <span className="block text-[0.64rem] text-ink/45">
                        {relativeTime(version.publishedAt)} · {version.pageCount} pages ·{' '}
                        {version.photoCount} photos · {version.letterCount} letters
                      </span>
                    </span>
                    <button
                      type="button"
                      className="chip min-h-8 px-2.5 text-[0.66rem]"
                      onClick={() => void restore(version.id, version.versionNumber)}
                    >
                      Restore
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-5 rounded-xl border border-[rgba(156,100,116,.14)] bg-[rgba(255,251,243,.55)] px-3 py-2.5 text-[0.68rem] leading-relaxed text-ink/50">
        <strong className="font-medium text-ink/70">Where this lives:</strong> {backendNote}
      </p>
    </div>
  );
}
