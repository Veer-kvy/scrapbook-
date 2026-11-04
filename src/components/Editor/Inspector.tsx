import { useRef, useState } from 'react';
import type {
  BackgroundId,
  ButtonElement,
  CustomAssetElement,
  EnvelopeElement,
  FrameStyle,
  HiddenElement,
  Page,
  PageTransitionId,
  PhotoElement,
  ScrapbookElement,
  StickerElement,
  TextElement,
  Tone,
} from '../../types';
import { useAppStore } from '../../data/store';
import {
  BACKGROUNDS,
  TEMPLATE_LABELS,
  TRANSITION_OPTIONS,
} from '../../data/factories';
import { formatDate } from '../../lib/utils';
import { navigate } from '../../lib/router';
import { Icon } from '../UI/Icon';
import { StickerGrid } from './StickerGrid';
import {
  ColorField,
  RangeField,
  Section,
  Segmented,
  TextAreaField,
  TextField,
} from './controls';

const BG_SWATCH: Record<BackgroundId, string> = {
  cream: 'bg-paper-cream',
  blush: 'bg-paper-blush',
  dots: 'bg-paper-dots',
  grid: 'bg-paper-grid',
  sprinkle: 'bg-paper-sprinkle',
  linen: 'bg-paper-linen',
  ombre: 'bg-paper-ombre',
};

const TONES: { value: Tone; label: string }[] = [
  { value: 'rose', label: 'Rose' },
  { value: 'cream', label: 'Cream' },
  { value: 'sage', label: 'Sage' },
  { value: 'peach', label: 'Peach' },
];

const FRAMES: { value: FrameStyle; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'cream', label: 'Cream' },
  { value: 'taped', label: 'Taped' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'bare', label: 'Bare' },
];

type InteractiveKind = 'photo' | 'envelope' | 'hidden' | 'button';

const INTERACTION_LABELS: Record<InteractiveKind, { value: string; label: string }[]> = {
  photo: [
    { value: 'flip', label: 'Flip for a message' },
    { value: 'show-note', label: 'Open a note' },
    { value: 'bloom', label: 'Bloom into a note' },
    { value: 'surprise', label: 'A little surprise' },
    { value: 'go-to-page', label: 'Turn to another page' },
  ],
  envelope: [
    { value: 'none', label: 'Open the letter' },
    { value: 'show-note', label: 'Show a short note instead' },
    { value: 'surprise', label: 'A little surprise' },
    { value: 'go-to-page', label: 'Turn to another page' },
  ],
  hidden: [
    { value: 'none', label: 'Reveal the secret' },
    { value: 'go-to-page', label: 'Turn to another page' },
  ],
  button: [
    { value: 'none', label: 'Show a note' },
    { value: 'go-to-page', label: 'Turn to another page' },
  ],
};

