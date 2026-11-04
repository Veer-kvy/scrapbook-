import type { ReactNode } from 'react';
import { Icon, type IconName } from '../UI/Icon';

export function Section({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t hairline pt-4 first:border-t-0 first:pt-0 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h3 className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] opacity-70">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  type = 'text',
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: 'text' | 'date' | 'password';
  hint?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="field"
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && <span className="mt-1 block text-[0.68rem] leading-snug muted">{hint}</span>}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  rows = 4,
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea
        className="field resize-y"
        rows={rows}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && <span className="mt-1 block text-[0.68rem] leading-snug muted">{hint}</span>}
    </label>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
  onFocus,
  onBlur,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  format?: (value: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="label mb-0">{label}</span>
        <span className="text-[0.7rem] tabular-nums opacity-60">
          {format ? format(value) : value}
          {suffix}
        </span>
      </span>
      <input
        className="kabbu-range mt-1"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  columns,
}: {
  value: T;
  options: { value: T; label: string; icon?: IconName }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  columns?: number;
}) {
  return (
    <div
      className={`grid gap-1.5 ${columns ? '' : 'grid-cols-2'}`}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`chip min-h-9 justify-center ${value === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.icon && <Icon name={option.icon} size={13} />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors?: string[];
}) {
  const palette = colors ?? ['#493A40', '#9C6474', '#C98C9D', '#E8B8A7', '#8FA37C', '#FFF7E9'];
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            className={`grid h-8 w-8 place-items-center rounded-full border transition ${
              value.toLowerCase() === color.toLowerCase()
                ? 'scale-110 border-current shadow-[0_0_0_2px_rgba(201,140,157,.5)]'
                : 'border-black/10 hover:scale-105'
            }`}
            style={{ background: color }}
            onClick={() => onChange(color)}
            aria-label={`Use colour ${color}`}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
          >
            {value.toLowerCase() === color.toLowerCase() && (
              <Icon name="check" size={13} className="text-ink/70 mix-blend-difference" />
            )}
          </button>
        ))}
        <label
          className="relative grid h-8 w-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-current/40"
          title="Pick a custom colour"
        >
          <span className="pointer-events-none text-[0.6rem] opacity-70">+</span>
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Custom colour"
          />
        </label>
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2 text-left"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-[0.7rem] leading-snug muted">{description}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-[#c98c9d]' : 'bg-ink/15'
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#fff8ec] shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}
