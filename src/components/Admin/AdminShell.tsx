import { useEffect, useState, type ReactNode } from 'react';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import { Icon, type IconName } from '../UI/Icon';
import { SoundControls } from '../UI/SoundControls';
import { Sticker } from '../Stickers/Sticker';
import { SaveIndicator } from './ui';
import { Dashboard } from './Dashboard';
import { PagesScreen } from './PagesScreen';
import { BuilderScreen } from './BuilderScreen';
import { PhotosScreen } from './PhotosScreen';
import { LettersScreen } from './LettersScreen';
import { StickersScreen } from './StickersScreen';
import { InteractionsScreen } from './InteractionsScreen';
import { ThemeScreen } from './ThemeScreen';
import { PreviewScreen } from './PreviewScreen';
import { PublishingScreen } from './PublishingScreen';
import { SettingsScreen } from './SettingsScreen';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  count?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ROUTE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/dashboard': 'Dashboard',
  '/admin/pages': 'Scrapbook pages',
  '/admin/photos': 'Photo library',
  '/admin/letters': 'Letters & messages',
  '/admin/stickers': 'Stickers & decorations',
  '/admin/interactions': 'Interactive elements',
  '/admin/theme': 'Theme & appearance',
  '/admin/preview': 'Preview scrapbook',
  '/admin/publishing': 'Publishing',
  '/admin/settings': 'Settings',
};

function routeTitle(route: string): string {
  if (route.startsWith('/admin/pages/')) return 'Page builder';
  return ROUTE_TITLES[route] ?? 'Studio';
}

