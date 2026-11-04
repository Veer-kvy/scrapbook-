import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import type { Page } from '../../types';
import { useAppStore } from '../../data/store';
import { PageCanvas } from '../Scrapbook/PageCanvas';
import { Icon } from '../UI/Icon';

export function relativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return 'never';
  const diff = Date.now() - timestamp;
  if (diff < 45_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="admin-section-title text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageThumb({
  page,
  pageNumber,
  className = '',
}: {
  page: Page;
  pageNumber: number;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[3/4] w-full overflow-hidden ${className}`}>
      <PageCanvas
        page={page}
        pageNumber={pageNumber}
        side="single"
        viewOnly
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="admin-stat-label">{label}</span>
        {icon && <span className="text-deeprose/60">{icon}</span>}
      </span>
      <span className="admin-stat-value mt-1">{value}</span>
      {hint && <span className="text-[0.68rem] leading-snug text-ink/45">{hint}</span>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="admin-stat text-left transition hover:border-[#c98c9d]/50" onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className="admin-stat">{body}</div>;
}

export function EmptyState({
  icon = 'sparkles',
  title,
  body,
  action,
}: {
  icon?: 'sparkles' | 'image' | 'pages' | 'mail' | 'sticker' | 'heart';
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-card flex flex-col items-center px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[#f3dcdc] text-deeprose">
        <Icon name={icon} size={24} />
      </span>
      <h2 className="mt-4 font-display text-xl text-ink">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink/55">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  error,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="label">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[0.68rem] leading-snug text-[#8f4a56]">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-[0.68rem] leading-snug text-ink/45">{hint}</span>
      )}
    </label>
  );
}

const INPUT_CLASS =
  'min-h-10 w-full rounded-xl border border-[rgba(156,100,116,.24)] bg-[#fffdf7]/85 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-[#c98c9d] focus:ring-2 focus:ring-[#c98c9d]/20';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_CLASS} ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${INPUT_CLASS} leading-relaxed ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${INPUT_CLASS} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%239c6474%22 stroke-width=%222%22><path d=%22M4 6l4 4 4-4%22/></svg>')] bg-[right_0.7rem_center] bg-no-repeat pr-9 ${props.className ?? ''}`}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[rgba(156,100,116,.16)] bg-[#fffdf7]/60 px-3 py-2.5 text-left transition hover:border-[#c98c9d]/50"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.68rem] leading-snug text-ink/45">{hint}</span>}
      </span>
      <span
        className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition ${checked ? 'bg-[#9c6474]' : 'bg-[#cbb9b3]'}`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-[#fffaf0] transition ${checked ? 'translate-x-4' : ''}`}
        />
      </span>
    </button>
  );
}

export function SaveIndicator({ compact = false }: { compact?: boolean }) {
  const saveState = useAppStore((state) => state.saveState);
  const lastSavedAt = useAppStore((state) => state.lastSavedAt);
  const dirty = useAppStore((state) => state.dirty);
  const saveNow = useAppStore((state) => state.saveNow);
  const reloadDraft = useAppStore((state) => state.reloadDraft);

  if (saveState === 'saving' || dirty) {
    return (
      <span className="admin-tag draft" role="status">
        <Icon name="refresh" size={11} className="animate-spin" />
        Saving…
      </span>
    );
  }
  if (saveState === 'error' || saveState === 'conflict') {
    return (
      <span className="flex items-center gap-1.5">
        <span className="admin-tag danger" role="alert">
          <Icon name="warning" size={11} />
          {saveState === 'conflict' ? 'Newer draft exists' : 'Not saved'}
        </span>
        <button type="button" className="text-[0.66rem] underline decoration-[#9c6474]/50 underline-offset-2" onClick={() => void saveNow(true)}>
          Retry
        </button>
        {saveState === 'conflict' && (
          <button type="button" className="text-[0.66rem] underline decoration-[#9c6474]/50 underline-offset-2" onClick={() => void reloadDraft()}>
            Reload
          </button>
        )}
      </span>
    );
  }
  return (
    <span className="admin-tag live" title={lastSavedAt ? `Saved ${relativeTime(lastSavedAt)}` : undefined}>
      <Icon name="check" size={11} />
      {compact ? 'Saved' : `Saved ${relativeTime(lastSavedAt)}`}
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">
        <Icon name="search" size={15} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${INPUT_CLASS} pl-9`}
      />
    </div>
  );
}
