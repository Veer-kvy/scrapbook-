import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type {
  ButtonElement,
  CustomAssetElement,
  EnvelopeElement,
  HiddenElement,
  Letter,
  PhotoElement,
  PhotoMeta,
  StickerElement,
  TextElement,
} from '../../types';
import { formatDate } from '../../lib/utils';
import { audio } from '../../lib/audio';
import { useAppStore } from '../../data/store';
import { Sticker } from '../Stickers/Sticker';
import { Modal } from '../UI/Modal';
import { Icon } from '../UI/Icon';

const FONT_VARS: Record<TextElement['font'], string> = {
  display: 'var(--font-display)',
  serif: 'var(--font-serif)',
  hand: 'var(--font-hand)',
  sans: 'var(--font-sans)',
};

const TONE_STYLE: Record<'rose' | 'cream' | 'sage' | 'peach', { bg: string; fg: string; border: string }> = {
  rose: { bg: '#9c6474', fg: '#fff8ec', border: '#9c6474' },
  cream: { bg: '#fbf1df', fg: '#493a40', border: '#d9c5a7' },
  sage: { bg: '#8fa37c', fg: '#fff8ec', border: '#8fa37c' },
  peach: { bg: '#e0a184', fg: '#3f2f29', border: '#e0a184' },
};

export function useElementAction() {
  const doc = useAppStore((state) => state.doc);
  const goToPage = useAppStore((state) => state.goToPage);
  const showNote = useAppStore((state) => state.showNote);
  const notify = useAppStore((state) => state.notify);

  const goToTarget = (pageId?: string) => {
    if (!pageId) return false;
    const index = doc?.pages.findIndex((page) => page.id === pageId) ?? -1;
    if (index < 0) {
      notify('That page is no longer in the scrapbook.', 'error');
      return false;
    }
    audio.sfx('page');
    goToPage(index);
    return true;
  };

  return {
    goToTarget,
    showNote: (title: string, body: string) => showNote({ title, body }),
  };
}

export function TextView({ element }: { element: TextElement }) {
  const style: React.CSSProperties = {
    fontFamily: FONT_VARS[element.font],
    fontSize: `${element.size}cqw`,
    color: element.color,
    textAlign: element.align,
    lineHeight: element.lineHeight,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    fontWeight: element.font === 'display' ? 600 : element.font === 'hand' ? 500 : 400,
    letterSpacing: element.font === 'display' ? '-0.01em' : undefined,
    textWrap: 'pretty',
  };

  if (element.style === 'highlight') {
    return (
      <div className="h-full w-full" style={style}>
        <span
          style={{
            background: 'linear-gradient(transparent 62%, rgba(243,201,207,.75) 62%)',
            paddingBottom: '0.08em',
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
          }}
        >
          {element.text}
        </span>
      </div>
    );
  }

  if (element.style === 'underline') {
    return (
      <div
        className="h-full w-full"
        style={{
          ...style,
          textDecorationLine: 'underline',
          textDecorationStyle: 'wavy',
          textDecorationColor: 'rgba(201,140,157,.85)',
          textUnderlineOffset: '0.18em',
        }}
      >
        {element.text}
      </div>
    );
  }

  return (
    <div className="h-full w-full" style={style}>
      {element.text}
    </div>
  );
}