function PlacementFields({ page, element }: { page: Page; element: ScrapbookElement }) {
  const updateElement = useAppStore((state) => state.updateElement);
  const alignElement = useAppStore((state) => state.alignElement);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);
  const patch = (next: Partial<ScrapbookElement>) => updateElement(page.id, element.id, next);
  const focus = () => beginGesture();
  const blur = () => endGesture();

  return (
    <Section title="Placement">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Centre' },
              { value: 'right', label: 'Right' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              className="chip min-h-9 justify-center text-[0.68rem]"
              onClick={() => alignElement(page.id, element.id, option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <RangeField
          label="Rotation"
          value={element.rot}
          min={-180}
          max={180}
          suffix="°"
          onChange={(rot) => patch({ rot })}
          onFocus={focus}
          onBlur={blur}
        />
        <RangeField
          label="Width"
          value={Math.round(element.w)}
          min={4}
          max={110}
          suffix="%"
          onChange={(w) => patch({ w })}
          onFocus={focus}
          onBlur={blur}
        />
        <RangeField
          label="Height"
          value={Math.round(element.h)}
          min={4}
          max={110}
          suffix="%"
          onChange={(h) => patch({ h })}
          onFocus={focus}
          onBlur={blur}
        />
        <RangeField
          label="Across"
          value={Math.round(element.x)}
          min={-10}
          max={95}
          suffix="%"
          onChange={(x) => patch({ x })}
          onFocus={focus}
          onBlur={blur}
        />
        <RangeField
          label="Down"
          value={Math.round(element.y)}
          min={-10}
          max={95}
          suffix="%"
          onChange={(y) => patch({ y })}
          onFocus={focus}
          onBlur={blur}
        />
        <RangeField
          label="Opacity"
          value={Math.round((element.opacity ?? 1) * 100)}
          min={15}
          max={100}
          suffix="%"
          onChange={(opacity) => patch({ opacity: opacity / 100 })}
          onFocus={focus}
          onBlur={blur}
        />
      </div>
    </Section>
  );
}

function ElementActions({ page, element }: { page: Page; element: ScrapbookElement }) {
  const duplicateElement = useAppStore((state) => state.duplicateElement);
  const removeElement = useAppStore((state) => state.removeElement);
  const moveLayer = useAppStore((state) => state.moveLayer);
  const updateElement = useAppStore((state) => state.updateElement);
  const select = useAppStore((state) => state.select);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        className="chip min-h-9"
        onClick={() => duplicateElement(page.id, element.id)}
        title="Duplicate element"
      >
        <Icon name="copy" size={14} />
        Duplicate
      </button>
      <button
        type="button"
        className="icon-btn h-9 w-9 shrink-0"
        onClick={() => moveLayer(page.id, element.id, 1)}
        aria-label="Bring element forward"
        title="Bring forward"
      >
        <Icon name="layers-up" size={16} />
      </button>
      <button
        type="button"
        className="icon-btn h-9 w-9 shrink-0"
        onClick={() => moveLayer(page.id, element.id, -1)}
        aria-label="Send element backward"
        title="Send backward"
      >
        <Icon name="layers-down" size={16} />
      </button>
      <button
        type="button"
        className={`icon-btn h-9 w-9 shrink-0 ${element.locked ? 'bg-[#c98c9d] text-[#fff8ec]' : ''}`}
        onClick={() => updateElement(page.id, element.id, { locked: !element.locked })}
        aria-label={element.locked ? 'Unlock element' : 'Lock element'}
        aria-pressed={Boolean(element.locked)}
        title={element.locked ? 'Unlock' : 'Lock'}
      >
        <Icon name={element.locked ? 'lock' : 'unlock'} size={15} />
      </button>
      <button
        type="button"
        className="chip min-h-9 border-[#9c6474]/40 text-[#9c6474]"
        onClick={() => {
          removeElement(page.id, element.id);
          select(null);
        }}
      >
        <Icon name="trash" size={14} />
        Delete
      </button>
    </div>
  );
}

function TextEditor({ page, element }: { page: Page; element: TextElement }) {
  const updateElement = useAppStore((state) => state.updateElement);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);
  const patch = (next: Partial<TextElement>) => updateElement(page.id, element.id, next);
  const focus = () => beginGesture();
  const blur = () => endGesture();

  return (
    <Section title="Words">
      <div className="space-y-3.5">
        <TextAreaField
          label="Text"
          rows={4}
          value={element.text}
          onFocus={focus}
          onBlur={blur}
          onChange={(text) => patch({ text })}
          placeholder="Write something…"
        />
        <div>
          <span className="label">Handwriting</span>
          <Segmented
            ariaLabel="Font family"
            columns={2}
            value={element.font}
            options={[
              { value: 'hand', label: 'Caveat' },
              { value: 'serif', label: 'Cormorant' },
              { value: 'display', label: 'Playfair' },
              { value: 'sans', label: 'Inter' },
            ]}
            onChange={(font) => patch({ font })}
          />
        </div>
        <RangeField
          label="Text size"
          value={element.size}
          min={1.4}
          max={18}
          step={0.1}
          onChange={(size) => patch({ size })}
          onFocus={focus}
          onBlur={blur}
          format={(value) => value.toFixed(1)}
        />
        <RangeField
          label="Line spacing"
          value={element.lineHeight}
          min={0.9}
          max={2.6}
          step={0.05}
          onChange={(lineHeight) => patch({ lineHeight })}
          onFocus={focus}
          onBlur={blur}
          format={(value) => value.toFixed(2)}
        />
        <div>
          <span className="label">Alignment</span>
          <Segmented
            ariaLabel="Text alignment"
            columns={3}
            value={element.align}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Centre' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={(align) => patch({ align })}
          />
        </div>
        <div>
          <span className="label">Decoration</span>
          <Segmented
            ariaLabel="Text decoration"
            columns={3}
            value={element.style}
            options={[
              { value: 'plain', label: 'Plain' },
              { value: 'highlight', label: 'Marker' },
              { value: 'underline', label: 'Wavy' },
            ]}
            onChange={(style) => patch({ style })}
          />
        </div>
        <ColorField label="Ink colour" value={element.color} onChange={(color) => patch({ color })} />
      </div>
    </Section>
  );
}

