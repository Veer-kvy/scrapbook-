import type { StickerId } from '../../types';
import { STICKER_GROUPS, Sticker } from '../Stickers/Sticker';
import { WASHI } from '../../data/factories';

export function StickerGrid({
  selected,
  onPick,
}: {
  selected?: StickerId;
  onPick: (sticker: StickerId) => void;
}) {
  return (
    <div className="space-y-4">
      {STICKER_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 text-[0.6rem] uppercase tracking-[0.2em] opacity-55">{group.label}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {group.items.map((item) => {
              const washi = WASHI.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`grid min-h-12 place-items-center rounded-xl border p-1.5 transition ${
                    selected === item.id
                      ? 'border-[#c98c9d] bg-[rgba(201,140,157,.18)]'
                      : 'hairline border bg-[rgba(255,250,240,.35)] hover:border-[#c98c9d]/60'
                  }`}
                  onClick={() => onPick(item.id)}
                  aria-label={item.label}
                  aria-pressed={selected === item.id}
                  title={item.label}
                >
                  <span
                    className={washi ? 'block w-full' : 'block w-8'}
                    style={{ height: washi ? 14 : 32 }}
                  >
                    <Sticker id={item.id} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
