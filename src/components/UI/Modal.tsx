import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from './Icon';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZES: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  placement = 'center',
  hideClose = false,
  className = '',
  bodyClassName = '',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: Size;
  placement?: 'center' | 'bottom';
  hideClose?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  const reduce = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      const focusable = cardRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 60);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
      if (event.key !== 'Tab' || !cardRef.current) return;
      const items = Array.from(
        cardRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-[90] flex justify-center overflow-y-auto bg-[rgba(48,34,40,.5)] backdrop-blur-[6px] ${
            placement === 'bottom' ? 'items-end sm:items-center' : 'items-center'
          } p-0 sm:p-5`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.22 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={`modal-card relative flex max-h-[92dvh] w-full flex-col sm:max-h-[88dvh] ${
              SIZES[size]
            } ${
              placement === 'bottom'
                ? 'rounded-b-none rounded-t-[22px] sm:rounded-[18px]'
                : 'rounded-[18px]'
            } ${className}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {(title || !hideClose) && (
              <div className="relative z-10 flex items-start gap-4 border-b border-[rgba(156,100,116,.14)] px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2
                      id={titleId}
                      className="font-display text-[1.35rem] leading-tight text-ink sm:text-2xl"
                    >
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="mt-1 font-serif text-sm italic text-deeprose/80">{subtitle}</p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    className="icon-btn -mr-1 h-9 w-9 shrink-0"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <Icon name="close" size={18} />
                  </button>
                )}
              </div>
            )}
            <div className={`relative z-10 min-h-0 flex-1 overflow-y-auto thin-scroll ${bodyClassName}`}>
              {children}
            </div>
            {footer && (
              <div className="relative z-10 flex flex-wrap items-center justify-end gap-2 border-t border-[rgba(156,100,116,.14)] px-5 py-3.5 sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