function PhotoEditor({
  page,
  element,
  onOpenFraming,
}: {
  page: Page;
  element: PhotoElement;
  onOpenFraming: (pageId: string, element: PhotoElement) => void;
}) {
  const photos = useAppStore((state) => state.doc?.photos);
  const mediaUrls = useAppStore((state) => state.mediaUrls);
  const updateElement = useAppStore((state) => state.updateElement);
  const replacePhoto = useAppStore((state) => state.replacePhoto);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);
  const notify = useAppStore((state) => state.notify);
  const fileRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState(false);

  const photo = photos?.find((item) => item.id === element.photoId);
  const url = photo ? mediaUrls[photo.id] ?? photo.src : undefined;
  const patch = (next: Partial<PhotoElement>) => updateElement(page.id, element.id, next);
  const focus = () => beginGesture();
  const blur = () => endGesture();

  const onReplace = async (file?: File) => {
    if (!file) return;
    setReplacing(true);
    const ok = await replacePhoto(page.id, element.id, file);
    if (ok) notify('Photograph replaced — the layout stayed exactly where it was.', 'success');
    setReplacing(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Section title="Photograph">
      <div className="space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="checker h-16 w-16 shrink-0 overflow-hidden rounded-lg border hairline">
            {url ? (
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center opacity-50">
                <Icon name="image" size={20} />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{photo?.name ?? 'Photo'}</p>
            <p className="mt-0.5 text-[0.68rem] muted">
              {photo ? `${photo.width} × ${photo.height}` : 'This photograph is unavailable'}
            </p>
            <button
              type="button"
              className="mt-1.5 text-[0.7rem] underline decoration-[#c98c9d]/60 underline-offset-2 transition hover:text-[#c98c9d]"
              onClick={() => {
                if (!photo) {
                  notify('This photograph is no longer in the library.', 'error');
                  return;
                }
                onOpenFraming(page.id, element);
              }}
            >
              Open large framing view
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="chip min-h-9"
            onClick={() => fileRef.current?.click()}
            disabled={replacing}
          >
            <Icon name="upload" size={14} />
            {replacing ? 'Replacing…' : 'Replace file'}
          </button>
          <button type="button" className="chip min-h-9" onClick={() => onOpenFraming(page.id, element)}>
            <Icon name="crop" size={14} />
            Frame
          </button>
          <button
            type="button"
            className="chip min-h-9"
            onClick={() => navigate('/admin/photos')}
          >
            <Icon name="folder" size={14} />
            Library
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
            className="sr-only"
            onChange={(event) => void onReplace(event.target.files?.[0])}
          />
        </div>

        <div>
          <span className="label">Frame</span>
          <Segmented
            ariaLabel="Polaroid frame"
            columns={3}
            value={element.frame}
            options={FRAMES}
            onChange={(frame) => patch({ frame })}
          />
        </div>

        <TextField
          label="Caption"
          value={element.caption}
          onFocus={focus}
          onBlur={blur}
          onChange={(caption) => patch({ caption })}
          placeholder={photo?.caption || 'A little caption'}
          hint="Leave empty to use the caption saved in your library."
        />
        <TextField
          label="Date"
          type="date"
          value={element.date}
          onFocus={focus}
          onBlur={blur}
          onChange={(date) => patch({ date })}
          hint={element.date ? formatDate(element.date) : 'No date on this photo yet.'}
        />

        <div>
          <span className="label">Framing</span>
          <div className="space-y-2.5 rounded-xl border hairline p-3">
            <RangeField
              label="Zoom"
              value={element.crop.zoom}
              min={1}
              max={3}
              step={0.05}
              suffix="×"
              onChange={(zoom) => patch({ crop: { ...element.crop, zoom } })}
              onFocus={focus}
              onBlur={blur}
              format={(value) => value.toFixed(2)}
            />
            <RangeField
              label="Shift horizontally"
              value={element.crop.x}
              min={-60}
              max={60}
              onChange={(x) => patch({ crop: { ...element.crop, x } })}
              onFocus={focus}
              onBlur={blur}
            />
            <RangeField
              label="Shift vertically"
              value={element.crop.y}
              min={-60}
              max={60}
              onChange={(y) => patch({ crop: { ...element.crop, y } })}
              onFocus={focus}
              onBlur={blur}
            />
            <RangeField
              label="Tilt photo"
              value={element.imageRotate}
              min={-180}
              max={180}
              suffix="°"
              onChange={(imageRotate) => patch({ imageRotate })}
              onFocus={focus}
              onBlur={blur}
            />
            <button
              type="button"
              className="btn btn-secondary h-8 min-h-8 w-full text-[0.7rem]"
              onClick={() => patch({ crop: { zoom: 1, x: 0, y: 0 }, imageRotate: 0 })}
            >
              Reset framing
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function StickerEditor({ page, element }: { page: Page; element: StickerElement }) {
  const updateElement = useAppStore((state) => state.updateElement);
  return (
    <Section title="Sticker">
      <StickerGrid
        selected={element.sticker}
        onPick={(sticker) => {
          updateElement(page.id, element.id, {
            sticker,
            h: sticker.startsWith('washi') ? Math.max(4, element.w * 0.3) : element.w,
          });
        }}
      />
    </Section>
  );
}

function EnvelopeEditor({ page, element }: { page: Page; element: EnvelopeElement }) {
  const letters = useAppStore((state) => state.doc?.letters);
  const updateElement = useAppStore((state) => state.updateElement);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);
  const patch = (next: Partial<EnvelopeElement>) => updateElement(page.id, element.id, next);
  const focus = () => beginGesture();
  const blur = () => endGesture();
  const linked = letters?.find((letter) => letter.id === element.letterId);

  return (
    <Section title="Letter">
      <div className="space-y-3.5">
        <TextField
          label="Envelope title"
          value={element.title}
          onFocus={focus}
          onBlur={blur}
          onChange={(title) => patch({ title })}
        />
        <div>
          <span className="label">Linked letter</span>
          <select
            className="field"
            value={element.letterId ?? ''}
            onChange={(event) => {
              const letterId = event.target.value || undefined;
              const letter = letters?.find((item) => item.id === letterId);
              patch({
                letterId,
                ...(letter ? { title: letter.title, tone: letter.envelope } : {}),
              });
            }}
          >
            <option value="">No linked letter — use the words below</option>
            {(letters ?? []).map((letter) => (
              <option key={letter.id} value={letter.id}>
                {letter.title}
              </option>
            ))}
          </select>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-[0.66rem] leading-snug muted">
              {linked
                ? 'Readers see the full letter, its paper and its hidden message.'
                : 'Readers see the note written here.'}
            </p>
            <button
              type="button"
              className="shrink-0 text-[0.66rem] text-deeprose underline decoration-[#c98c9d]/50 underline-offset-2"
              onClick={() => navigate('/admin/letters')}
            >
              Manage letters
            </button>
          </div>
        </div>
        <TextAreaField
          label={linked ? 'Fallback note' : 'Letter'}
          rows={7}
          value={element.note}
          onFocus={focus}
          onBlur={blur}
          onChange={(note) => patch({ note })}
          placeholder="Write the letter…"
          hint={linked ? 'Only used if the linked letter is deleted.' : undefined}
        />
        <div>
          <span className="label">Envelope colour</span>
          <Segmented
            ariaLabel="Envelope colour"
            columns={4}
            value={element.tone}
            options={TONES}
            onChange={(tone) => patch({ tone })}
          />
        </div>
      </div>
    </Section>
  );
}

function HiddenEditor({ page, element }: { page: Page; element: HiddenElement }) {
  const updateElement = useAppStore((state) => state.updateElement);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);
  const patch = (next: Partial<HiddenElement>) => updateElement(page.id, element.id, next);
  const focus = () => beginGesture();
  const blur = () => endGesture();

  return (
    <Section title="Hidden note">
      <div className="space-y-3.5">
        <TextField
          label="Tiny prompt"
          value={element.prompt}
          onFocus={focus}
          onBlur={blur}
          onChange={(prompt) => patch({ prompt })}
          placeholder="tap me"
        />
        <TextAreaField
          label="Secret note"
          rows={5}
          value={element.note}
          onFocus={focus}
          onBlur={blur}
          onChange={(note) => patch({ note })}
        />
        <div>
          <span className="label">Reveal with</span>
          <StickerGrid selected={element.sticker} onPick={(sticker) => patch({ sticker })} />
        </div>
        <p className="text-[0.68rem] leading-snug muted">
          In reading mode this sticker gently pulses. Tapping it opens the secret.
        </p>
      </div>
    </Section>
  );
}

function ButtonEditor({ page, element }: { page: Page; element: ButtonElement }) {
  const updateElement = useAppStore((state) => state.updateElement);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);
  const patch = (next: Partial<ButtonElement>) => updateElement(page.id, element.id, next);

  return (
    <Section title="Button">
      <div className="space-y-3.5">
        <TextField
          label="Label"
          value={element.label}
          onFocus={beginGesture}
          onBlur={endGesture}
          onChange={(label) => patch({ label })}
        />
        <div>
          <span className="label">Shape</span>
          <Segmented
            ariaLabel="Button shape"
            columns={3}
            value={element.style}
            options={[
              { value: 'pill', label: 'Pill' },
              { value: 'rounded', label: 'Rounded' },
              { value: 'square', label: 'Square' },
              { value: 'outline', label: 'Outline' },
              { value: 'soft', label: 'Soft' },
            ]}
            onChange={(style) => patch({ style })}
          />
        </div>
        <div>
          <span className="label">Tone</span>
          <Segmented
            ariaLabel="Button tone"
            columns={4}
            value={element.tone}
            options={TONES}
            onChange={(tone) => patch({ tone })}
          />
        </div>
      </div>
    </Section>
  );
}

function CustomEditor({ page, element }: { page: Page; element: CustomAssetElement }) {
  const assets = useAppStore((state) => state.doc?.customAssets);
  const urls = useAppStore((state) => state.mediaUrls);
  const updateElement = useAppStore((state) => state.updateElement);
  const asset = assets?.find((item) => item.id === element.assetId);
  const url = asset ? urls[asset.id] : undefined;

  return (
    <Section title="Decoration">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="checker grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border hairline">
            {url ? (
              <img src={url} alt="" className="h-full w-full object-contain" />
            ) : (
              <Icon name="image" size={20} className="opacity-40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{asset?.name ?? 'Decoration'}</p>
            <p className="mt-0.5 text-[0.68rem] muted">
              {asset ? `${asset.format.toUpperCase()} · ${asset.width} × ${asset.height}` : 'Missing from the library'}
            </p>
          </div>
        </div>
        {assets && assets.length > 1 && (
          <label className="block">
            <span className="label">Use another decoration</span>
            <select
              className="field"
              value={element.assetId}
              onChange={(event) => updateElement(page.id, element.id, { assetId: event.target.value })}
            >
              {assets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className="chip min-h-9"
          onClick={() => navigate('/admin/stickers')}
        >
          <Icon name="sticker" size={14} /> Manage decorations
        </button>
      </div>
    </Section>
  );
}

function InteractionEditor({
  page,
  element,
  pages,
}: {
  page: Page;
  element: PhotoElement | EnvelopeElement | HiddenElement | ButtonElement;
  pages: Page[];
}) {
  const updateElement = useAppStore((state) => state.updateElement);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);
  const interaction = element.interaction;
  const kind = element.kind as InteractiveKind;
  const options = INTERACTION_LABELS[kind];
  const raw = interaction?.type ?? 'none';
  const current = kind === 'photo' && raw === 'none' ? 'flip' : kind === 'button' && raw === 'show-note' ? 'none' : raw;
  const needsMessage =
    (kind === 'button' && current === 'none') ||
    current === 'show-note' ||
    current === 'surprise' ||
    current === 'bloom' ||
    (current === 'flip' && kind === 'photo');
  const patch = (next: Partial<ScrapbookElement>) => updateElement(page.id, element.id, next);

  return (
    <Section title="On tap">
      <div className="space-y-3">
        <label className="block">
          <span className="label">What happens</span>
          <select
            className="field"
            value={current}
            onChange={(event) => {
              const type = event.target.value as typeof current;
              patch({
                interaction: {
                  ...interaction,
                  type,
                  message:
                    interaction?.message ??
                    (element.kind === 'photo' ? element.caption : '') ??
                    '',
                },
              });
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {needsMessage && (
          <TextAreaField
            label={kind === 'photo' && current === 'flip' ? 'Back of the photo' : 'The note'}
            rows={4}
            value={interaction?.message ?? ''}
            onFocus={beginGesture}
            onBlur={endGesture}
            onChange={(message) => patch({ interaction: { ...interaction, type: current, message } })}
            placeholder="Write the words that appear…"
          />
        )}

        {current === 'go-to-page' && (
          <label className="block">
            <span className="label">Which page?</span>
            <select
              className="field"
              value={interaction?.targetPageId ?? ''}
              onChange={(event) =>
                patch({
                  interaction: {
                    ...interaction,
                    type: 'go-to-page',
                    targetPageId: event.target.value || undefined,
                  },
                })
              }
            >
              <option value="">Choose a page…</option>
              {pages
                .filter((item) => item.id !== page.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {pages.findIndex((entry) => entry.id === item.id) + 1}. {item.name}
                  </option>
                ))}
            </select>
          </label>
        )}

        <p className="text-[0.66rem] leading-snug muted">
          {current === 'go-to-page'
            ? 'Readers tap this and the book turns to the chosen page.'
            : kind === 'photo'
              ? 'In reading mode the photograph can be tapped. Its caption shows on the front and this message on the back.'
              : 'Readers discover this while browsing. Nothing needs JavaScript knowledge — it is all saved with the page.'}
        </p>
      </div>
    </Section>
  );
}

function MultiPagePicker({
  pages,
  activePageId,
  onChange,
}: {
  pages: Page[];
  activePageId: string | null;
  onChange: (pageId: string) => void;
}) {
  if (pages.length < 2) return null;
  return (
    <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl border hairline p-1">
      {pages.map((page, index) => (
        <button
          key={page.id}
          type="button"
          className={`min-w-0 truncate rounded-lg px-2.5 py-1.5 text-left text-[0.7rem] transition ${
            activePageId === page.id ? 'bg-[#c98c9d] text-[#fff8ec]' : 'hover:bg-[#c98c9d]/10'
          }`}
          onClick={() => onChange(page.id)}
          aria-pressed={activePageId === page.id}
        >
          <span className="mr-1 tabular-nums opacity-60">{String(index + 1).padStart(2, '0')}</span>
          {page.name}
        </button>
      ))}
    </div>
  );
}

function PageSettings({
  pages,
  page,
  activePageId,
  onActivePageChange,
  onOpenMemories,
  onOpenStickers,
  onOpenPages,
  onOpenFraming,
}: {
  pages: Page[];
  page: Page;
  activePageId: string | null;
  onActivePageChange: (pageId: string) => void;
  onOpenMemories: (pageId: string) => void;
  onOpenStickers: (pageId: string) => void;
  onOpenPages: () => void;
  onOpenFraming: (pageId: string, element: PhotoElement) => void;
}) {
  const updatePageMeta = useAppStore((state) => state.updatePageMeta);
  const duplicatePage = useAppStore((state) => state.duplicatePage);
  const deletePage = useAppStore((state) => state.deletePage);
  const addText = useAppStore((state) => state.addText);
  const addEnvelope = useAppStore((state) => state.addEnvelope);
  const addHiddenNote = useAppStore((state) => state.addHiddenNote);
  const addButton = useAppStore((state) => state.addButton);
  const addCustomAssetToPage = useAppStore((state) => state.addCustomAssetToPage);
  const assets = useAppStore((state) => state.doc?.customAssets);
  const urls = useAppStore((state) => state.mediaUrls);
  const doc = useAppStore((state) => state.doc);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);
  const [showAssets, setShowAssets] = useState(false);

  return (
    <div className="space-y-5">
      <MultiPagePicker pages={pages} activePageId={activePageId} onChange={onActivePageChange} />

      <Section title="This page">
        <div className="space-y-3.5">
          <TextField
            label="Page name"
            value={page.name}
            onFocus={() => beginGesture()}
            onBlur={() => endGesture()}
            onChange={(name) => updatePageMeta(page.id, { name })}
            maxLength={60}
          />
          <p className="text-[0.68rem] muted">
            {TEMPLATE_LABELS[page.template]} layout · {page.elements.length} elements
          </p>
          <div>
            <span className="label">Paper</span>
            <div className="grid grid-cols-4 gap-1.5">
              {BACKGROUNDS.map((background) => (
                <button
                  key={background.id}
                  type="button"
                  className={`flex flex-col items-center gap-1 rounded-lg p-1 transition ${
                    page.bg === background.id ? 'bg-[#c98c9d]/25' : 'hover:bg-[#c98c9d]/10'
                  }`}
                  onClick={() => updatePageMeta(page.id, { bg: background.id })}
                  aria-pressed={page.bg === background.id}
                  title={background.label}
                >
                  <span
                    className={`block h-9 w-full rounded-md border border-black/10 ${BG_SWATCH[background.id]}`}
                  />
                  <span className="w-full truncate text-center text-[0.56rem] uppercase tracking-wide opacity-70">
                    {background.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="label">Page turn</span>
            <select
              className="field"
              value={page.transition ?? 'turn'}
              onChange={(event) =>
                updatePageMeta(page.id, { transition: event.target.value as PageTransitionId })
              }
            >
              {TRANSITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      <Section title="Add to this page">
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className="chip min-h-10 justify-start" onClick={() => onOpenMemories(page.id)}>
            <Icon name="image" size={15} /> Photo
          </button>
          <button type="button" className="chip min-h-10 justify-start" onClick={() => addText(page.id)}>
            <Icon name="text" size={15} /> Text
          </button>
          <button type="button" className="chip min-h-10 justify-start" onClick={() => onOpenStickers(page.id)}>
            <Icon name="sticker" size={15} /> Sticker
          </button>
          <button type="button" className="chip min-h-10 justify-start" onClick={() => addEnvelope(page.id)}>
            <Icon name="mail" size={15} /> Letter
          </button>
          <button type="button" className="chip min-h-10 justify-start" onClick={() => addHiddenNote(page.id)}>
            <Icon name="heart" size={15} /> Secret
          </button>
          <button type="button" className="chip min-h-10 justify-start" onClick={() => addButton(page.id)}>
            <Icon name="arrow-right" size={15} /> Button
          </button>
          <button
            type="button"
            className="chip col-span-2 min-h-10 justify-start"
            onClick={() => setShowAssets((value) => !value)}
            aria-expanded={showAssets}
          >
            <Icon name="sparkles" size={15} /> Decoration
            <span className="ml-auto text-[0.6rem] opacity-50">
              {assets?.length ? `${assets.length} saved` : 'none yet'}
            </span>
          </button>
        </div>
        {showAssets && (
          <div className="mt-2">
            {assets && assets.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="checker grid aspect-square place-items-center overflow-hidden rounded-lg border hairline p-1.5 transition hover:border-[#c98c9d]"
                    title={asset.name}
                    onClick={() => addCustomAssetToPage(page.id, asset.id)}
                  >
                    {urls[asset.id] ? (
                      <img src={urls[asset.id]} alt={asset.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <Icon name="image" size={16} />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                className="admin-card-soft w-full px-3 py-2.5 text-left text-[0.7rem] text-ink/60"
                onClick={() => navigate('/admin/stickers')}
              >
                Upload a transparent PNG or SVG in Stickers & decorations, then place it here.
              </button>
            )}
          </div>
        )}
      </Section>

      <Section title="Page actions">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="chip min-h-9" onClick={() => duplicatePage(page.id)}>
            <Icon name="copy" size={14} /> Duplicate
          </button>
          <button type="button" className="chip min-h-9" onClick={onOpenPages}>
            <Icon name="layers-up" size={14} /> All pages
          </button>
          <button
            type="button"
            className="chip min-h-9 border-[#9c6474]/40 text-[#9c6474]"
            onClick={() => {
              if (
                window.confirm(
                  `Delete “${page.name}” and its ${page.elements.length} elements? This cannot be undone.`,
                )
              ) {
                deletePage(page.id);
              }
            }}
            disabled={(doc?.pages.length ?? 1) <= 1}
          >
            <Icon name="trash" size={14} /> Delete page
          </button>
        </div>
      </Section>

      {page.elements.some((element): element is PhotoElement => element.kind === 'photo') && (
        <Section title="Photos on this page">
          <div className="space-y-1.5">
            {page.elements
              .filter((element): element is PhotoElement => element.kind === 'photo')
              .map((element, index) => (
                <button
                  key={element.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg border hairline px-2.5 py-2 text-left text-[0.7rem] transition hover:bg-[#c98c9d]/10"
                  onClick={() => onOpenFraming(page.id, element)}
                >
                  <Icon name="crop" size={13} />
                  <span className="min-w-0 flex-1 truncate">
                    Photo {index + 1} · {element.caption || 'untitled'}
                  </span>
                  <Icon name="chevron-right" size={13} />
                </button>
              ))}
          </div>
        </Section>
      )}
    </div>
  );
}

export function Inspector({
  pages,
  activePageId,
  onActivePageChange,
  onOpenFraming,
  onOpenMemories,
  onOpenStickers,
  onOpenPages,
}: {
  pages: Page[];
  activePageId: string | null;
  onActivePageChange: (pageId: string) => void;
  onOpenFraming: (pageId: string, element: PhotoElement) => void;
  onOpenMemories: (pageId: string) => void;
  onOpenStickers: (pageId: string) => void;
  onOpenPages: () => void;
}) {
  const doc = useAppStore((state) => state.doc);
  const selectedId = useAppStore((state) => state.selectedId);
  const select = useAppStore((state) => state.select);

  const activePage =
    pages.find((page) => page.id === activePageId) ?? pages[0] ?? doc?.pages[0] ?? null;
  let selectedPage: Page | null = null;
  let selectedElement: ScrapbookElement | undefined;
  if (selectedId && doc) {
    selectedPage = doc.pages.find((page) => page.elements.some((el) => el.id === selectedId)) ?? null;
    selectedElement = selectedPage?.elements.find((el) => el.id === selectedId);
  }

  if (!doc) return null;

  return (
    <div className="space-y-5 p-4 pb-8">
      {selectedPage && selectedElement ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.58rem] uppercase tracking-[0.2em] muted">{selectedPage.name}</p>
              <h2 className="font-display text-lg capitalize leading-tight">
                {selectedElement.kind === 'hidden'
                  ? 'Hidden note'
                  : selectedElement.kind === 'custom'
                    ? 'Decoration'
                    : selectedElement.kind}
              </h2>
            </div>
            <button type="button" className="chip min-h-8 shrink-0 text-[0.66rem]" onClick={() => select(null)}>
              <Icon name="arrow-left" size={12} /> Page
            </button>
          </div>

          <ElementActions page={selectedPage} element={selectedElement} />

          {selectedElement.kind === 'text' && (
            <TextEditor page={selectedPage} element={selectedElement} />
          )}
          {selectedElement.kind === 'photo' && (
            <PhotoEditor page={selectedPage} element={selectedElement} onOpenFraming={onOpenFraming} />
          )}
          {selectedElement.kind === 'sticker' && (
            <StickerEditor page={selectedPage} element={selectedElement} />
          )}
          {selectedElement.kind === 'envelope' && (
            <EnvelopeEditor page={selectedPage} element={selectedElement} />
          )}
          {selectedElement.kind === 'hidden' && (
            <HiddenEditor page={selectedPage} element={selectedElement} />
          )}
          {selectedElement.kind === 'button' && (
            <ButtonEditor page={selectedPage} element={selectedElement} />
          )}
          {selectedElement.kind === 'custom' && (
            <CustomEditor page={selectedPage} element={selectedElement} />
          )}

          {(selectedElement.kind === 'photo' ||
            selectedElement.kind === 'envelope' ||
            selectedElement.kind === 'hidden' ||
            selectedElement.kind === 'button') && (
            <InteractionEditor page={selectedPage} element={selectedElement} pages={pages} />
          )}

          <PlacementFields page={selectedPage} element={selectedElement} />
        </>
      ) : activePage ? (
        <PageSettings
          pages={pages}
          page={activePage}
          activePageId={activePageId}
          onActivePageChange={(pageId) => {
            select(null);
            onActivePageChange(pageId);
          }}
          onOpenMemories={onOpenMemories}
          onOpenStickers={onOpenStickers}
          onOpenPages={onOpenPages}
          onOpenFraming={onOpenFraming}
        />
      ) : null}
    </div>
  );
}
