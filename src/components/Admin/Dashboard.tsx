import { useEffect, useState } from 'react';
import type { Page, TemplateId } from '../../types';
import { useAppStore } from '../../data/store';
import { TEMPLATE_GUIDE, TEMPLATE_LABELS } from '../../data/factories';
import { navigate } from '../../lib/router';
import { PageCanvas } from '../Scrapbook/PageCanvas';
import { Icon } from '../UI/Icon';
import { Modal } from '../UI/Modal';
import { Sticker } from '../Stickers/Sticker';
import { AdminHeader, EmptyState, StatCard, relativeTime } from './ui';

const TEMPLATES = Object.keys(TEMPLATE_LABELS) as TemplateId[];

function NewPageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addPage = useAppStore((state) => state.addPage);

  const create = (template: TemplateId) => {
    const page: Page | null = addPage(template);
    onClose();
    if (page) navigate(`/admin/pages/${encodeURIComponent(page.id)}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a page"
      subtitle="Start from a hand-built layout, then move anything you like."
      size="lg"
    >
      <div className="grid gap-2 px-5 pb-6 pt-3 sm:grid-cols-2 sm:px-6">
        {TEMPLATES.map((template) => (
          <button
            key={template}
            type="button"
            className="admin-card-soft flex items-start gap-3 p-3 text-left transition hover:border-[#c98c9d]/60 hover:bg-[#fffdf7]"
            onClick={() => create(template)}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f3dcdc] text-deeprose">
              <Icon name={template === 'blank' ? 'plus' : 'pages'} size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{TEMPLATE_LABELS[template]}</span>
              <span className="mt-0.5 block text-[0.68rem] leading-snug text-ink/50">
                {TEMPLATE_GUIDE[template]}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function Dashboard() {
  const doc = useAppStore((state) => state.doc);
  const publication = useAppStore((state) => state.publication);
  const versions = useAppStore((state) => state.versions);
  const loadVersions = useAppStore((state) => state.loadVersions);
  const [newPage, setNewPage] = useState(false);

  useEffect(() => {
    if (versions.length === 0) void loadVersions();
  }, [versions.length, loadVersions]);

  if (!doc) {
    return <EmptyState title="Opening your draft" body="The studio is reading the latest saved draft from this backend." />;
  }

  const interactions = doc.pages.reduce(
    (count, page) =>
      count +
      page.elements.filter(
        (element) => element.interaction && element.interaction.type !== 'none',
      ).length,
    0,
  );
  const livePageCount = publication
    ? versions.find((version) => version.id === publication.versionId)?.pageCount
    : undefined;

  const actions = [
    { label: 'Add a page', hint: 'Start from a template', icon: 'plus' as const, run: () => setNewPage(true) },
    { label: 'Upload photos', hint: 'Grow the library', icon: 'upload' as const, run: () => navigate('/admin/photos') },
    { label: 'Write a letter', hint: 'For a rainy day', icon: 'mail' as const, run: () => navigate('/admin/letters') },
    { label: 'Adjust the theme', hint: 'Colours & paper', icon: 'sliders' as const, run: () => navigate('/admin/theme') },
    { label: 'Preview it all', hint: 'See what readers see', icon: 'eye' as const, run: () => navigate('/admin/preview') },
    { label: 'Publish changes', hint: 'Send a new version live', icon: 'cloud' as const, run: () => navigate('/admin/publishing') },
  ];

  return (
    <>
      <AdminHeader
        title="Your little studio"
        subtitle="Everything readers see comes from a published version. Edit freely here — nothing goes live until you publish."
        actions={
          <button type="button" className="btn btn-primary min-h-10" onClick={() => setNewPage(true)}>
            <Icon name="plus" size={15} /> New page
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pages"
          value={doc.pages.length}
          hint={publication ? `${livePageCount ?? '—'} in the live version` : 'Not published yet'}
          icon={<Icon name="pages" size={17} />}
          onClick={() => navigate('/admin/pages')}
        />
        <StatCard
          label="Photographs"
          value={doc.photos.length}
          hint={`${doc.albums.length} album${doc.albums.length === 1 ? '' : 's'}`}
          icon={<Icon name="image" size={17} />}
          onClick={() => navigate('/admin/photos')}
        />
        <StatCard
          label="Letters"
          value={doc.letters.length}
          hint="Handwritten notes in envelopes"
          icon={<Icon name="mail" size={17} />}
          onClick={() => navigate('/admin/letters')}
        />
        <StatCard
          label="Interactions"
          value={interactions}
          hint="Taps that reveal something"
          icon={<Icon name="sparkles" size={17} />}
          onClick={() => navigate('/admin/interactions')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="admin-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(156,100,116,.14)] px-4 py-3">
            <div>
              <h2 className="font-display text-lg leading-tight">The book right now</h2>
              <p className="text-[0.68rem] text-ink/45">
                {doc.meta.title} · for {doc.meta.recipient || 'someone lovely'}
              </p>
            </div>
            <span className={publication ? 'admin-tag live' : 'admin-tag draft'}>
              <Icon name={publication ? 'check' : 'info'} size={11} />
              {publication ? `Version ${publication.versionNumber} live` : 'Draft only'}
            </span>
          </div>
          <div className="grid gap-3 p-4 xs:grid-cols-2">
            {doc.pages.slice(0, 4).map((page, index) => (
              <a
                key={page.id}
                href={`#/admin/pages/${encodeURIComponent(page.id)}`}
                className="admin-page-card group"
              >
                <span className="relative block aspect-[16/10] overflow-hidden bg-[#f3e8db]">
                  <span className="pointer-events-none absolute left-1/2 top-1/2 aspect-[3/4] w-[46%] -translate-x-1/2 -translate-y-1/2 overflow-hidden shadow-paper">
                    <PageCanvas page={page} pageNumber={index + 1} side="single" viewOnly className="h-full w-full" />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-t from-[rgba(48,34,40,.25)] to-transparent opacity-0 transition group-hover:opacity-100" />
                </span>
                <span className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 truncate text-[0.76rem] text-ink">{page.name}</span>
                  <span className="text-[0.6rem] uppercase tracking-[0.12em] text-ink/40">
                    {page.elements.length} el.
                  </span>
                </span>
              </a>
            ))}
          </div>
          <div className="border-t border-[rgba(156,100,116,.14)] px-4 py-3">
            <a href="#/admin/pages" className="inline-flex items-center gap-1.5 text-[0.74rem] text-deeprose transition hover:gap-2.5">
              All {doc.pages.length} pages <Icon name="arrow-right" size={13} />
            </a>
          </div>
        </section>

        <div className="space-y-4">
          <section className="admin-card p-4">
            <h2 className="mb-3 font-display text-lg leading-tight">Quick actions</h2>
            <div className="grid gap-2 xs:grid-cols-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="builder-add"
                  onClick={action.run}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f3dcdc] text-deeprose">
                    <Icon name={action.icon} size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.76rem] font-medium text-ink">{action.label}</span>
                    <span className="block truncate text-[0.62rem] text-ink/45">{action.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="admin-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-lg leading-tight">Recent versions</h2>
              <a href="#/admin/publishing" className="text-[0.68rem] text-deeprose hover:underline">
                All versions
              </a>
            </div>
            {versions.length === 0 ? (
              <p className="text-sm leading-relaxed text-ink/50">
                No version has been published yet. Your draft stays private until you publish it.
              </p>
            ) : (
              <ul className="space-y-2">
                {versions.slice(0, 4).map((version) => {
                  const live = publication?.versionId === version.id;
                  return (
                    <li key={version.id} className="flex items-center gap-2.5 rounded-xl border border-[rgba(156,100,116,.14)] px-3 py-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f6ecdf] font-display text-[0.8rem] text-deeprose">
                        {version.versionNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.76rem] text-ink">{version.label}</span>
                        <span className="block text-[0.62rem] text-ink/45">
                          {relativeTime(version.publishedAt)} · {version.pageCount} pages
                        </span>
                      </span>
                      {live && <span className="admin-tag live">live</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="admin-card relative overflow-hidden p-4">
            <span className="pointer-events-none absolute -right-3 -top-4 block w-16 rotate-12 opacity-25" aria-hidden="true">
              <Sticker id="bow" />
            </span>
            <p className="font-serif text-[0.66rem] uppercase tracking-[0.22em] text-deeprose/60">A gentle reminder</p>
            <p className="mt-1.5 max-w-[30ch] font-hand text-xl leading-snug text-ink/80">
              drafts are private. the scrapbook only changes when you press publish.
            </p>
          </section>
        </div>
      </div>

      <NewPageModal open={newPage} onClose={() => setNewPage(false)} />
    </>
  );
}