function NavList({
  groups,
  route,
  onNavigate,
}: {
  groups: NavGroup[];
  route: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="admin-nav" aria-label="Studio sections">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="admin-nav-group">{group.title}</p>
          {group.items.map((item) => {
            const active =
              route === item.path ||
              (item.path === '/admin/pages' && route.startsWith('/admin/pages/'));
            return (
              <a
                key={item.path}
                href={`#${item.path}`}
                className={`admin-nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
              >
                <Icon name={item.icon} size={16} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.count != null && <span className="admin-nav-count">{item.count}</span>}
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <a href="#/admin/dashboard" className="admin-brand">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#c98c9d]/35 bg-[rgba(255,248,238,.8)] text-deeprose">
        <Icon name="book" size={18} />
        <span className="absolute -right-1.5 -top-1.5 block w-4 rotate-12">
          <Sticker id="heart" />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[0.98rem] leading-tight text-ink">Kabbu&rsquo;s scrapbook</span>
        <span className="block text-[0.58rem] uppercase tracking-[0.22em] text-deeprose/60">private studio</span>
      </span>
    </a>
  );
}

export function AdminShell({ route }: { route: string }) {
  const doc = useAppStore((state) => state.doc);
  const user = useAppStore((state) => state.user);
  const signOut = useAppStore((state) => state.signOut);
  const dirty = useAppStore((state) => state.dirty);
  const saveState = useAppStore((state) => state.saveState);
  const publication = useAppStore((state) => state.publication);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [route]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const groups: NavGroup[] = [
    {
      title: 'Overview',
      items: [{ path: '/admin/dashboard', label: 'Dashboard', icon: 'book' }],
    },
    {
      title: 'Content',
      items: [
        { path: '/admin/pages', label: 'Scrapbook pages', icon: 'pages', count: doc?.pages.length },
        { path: '/admin/photos', label: 'Photo library', icon: 'image', count: doc?.photos.length },
        { path: '/admin/letters', label: 'Letters & messages', icon: 'mail', count: doc?.letters.length },
        { path: '/admin/stickers', label: 'Stickers & decorations', icon: 'sticker', count: doc?.customAssets.length },
        { path: '/admin/interactions', label: 'Interactive elements', icon: 'sparkles' },
      ],
    },
    {
      title: 'Design',
      items: [
        { path: '/admin/theme', label: 'Theme & appearance', icon: 'sliders' },
        { path: '/admin/preview', label: 'Preview scrapbook', icon: 'eye' },
      ],
    },
    {
      title: 'Release',
      items: [
        { path: '/admin/publishing', label: 'Publishing', icon: 'cloud' },
      ],
    },
    {
      title: 'Account',
      items: [{ path: '/admin/settings', label: 'Settings', icon: 'settings' }],
    },
  ];

  const fullBleed = route.startsWith('/admin/pages/') || route === '/admin/preview';

  const leave = async () => {
    const pending = dirty || saveState === 'saving' || saveState === 'error' || saveState === 'conflict';
    if (pending && !window.confirm('There are changes that have not been saved yet. Sign out anyway?')) {
      return;
    }
    await signOut();
    navigate('/admin/login', true);
  };

  let content: ReactNode;
  if (route === '/admin' || route === '/admin/dashboard') content = <Dashboard />;
  else if (route === '/admin/pages') content = <PagesScreen />;
  else if (route.startsWith('/admin/pages/')) {
    content = <BuilderScreen pageId={decodeURIComponent(route.slice('/admin/pages/'.length))} />;
  } else if (route === '/admin/photos') content = <PhotosScreen />;
  else if (route === '/admin/letters') content = <LettersScreen />;
  else if (route === '/admin/stickers') content = <StickersScreen />;
  else if (route === '/admin/interactions') content = <InteractionsScreen />;
  else if (route === '/admin/theme') content = <ThemeScreen />;
  else if (route === '/admin/preview') content = <PreviewScreen />;
  else if (route === '/admin/publishing') content = <PublishingScreen />;
  else if (route === '/admin/settings') content = <SettingsScreen />;
  else {
    content = (
      <div className="admin-card px-6 py-12 text-center">
        <p className="font-display text-xl">This studio door leads nowhere</p>
        <p className="mt-1 text-sm text-ink/55">The link may be mistyped or a page was removed.</p>
        <a href="#/admin/dashboard" className="btn btn-primary mt-5 inline-flex min-h-10">
          Back to the dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="admin-shell h-[100dvh] overflow-hidden">
      <div className="admin-backdrop" aria-hidden="true" />
      <aside className="admin-sidebar hidden lg:flex">
        <Brand />
        <NavList groups={groups} route={route} />
        <div className="border-t border-[rgba(156,100,116,.16)] p-3">
          <div className="flex items-center gap-2 rounded-xl bg-[rgba(255,250,240,.7)] px-2.5 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f3dcdc] text-[0.72rem] font-semibold text-deeprose">
              {(user?.name || user?.email || 'A').slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.74rem] text-ink">{user?.name || 'Administrator'}</span>
              <span className="block truncate text-[0.6rem] text-ink/45">{user?.email || 'this device'}</span>
            </span>
            <button
              type="button"
              className="icon-btn h-8 w-8 shrink-0"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => void leave()}
            >
              <Icon name="logout" size={15} />
            </button>
          </div>
          <p className="mt-2 px-1 text-[0.58rem] leading-relaxed text-ink/40">
            {publication ? `Live: version ${publication.versionNumber}` : 'Nothing published yet'}
          </p>
        </div>
      </aside>

      <div className="admin-main h-full min-w-0">
        <header className="admin-topbar shrink-0">
          <button
            type="button"
            className="icon-btn h-9 w-9 lg:hidden"
            aria-label="Open studio menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="panel-left" size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[0.98rem] leading-tight text-ink">{routeTitle(route)}</p>
            <p className="hidden truncate text-[0.6rem] uppercase tracking-[0.16em] text-ink/45 sm:block">
              {doc ? (dirty ? 'Unsaved changes' : 'All changes saved') : 'Loading draft…'}
            </p>
          </div>
          <div className="hidden sm:block">
            <SaveIndicator />
          </div>
          <div className="hidden md:block">
            <SoundControls />
          </div>
          <a
            href="#/admin/preview"
            className="builder-tool hidden sm:inline-flex"
            title="Preview the scrapbook"
          >
            <Icon name="eye" size={14} /> Preview
          </a>
          <a
            href="#/"
            target="_blank"
            rel="noreferrer"
            className="builder-tool hidden md:inline-flex"
            title="Open the live scrapbook in a new tab"
          >
            <Icon name="arrow-right" size={14} /> Live
          </a>
          <button
            type="button"
            className="btn btn-primary min-h-9 px-3 text-[0.74rem]"
            onClick={() => navigate('/admin/publishing')}
          >
            <Icon name="cloud" size={14} /> Publish
          </button>
        </header>

        <div className={`min-h-0 flex-1 ${fullBleed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {fullBleed ? (
            content
          ) : (
            <div className="admin-content">
              <div className="mb-3 sm:hidden">
                <SaveIndicator compact />
              </div>
              {content}
            </div>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="admin-drawer lg:hidden" role="dialog" aria-modal="true" aria-label="Studio menu">
          <button
            type="button"
            className="admin-drawer-scrim"
            aria-label="Close studio menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="admin-drawer-panel">
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <button
                type="button"
                className="icon-btn h-9 w-9"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <Icon name="close" size={17} />
              </button>
            </div>
            <NavList groups={groups} route={route} onNavigate={() => setMenuOpen(false)} />
            <div className="border-t border-[rgba(156,100,116,.16)] p-3">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[0.72rem] text-ink/60">
                  {user?.email || user?.name || 'Local administrator'}
                </span>
                <button
                  type="button"
                  className="chip min-h-8 text-[0.68rem]"
                  onClick={() => void leave()}
                >
                  <Icon name="logout" size={13} /> Sign out
                </button>
              </div>
              <p className="mt-2 text-[0.58rem] leading-relaxed text-ink/40">
                {publication ? `Live: version ${publication.versionNumber}` : 'Nothing published yet'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