export function PhotoView({
  element,
  photo,
  url,
  editorMode,
  inactive,
}: {
  element: PhotoElement;
  photo?: PhotoMeta;
  url?: string;
  editorMode: boolean;
  inactive: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const reduce = useReducedMotion();
  const { goToTarget, showNote } = useElementAction();
  const caption = element.caption || photo?.caption || '';
  const date = element.date || photo?.date || '';
  const alt = caption || photo?.name || 'A photograph in the scrapbook';
  const interactive = !editorMode && !inactive;
  const interaction = element.interaction;
  const interactionType = interaction?.type ?? 'none';
  const goesToPage = interactionType === 'go-to-page';
  const showsNote =
    interactionType === 'show-note' || interactionType === 'surprise' || interactionType === 'bloom';
  const flips = interactionType === 'flip' || interactionType === 'none';
  const backText = interaction?.message || caption || 'a little memory';
  const canFlip = flips && Boolean(backText || date);

  const front = (
    <div className={`polaroid frame-${element.frame}`}>
      <div className="polaroid-photo">
        {url ? (
          <img
            src={url}
            alt={alt}
            loading="lazy"
            draggable={false}
            style={{
              transform: `translate(${element.crop.x}%, ${element.crop.y}%) scale(${element.crop.zoom}) rotate(${element.imageRotate}deg)`,
            }}
          />
        ) : (
          <div className="photo-missing">
            <Icon name="image" size={26} />
            <span>photo unavailable</span>
          </div>
        )}
      </div>
      {element.frame === 'taped' && (
        <>
          <span
            className="washi washi-rose absolute"
            style={{ left: '-7%', top: '-5%', width: '38%', height: '13%', transform: 'rotate(-12deg)' }}
            aria-hidden="true"
          />
          <span
            className="washi washi-cream absolute"
            style={{ right: '-7%', top: '-4%', width: '34%', height: '12%', transform: 'rotate(10deg)' }}
            aria-hidden="true"
          />
        </>
      )}
      <div className="polaroid-caption">{caption}</div>
    </div>
  );

  if (!interactive) {
    return (
      <div className="relative h-full w-full" aria-label={alt} role="img">
        {front}
      </div>
    );
  }

  const onActivate = () => {
    if (goesToPage) {
      goToTarget(interaction?.targetPageId);
      return;
    }
    if (showsNote) {
      audio.sfx('pop');
      showNote('A little something', interaction?.message || 'A note saved just for you.');
      return;
    }
    if (!canFlip) return;
    audio.sfx('click');
    setFlipped((value) => !value);
  };

  return (
    <div className="relative h-full w-full" style={{ perspective: '900px' }}>
      <button
        type="button"
        className="group block h-full w-full cursor-pointer text-left"
        aria-label={
          goesToPage
            ? `Go to another page${caption ? `: ${caption}` : ''}`
            : showsNote
              ? `Open note${caption ? `: ${caption}` : ''}`
              : canFlip
                ? `Flip photograph${caption ? `: ${caption}` : ''}`
                : alt
        }
        aria-pressed={canFlip ? flipped : undefined}
        onClick={(event) => {
          event.stopPropagation();
          onActivate();
        }}
      >
        <div
          className="relative h-full w-full"
          style={{
            transformStyle: 'preserve-3d',
            transition: reduce ? 'none' : 'transform .7s cubic-bezier(.2,.8,.3,1)',
            transform: flipped ? 'rotateY(180deg)' : 'none',
          }}
        >
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
            {front}
          </div>
          <div
            className="absolute inset-0"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="polaroid-back">
              <span style={{ fontSize: 'clamp(12px, 5.6cqw, 20px)', lineHeight: 1.25 }}>
                {backText}
              </span>
              {date && (
                <span
                  style={{
                    fontSize: 'clamp(9px, 3.6cqw, 13px)',
                    letterSpacing: '.14em',
                    color: 'rgba(156,100,116,.75)',
                  }}
                >
                  {formatDate(date)}
                </span>
              )}
              <span
                style={{
                  fontSize: 'clamp(8px, 3cqw, 11px)',
                  color: 'rgba(156,100,116,.55)',
                  letterSpacing: '.1em',
                }}
              >
                tap to flip back
              </span>
            </div>
          </div>
        </div>
      </button>
      {canFlip && !flipped && (
        <span
          className="pointer-events-none absolute right-[4%] top-[4%] z-10 flex items-center gap-1 rounded-full bg-[rgba(73,58,64,.55)] px-2 py-1 text-[1.9cqw] uppercase tracking-[.12em] text-[#fff8ec] opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-sm:opacity-90"
          aria-hidden="true"
        >
          <Icon name="rotate" size={11} /> flip
        </span>
      )}
    </div>
  );
}

const PAPER_STYLE: Record<Letter['paper'], React.CSSProperties> = {
  lined: {
    backgroundColor: '#fdf4e4',
    backgroundImage:
      'repeating-linear-gradient(0deg, transparent 0 27px, rgba(201,140,157,.22) 27px 28px)',
  },
  plain: { backgroundColor: '#fdf6e9' },
  floral: {
    backgroundColor: '#fbeff0',
    backgroundImage:
      'radial-gradient(circle at 14% 18%, rgba(201,140,157,.22) 2px, transparent 3px), radial-gradient(circle at 82% 70%, rgba(232,184,167,.3) 3px, transparent 4px)',
    backgroundSize: '38px 38px, 52px 52px',
  },
  kraft: { backgroundColor: '#e2c9af' },
};

export function EnvelopeView({
  element,
  editorMode,
  inactive,
}: {
  element: EnvelopeElement;
  editorMode: boolean;
  inactive: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const [open, setOpen] = useState(false);
  const sender = useAppStore((state) => state.doc?.meta.sender ?? '');
  const letters = useAppStore((state) => state.doc?.letters);
  const { goToTarget, showNote } = useElementAction();
  const reduce = useReducedMotion();
  const letter = element.letterId ? letters?.find((item) => item.id === element.letterId) : undefined;
  const interaction = element.interaction;
  const interactive = !editorMode && !inactive;
  const title = letter?.title || element.title;
  const tone = letter?.envelope || element.tone;

  const envelope = (
    <div className={`envelope tone-${tone} ${opening ? 'opening' : ''}`}>
      <div className="envelope-paper">
        <div className="pocket" />
        <div className="flap" />
        <div className="address" />
        <div className="seal" aria-hidden="true">
          ♥
        </div>
        <div className="label">{title}</div>
      </div>
    </div>
  );

  if (!interactive) {
    return (
      <div className="relative h-full w-full" aria-label={`Envelope: ${title}`} role="img">
        {envelope}
      </div>
    );
  }

  const openEnvelope = () => {
    if (interaction?.type === 'go-to-page') {
      goToTarget(interaction.targetPageId);
      return;
    }
    if (interaction?.type === 'show-note' || interaction?.type === 'surprise') {
      showNote('A little something', interaction.message || letter?.body || element.note);
      return;
    }
    audio.sfx('envelope');
    setOpening(true);
    window.setTimeout(() => {
      setOpen(true);
      setOpening(false);
    }, reduce ? 0 : 420);
  };

  const letterFont = letter
    ? FONT_VARS[letter.font]
    : 'var(--font-hand)';
  const letterAnimation = letter?.animation ?? 'unfold';

  return (
    <div className="relative h-full w-full">
      <button
        type="button"
        className="block h-full w-full cursor-pointer"
        aria-label={`Open envelope: ${title}`}
        onClick={openEnvelope}
      >
        {envelope}
      </button>
      <span
        className="pointer-events-none absolute -bottom-[8%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[rgba(255,248,236,.85)] px-2 py-[0.15em] font-hand text-[3.1cqw] text-deeprose shadow-sm"
        aria-hidden="true"
      >
        open
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title={title || 'A letter'} size="md">
        <div className="px-5 pb-6 pt-3 sm:px-8 sm:pb-8">
          <div className="relative">
            <motion.div
              className="letter-paper rounded-[4px] px-6 py-8 sm:px-10 sm:py-10"
              initial={
                reduce
                  ? { opacity: 0 }
                  : letterAnimation === 'fade'
                    ? { opacity: 0 }
                    : letterAnimation === 'slide'
                      ? { opacity: 0, y: 28 }
                      : { opacity: 0, scaleY: 0.35 }
              }
              animate={
                reduce
                  ? { opacity: 1 }
                  : letterAnimation === 'slide'
                    ? { opacity: 1, y: 0 }
                    : { opacity: 1, scaleY: 1 }
              }
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ ...PAPER_STYLE[letter?.paper ?? 'lined'], transformOrigin: 'top center' }}
            >
              <p
                className="relative z-10 whitespace-pre-wrap"
                style={{
                  fontFamily: letterFont,
                  color: letter?.inkColor || '#4a373d',
                  fontSize: `${(letter?.fontSize ?? 5) * 0.24}rem`,
                  lineHeight: 1.55,
                }}
              >
                {letter?.body || element.note}
              </p>
              {letter?.hiddenMessage && (
                <p
                  className="relative z-10 mt-6 border-t border-dashed border-[#9c6474]/30 pt-3 text-sm italic text-deeprose/80"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  ps. {letter.hiddenMessage}
                </p>
              )}
              {sender && (
                <p className="relative z-10 mt-8 text-right font-hand text-xl text-deeprose">
                  — {sender}
                </p>
              )}
            </motion.div>
            <span className="pointer-events-none absolute -right-2 -top-3 z-10 rotate-6">
              <span className="block h-14 w-14 opacity-90">
                <Sticker id="stamp" />
              </span>
            </span>
          </div>
          <p className="mt-4 text-center text-xs text-ink/50">Tap outside or press Esc to fold it back.</p>
        </div>
      </Modal>
    </div>
  );
}

