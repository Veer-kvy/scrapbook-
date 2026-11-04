import type { ThemeSettings } from '../../types';
import { useAppStore } from '../../data/store';
import { DEFAULT_THEME, FONT_OPTIONS, PALETTES } from '../../data/theme';
import { Icon } from '../UI/Icon';
import { AdminHeader, PageThumb, Select, Toggle } from './ui';

type Choice<T extends string> = { value: T; label: string; hint?: string };

function ChoiceRow<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  columns = 4,
}: {
  label: string;
  hint?: string;
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      {hint && <p className="mb-2 -mt-1 text-[0.68rem] leading-snug text-ink/45">{hint}</p>}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        role="group"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`chip min-h-9 justify-center text-[0.7rem] ${value === option.value ? 'active' : ''}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            title={option.hint}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const PAPER_OPTIONS: Choice<ThemeSettings['paperTexture']>[] = [
  { value: 'paper', label: 'Paper' },
  { value: 'linen', label: 'Linen' },
  { value: 'grain', label: 'Grain' },
  { value: 'plain', label: 'Plain' },
];

const POLAROID_OPTIONS: Choice<ThemeSettings['polaroid']>[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'soft', label: 'Soft' },
  { value: 'retro', label: 'Retro' },
  { value: 'clean', label: 'Clean' },
];

const SHADOW_OPTIONS: Choice<ThemeSettings['shadow']>[] = [
  { value: 'soft', label: 'Soft' },
  { value: 'medium', label: 'Medium' },
  { value: 'deep', label: 'Deep' },
  { value: 'none', label: 'None' },
];

const BUTTON_OPTIONS: Choice<ThemeSettings['buttonStyle']>[] = [
  { value: 'pill', label: 'Pill' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
];

const MOTION_OPTIONS: Choice<ThemeSettings['animation']>[] = [
  { value: 'full', label: 'Lively' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'calm', label: 'Calm' },
];

export function ThemeScreen() {
  const theme = useAppStore((state) => state.doc?.theme);
  const pages = useAppStore((state) => state.doc?.pages);
  const updateTheme = useAppStore((state) => state.updateTheme);
  const notify = useAppStore((state) => state.notify);

  if (!theme) return null;

  const firstPage = pages?.[0];

  return (
    <div>
      <AdminHeader
        title="Theme & appearance"
        subtitle="One palette, one mood. These choices flow through every page of the scrapbook — preview them here, then publish to make them live."
        actions={
          <button
            type="button"
            className="builder-tool min-h-10 px-3"
            onClick={() => {
              updateTheme(DEFAULT_THEME);
              notify('Theme reset to the original rose palette.', 'success');
            }}
          >
            <Icon name="refresh" size={14} /> Reset theme
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="admin-card p-4 sm:p-5">
            <h2 className="font-display text-lg text-ink">Palette</h2>
            <p className="mb-3 mt-1 text-[0.72rem] text-ink/50">
              Colours for paper, ink, ribbons, and the backdrop behind the book.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {(Object.keys(PALETTES) as (keyof typeof PALETTES)[]).map((id) => {
                const palette = PALETTES[id];
                const active = theme.palette === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-xl border p-2.5 text-left transition ${
                      active
                        ? 'border-[#c98c9d] bg-[rgba(201,140,157,.14)] shadow-sm'
                        : 'border-[rgba(156,100,116,.18)] bg-[rgba(255,251,243,.6)] hover:border-[#c98c9d]/60'
                    }`}
                    aria-pressed={active}
                    onClick={() => updateTheme({ palette: id })}
                  >
                    <span className="flex gap-1">
                      {[palette.rose, palette.blush, palette.peach, palette.paper].map((color) => (
                        <span
                          key={color}
                          className="h-5 flex-1 rounded-full border border-black/5"
                          style={{ background: color }}
                        />
                      ))}
                    </span>
                    <span className="mt-2 flex items-center gap-1 text-[0.72rem] text-ink">
                      {active && <Icon name="check" size={12} />}
                      {palette.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="admin-card space-y-5 p-4 sm:p-5">
            <div>
              <h2 className="font-display text-lg text-ink">Paper & photography</h2>
              <p className="mt-1 text-[0.72rem] text-ink/50">
                How the pages feel and how photographs sit on them.
              </p>
            </div>
            <ChoiceRow
              label="Paper texture"
              value={theme.paperTexture}
              options={PAPER_OPTIONS}
              onChange={(paperTexture) => updateTheme({ paperTexture })}
            />
            <ChoiceRow
              label="Polaroid style"
              value={theme.polaroid}
              options={POLAROID_OPTIONS}
              onChange={(polaroid) => updateTheme({ polaroid })}
            />
            <ChoiceRow
              label="Page shadow"
              value={theme.shadow}
              options={SHADOW_OPTIONS}
              onChange={(shadow) => updateTheme({ shadow })}
            />
          </section>

          <section className="admin-card space-y-5 p-4 sm:p-5">
            <div>
              <h2 className="font-display text-lg text-ink">Type</h2>
              <p className="mt-1 text-[0.72rem] text-ink/50">
                Headings keep their romance, letters keep their handwriting, and body text stays
                readable.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="label">Headings</span>
                <Select
                  value={theme.headingFont}
                  onChange={(event) =>
                    updateTheme({ headingFont: event.target.value as ThemeSettings['headingFont'] })
                  }
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="label">Handwriting</span>
                <Select
                  value={theme.handFont}
                  onChange={(event) =>
                    updateTheme({ handFont: event.target.value as ThemeSettings['handFont'] })
                  }
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="label">Body text</span>
                <Select
                  value={theme.bodyFont}
                  onChange={(event) =>
                    updateTheme({ bodyFont: event.target.value as ThemeSettings['bodyFont'] })
                  }
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="rounded-xl border border-[rgba(156,100,116,.16)] bg-[rgba(255,251,243,.6)] p-4">
              <p className="font-display text-xl text-ink">For my favourite person</p>
              <p className="mt-1 font-hand text-xl text-deeprose">open when you miss me…</p>
              <p className="mt-1.5 text-[0.78rem] leading-relaxed text-ink/60">
                The quick brown fox jumps over the lazy dog. This is how body copy will look across
                the scrapbook.
              </p>
            </div>
          </section>

          <section className="admin-card space-y-5 p-4 sm:p-5">
            <div>
              <h2 className="font-display text-lg text-ink">Motion & decorations</h2>
              <p className="mt-1 text-[0.72rem] text-ink/50">
                Gentle always respects the reader&rsquo;s reduced-motion setting.
              </p>
            </div>
            <ChoiceRow
              label="Animation"
              value={theme.animation}
              options={MOTION_OPTIONS}
              onChange={(animation) => updateTheme({ animation })}
              columns={3}
            />
            <ChoiceRow
              label="Button shape"
              value={theme.buttonStyle}
              options={BUTTON_OPTIONS}
              onChange={(buttonStyle) => updateTheme({ buttonStyle })}
              columns={3}
            />
            <Toggle
              label="Washi tape and page corners"
              hint="Turn off for a cleaner, more minimal book."
              checked={theme.decorations}
              onChange={(decorations) => updateTheme({ decorations })}
            />
          </section>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="admin-card overflow-hidden">
            <div className="border-b border-[rgba(156,100,116,.14)] px-3 py-2.5">
              <p className="text-[0.6rem] uppercase tracking-[0.16em] text-ink/45">Live preview</p>
              <p className="text-[0.72rem] text-ink/60">
                {firstPage ? firstPage.name : 'Your first page'}
              </p>
            </div>
            <div className="admin-thumb">
              {firstPage ? (
                <PageThumb page={firstPage} pageNumber={1} />
              ) : (
                <div className="grid aspect-[3/4] place-items-center text-sm text-ink/40">
                  Add a page to see it here
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-[0.66rem] leading-relaxed text-ink/50">
                Theme changes apply to the studio and the saved draft instantly. The public
                scrapbook updates the next time you publish.
              </p>
              <a
                href="#/admin/preview"
                className="builder-tool mt-2 flex min-h-9 w-full items-center justify-center"
              >
                <Icon name="eye" size={14} /> Open full preview
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