export function HeartBurst({ count = 18 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => {
        const angle = (index / count) * Math.PI * 2 + Math.random() * 0.5;
        const distance = 70 + Math.random() * 140;
        const size = 10 + Math.random() * 18;
        return (
          <motion.span
            key={index}
            className="absolute left-1/2 top-1/2"
            style={{ width: size, height: size }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance * 0.75 + 40,
              opacity: 0,
              scale: 1,
              rotate: Math.random() * 140 - 70,
            }}
            transition={{ duration: 1.3 + Math.random() * 0.6, delay: index * 0.015, ease: 'easeOut' }}
          >
            <Sticker id={index % 3 === 0 ? 'sparkle' : 'heart'} />
          </motion.span>
        );
      })}
    </div>
  );
}

export function HiddenView({
  element,
  editorMode,
  inactive,
}: {
  element: HiddenElement;
  editorMode: boolean;
  inactive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { goToTarget } = useElementAction();
  const interactive = !editorMode && !inactive;
  const interaction = element.interaction;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <button
        type="button"
        className={`relative h-full w-full ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        aria-label={interactive ? `Hidden note: ${element.prompt}` : 'Hidden note'}
        tabIndex={interactive ? 0 : -1}
        onClick={() => {
          if (!interactive) return;
          if (interaction?.type === 'go-to-page') {
            goToTarget(interaction.targetPageId);
            return;
          }
          audio.sfx('pop');
          setOpen(true);
        }}
      >
        <span
          className={`block h-full w-full ${interactive ? 'animate-heart' : ''}`}
          style={{ '--tilt': `${element.rot}deg` } as React.CSSProperties}
        >
          <Sticker id={element.sticker} />
        </span>
        {!editorMode && (
          <span className="pointer-events-none absolute left-1/2 top-full mt-[6%] -translate-x-1/2 whitespace-nowrap rounded-full bg-[rgba(255,248,236,.9)] px-[0.5em] py-[0.12em] font-hand text-[2.9cqw] text-deeprose shadow-sm">
            {element.prompt}
          </span>
        )}
      </button>
      {editorMode && (
        <span className="pointer-events-none absolute inset-0 rounded-[6px] border border-dashed border-[#b76f80]/60" />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="A little secret" size="sm">
        <div className="relative px-5 pb-8 pt-4">
          {open && <HeartBurst count={16} />}
          <motion.div
            className="relative z-10 rounded-[4px] bg-[#fdf4e4] px-5 py-7 shadow-paper"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scaleY: 0.4, rotateX: -20 }}
            animate={{ opacity: 1, scaleY: 1, rotateX: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              transformOrigin: 'top center',
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent 0 26px, rgba(201,140,157,.22) 26px 27px)',
            }}
          >
            <p className="whitespace-pre-wrap font-hand text-2xl leading-[1.55] text-[#4a373d] sm:text-[1.7rem]">
              {interaction?.message || element.note}
            </p>
          </motion.div>
          <p className="mt-4 text-center text-xs text-ink/50">A tiny note, just for you.</p>
        </div>
      </Modal>
    </div>
  );
}

export function ButtonView({
  element,
  editorMode,
  inactive,
}: {
  element: ButtonElement;
  editorMode: boolean;
  inactive: boolean;
}) {
  const { goToTarget, showNote } = useElementAction();
  const interactive = !editorMode && !inactive;
  const tone = TONE_STYLE[element.tone];
  const radius =
    element.style === 'pill' ? 999 : element.style === 'rounded' ? 14 : 3;
  const style: React.CSSProperties =
    element.style === 'outline'
      ? {
          background: 'transparent',
          color: tone.fg === '#fff8ec' ? tone.border : tone.fg,
          border: `1.5px solid ${tone.border}`,
          borderRadius: radius,
        }
      : element.style === 'soft'
        ? {
            background: `${tone.border}33`,
            color: '#583c45',
            border: `1px solid ${tone.border}66`,
            borderRadius: radius,
          }
        : {
            background: tone.bg,
            color: tone.fg,
            border: `1px solid ${tone.border}`,
            borderRadius: radius,
          };

  return (
    <div className="grid h-full w-full place-items-center">
      <button
        type="button"
        className={`flex h-full w-full items-center justify-center px-3 text-center font-medium tracking-wide ${interactive ? '' : 'cursor-default'}`}
        style={{ ...style, fontSize: 'max(11px, 3.2cqw)' }}
        tabIndex={interactive ? 0 : -1}
        aria-label={element.label}
        onClick={(event) => {
          if (!interactive) return;
          event.stopPropagation();
          const interaction = element.interaction;
          if (interaction?.type === 'go-to-page') {
            goToTarget(interaction.targetPageId);
            return;
          }
          audio.sfx('click');
          showNote(
            element.label,
            interaction?.message || 'This little button is still waiting for its surprise.',
          );
        }}
      >
        {element.label}
      </button>
    </div>
  );
}

export function CustomAssetView({
  element,
  editorMode,
  inactive,
}: {
  element: CustomAssetElement;
  editorMode: boolean;
  inactive: boolean;
}) {
  const assets = useAppStore((state) => state.doc?.customAssets);
  const urls = useAppStore((state) => state.mediaUrls);
  const { goToTarget, showNote } = useElementAction();
  const asset = assets?.find((item) => item.id === element.assetId);
  const url = asset ? urls[asset.id] : undefined;
  const interactive = !editorMode && !inactive && Boolean(element.interaction);

  return (
    <div className="relative h-full w-full">
      <button
        type="button"
        className={`block h-full w-full ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        tabIndex={interactive ? 0 : -1}
        aria-label={asset?.name ?? 'Decoration'}
        onClick={(event) => {
          if (!interactive) return;
          event.stopPropagation();
          const interaction = element.interaction;
          if (interaction?.type === 'go-to-page') {
            goToTarget(interaction.targetPageId);
            return;
          }
          audio.sfx('pop');
          showNote(asset?.name ?? 'A little something', interaction?.message || 'Made just for you.');
        }}
      >
        {url ? (
          <img src={url} alt={asset?.name ?? 'Decoration'} className="h-full w-full object-contain" draggable={false} />
        ) : (
          <span className="photo-missing h-full w-full">
            <Icon name="sticker" size={20} />
            <span>decoration missing</span>
          </span>
        )}
      </button>
    </div>
  );
}

export function ElementView({
  element,
  editorMode,
  inactive,
}: {
  element:
    | PhotoElement
    | TextElement
    | StickerElement
    | EnvelopeElement
    | HiddenElement
    | ButtonElement
    | CustomAssetElement;
  editorMode: boolean;
  inactive: boolean;
}) {
  const photos = useAppStore((state) => state.doc?.photos);
  const mediaUrls = useAppStore((state) => state.mediaUrls);

  switch (element.kind) {
    case 'text':
      return <TextView element={element} />;
    case 'sticker':
      return <Sticker id={element.sticker} />;
    case 'photo': {
      const photo = photos?.find((p) => p.id === element.photoId);
      const url = (photo && mediaUrls[photo.id]) || photo?.src;
      return (
        <PhotoView
          element={element}
          photo={photo}
          url={url}
          editorMode={editorMode}
          inactive={inactive}
        />
      );
    }
    case 'envelope':
      return <EnvelopeView element={element} editorMode={editorMode} inactive={inactive} />;
    case 'hidden':
      return <HiddenView element={element} editorMode={editorMode} inactive={inactive} />;
    case 'button':
      return <ButtonView element={element} editorMode={editorMode} inactive={inactive} />;
    case 'custom':
      return <CustomAssetView element={element} editorMode={editorMode} inactive={inactive} />;
    default:
      return null;
  }
}
