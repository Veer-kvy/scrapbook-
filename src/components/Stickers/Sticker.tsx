import type { StickerId } from '../../types';

const WASHI_CLASS: Partial<Record<StickerId, string>> = {
  washiRose: 'washi-rose',
  washiGingham: 'washi-gingham',
  washiBlue: 'washi-blue',
  washiCream: 'washi-cream',
};

const stroke = '#9C6474';
const ink = '#6F5059';

function Art({ id }: { id: StickerId }) {
  switch (id) {
    case 'heart':
      return (
        <g>
          <path
            d="M32 56C12 42 7 28 17 19.5 24.5 13.5 30 17.5 32 23c2-5.5 7.5-9.5 15-3.5C57 28 52 42 32 56Z"
            fill="#E89AA6"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M22 25c-2 2.4-2.6 5.4-2 8.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".6" />
        </g>
      );
    case 'heartOutline':
      return (
        <g>
          <path
            d="M32 55C13 42 8 28.5 17.5 20 25 13 30 17.5 32 23c2-5.5 7-10 14.5-3C56 28.5 51 42 32 55Z"
            fill="#FFFBF3"
            fillOpacity=".55"
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeDasharray="4 3"
          />
        </g>
      );
    case 'daisy':
      return (
        <g>
          <g fill="#FFFBF1" stroke="#C9A9A8" strokeWidth="1.4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ellipse key={i} cx="32" cy="14" rx="6.2" ry="11" transform={`rotate(${i * 45} 32 32)`} />
            ))}
          </g>
          <circle cx="32" cy="32" r="8" fill="#F2C46D" stroke="#C79B55" strokeWidth="1.6" />
          <circle cx="29.5" cy="30" r="1.2" fill="#C79B55" />
          <circle cx="35" cy="33.5" r="1.2" fill="#C79B55" />
        </g>
      );
    case 'rose':
      return (
        <g>
          <path d="M30 44c-6 5-7 11-5 16" stroke="#8FA37C" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M32 44c7 3 10 9 9 15" stroke="#8FA37C" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <ellipse cx="22" cy="53" rx="7" ry="3.6" fill="#C7D3B8" stroke="#8FA37C" strokeWidth="1.2" transform="rotate(-28 22 53)" />
          <ellipse cx="43" cy="54" rx="7" ry="3.6" fill="#C7D3B8" stroke="#8FA37C" strokeWidth="1.2" transform="rotate(24 43 54)" />
          <circle cx="32" cy="30" r="16" fill="#E595A2" stroke={stroke} strokeWidth="1.8" />
          <path d="M32 17c7 3 9 9 6.5 14S30 36 27 31.5 28 21 32 22" fill="#F0B6BC" stroke="#B77785" strokeWidth="1.3" />
          <path d="M28 33c4-1 7-4 7-8" stroke="#B77785" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M26 22c-4 5-4 12 1 16" stroke="#B77785" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'tulip':
      return (
        <g>
          <path d="M32 36v20" stroke="#8FA37C" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M32 48c-8-1-12-6-12-11 5-1 10 2 12 7" fill="#C7D3B8" stroke="#8FA37C" strokeWidth="1.4" />
          <path d="M32 44c7 0 11-4 11-9-4-1-8 2-11 6" fill="#C7D3B8" stroke="#8FA37C" strokeWidth="1.4" />
          <path
            d="M18 18c0 10 5 20 14 20s14-10 14-20c-4 3-9 3-14-1-5 4-10 4-14 1Z"
            fill="#EBA3AC"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M25 18c1 6 3 10 7 13" stroke="#C97F8D" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'butterfly':
      return (
        <g>
          <path
            d="M30 32c-8-12-19-14-21-6-2 7 7 12 16 11-7 4-8 12-2 14 5 2 8-6 9-12"
            fill="#F3C9CF"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M34 32c8-12 19-14 21-6 2 7-7 12-16 11 7 4 8 12 2 14-5 2-8-6-9-12"
            fill="#F8DCD5"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <ellipse cx="32" cy="34" rx="2.4" ry="12" fill={ink} />
          <path d="M31 22c-2-4-5-6-7-7M33 22c2-4 5-6 7-7" stroke={ink} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <circle cx="21" cy="30" r="2.2" fill="#fff" opacity=".7" />
          <circle cx="43" cy="30" r="2.2" fill="#fff" opacity=".7" />
        </g>
      );
    case 'star':
      return (
        <g>
          <path
            d="M32 8l6.4 14.6 15.6 1.6-11.6 10.6 3.2 15.6L32 42.8 18.4 50.4l3.2-15.6L10 24.2l15.6-1.6Z"
            fill="#F4D58D"
            stroke="#BE9550"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'sparkle':
      return (
        <g fill="#F3D7A0" stroke="#C9A45E" strokeWidth="1.3">
          <path d="M32 8c1.6 12 5.6 16 16 17-10.4 1-14.4 5-16 17-1.6-12-5.6-16-16-17 10.4-1 14.4-5 16-17Z" />
          <path d="M50 42c.8 4.6 2.4 6.2 7 7-4.6.8-6.2 2.4-7 7-.8-4.6-2.4-6.2-7-7 4.6-.8 6.2-2.4 7-7Z" />
          <circle cx="16" cy="48" r="2" />
        </g>
      );
    case 'bow':
      return (
        <g>
          <path
            d="M32 30c-6-10-18-14-21-6-3 9 8 14 17 10"
            fill="#EBB3B4"
            stroke={stroke}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M32 30c6-10 18-14 21-6 3 9-8 14-17 10"
            fill="#F4C8C6"
            stroke={stroke}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M30 34c-3 7-6 12-10 18M34 34c3 7 6 12 10 18" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="27" y="26" width="10" height="10" rx="3.4" fill="#D98F9D" stroke={stroke} strokeWidth="1.5" />
        </g>
      );
    case 'stamp':
      return (
        <g>
          <path
            d="M12 12h40v40H12z"
            fill="#FBF3E2"
            stroke="#D5BFA9"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
          <path d="M12 12h40v40H12z" fill="none" stroke="#C98C9D" strokeWidth="1" opacity=".5" />
          <circle cx="32" cy="32" r="11" fill="none" stroke="#C98C9D" strokeWidth="1.6" strokeDasharray="2 2" />
          <path d="M32 39c-5-4-7-7-5-10 1.4-2 4-2 5 .4 1-2.4 3.6-2.4 5-.4 2 3 0 6-5 10Z" fill="#D98F9D" stroke={stroke} strokeWidth="1" />
        </g>
      );
    case 'clip':
      return (
        <g>
          <path
            d="M19 14c-5 12-5 27 1 36 5 8 15 6 17-3 2-8-1-22-6-29-3-5-9-4-9 3 0 9 4 21 8 26"
            fill="none"
            stroke="#B6A29F"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M19 14c-5 12-5 27 1 36 5 8 15 6 17-3 2-8-1-22-6-29-3-5-9-4-9 3 0 9 4 21 8 26"
            fill="none"
            stroke="#E9DDD6"
            strokeWidth="1"
            strokeLinecap="round"
            opacity=".8"
          />
        </g>
      );
    case 'arrow':
      return (
        <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 14c14 4 22 13 24 28" />
          <path d="M32 38l10 9 7-12" />
        </g>
      );
    case 'cloud':
      return (
        <g>
          <path
            d="M17 40c-6 0-9-4-9-9s4-9 9-9c2-8 15-9 19-2 8-2 14 3 14 10 0 5-3 9-8 10H17Z"
            fill="#FFFDF7"
            stroke="#C6B0AC"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M24 49h16M30 55h9" stroke="#D9C4C0" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'sun':
      return (
        <g>
          <circle cx="32" cy="32" r="12" fill="#F7DC9B" stroke="#C69F56" strokeWidth="1.8" />
          <g stroke="#C69F56" strokeWidth="2.2" strokeLinecap="round">
            {Array.from({ length: 8 }).map((_, i) => (
              <path key={i} d="M32 10v6" transform={`rotate(${i * 45} 32 32)`} />
            ))}
          </g>
          <circle cx="28" cy="30" r="1.4" fill="#B08A48" />
          <circle cx="36" cy="30" r="1.4" fill="#B08A48" />
          <path d="M28 35c2 2 6 2 8 0" stroke="#B08A48" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'moon':
      return (
        <g>
          <path d="M40 12c-12 3-18 16-13 27 4 9 14 13 23 8-9 0-17-6-19-15-2-8 2-15 9-20Z" fill="#F5DFA6" stroke="#C6A45F" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M47 20l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6Z" fill="#E8C67E" />
        </g>
      );
    case 'strawberry':
      return (
        <g>
          <path
            d="M32 55c-10 0-19-9-19-21 0-9 8-14 19-14s19 5 19 14c0 12-9 21-19 21Z"
            fill="#E68C8C"
            stroke="#B26566"
            strokeWidth="1.8"
          />
          <path d="M31 21c-4-6-11-7-15-5 1 5 5 8 11 8-4 2-6 5-6 8 4-1 7-3 9-7 2 4 5 6 9 7 0-3-2-6-6-8 6 0 10-3 11-8-4-2-11-1-15 5Z" fill="#B7C69E" stroke="#8FA37C" strokeWidth="1.4" />
          <g fill="#C97071">
            <circle cx="24" cy="34" r="1.3" />
            <circle cx="32" cy="31" r="1.3" />
            <circle cx="40" cy="34" r="1.3" />
            <circle cx="28" cy="42" r="1.3" />
            <circle cx="36" cy="42" r="1.3" />
            <circle cx="32" cy="49" r="1.3" />
          </g>
        </g>
      );
    case 'smiley':
      return (
        <g>
          <circle cx="32" cy="32" r="21" fill="#F7DFA6" stroke="#C6A45F" strokeWidth="1.8" />
          <circle cx="25" cy="28" r="2.2" fill={ink} />
          <circle cx="39" cy="28" r="2.2" fill={ink} />
          <path d="M23 37c5 6 13 6 18 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="18" cy="35" r="3" fill="#EFA9A6" opacity=".65" />
          <circle cx="46" cy="35" r="3" fill="#EFA9A6" opacity=".65" />
        </g>
      );
    case 'leaf':
      return (
        <g>
          <path d="M32 56c-2-14-1-27 6-38" stroke="#8FA37C" strokeWidth="1.8" fill="none" />
          <path d="M38 18C50 10 59 16 55 29 51 42 40 47 33 46 34 34 35 25 38 18Z" fill="#C7D3B8" stroke="#8FA37C" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M34 44c8-8 13-16 16-24" stroke="#8FA37C" strokeWidth="1.1" fill="none" />
        </g>
      );
    case 'envelope':
      return (
        <g>
          <rect x="8" y="18" width="48" height="32" rx="2.5" fill="#FBF1DF" stroke={stroke} strokeWidth="1.8" />
          <path d="M8 20l24 17 24-17" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8 48l18-14M56 48L38 34" stroke="#CFA9AC" strokeWidth="1.2" />
          <circle cx="32" cy="37" r="5" fill="#D98F9D" opacity=".9" />
          <path d="M32 40c-2-1.6-2.8-2.8-2-4 .6-.8 1.6-.8 2 .2.4-1 1.4-1 2-.2.8 1.2 0 2.4-2 4Z" fill="#FFF3E8" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M12 22l8 8 12-13 12 13 8-8-4 26H16Z" fill="#F2D58D" stroke="#BE9550" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="20" cy="30" r="1.8" fill="#C98C9D" />
          <circle cx="32" cy="25" r="1.8" fill="#C98C9D" />
          <circle cx="44" cy="30" r="1.8" fill="#C98C9D" />
          <path d="M18 43h28" stroke="#D6B473" strokeWidth="1.6" />
        </g>
      );
    default:
      return null;
  }
}

export function Sticker({ id, className = '' }: { id: StickerId; className?: string }) {
  const washi = WASHI_CLASS[id];
  if (washi) {
    return <span className={`washi ${washi} ${className}`} aria-hidden="true" />;
  }
  return (
    <svg
      viewBox="0 0 64 64"
      className={`sticker-svg h-full w-full ${className}`}
      style={{ filter: 'drop-shadow(0 3px 3px rgba(73,58,64,.18))' }}
      aria-hidden="true"
      focusable="false"
    >
      <Art id={id} />
    </svg>
  );
}

export const STICKER_GROUPS: {
  label: string;
  items: { id: StickerId; label: string }[];
}[] = [
  {
    label: 'Love',
    items: [
      { id: 'heart', label: 'Heart' },
      { id: 'heartOutline', label: 'Stitched heart' },
      { id: 'bow', label: 'Ribbon bow' },
      { id: 'envelope', label: 'Envelope' },
      { id: 'crown', label: 'Crown' },
    ],
  },
  {
    label: 'Nature',
    items: [
      { id: 'daisy', label: 'Daisy' },
      { id: 'rose', label: 'Rose' },
      { id: 'tulip', label: 'Tulip' },
      { id: 'leaf', label: 'Pressed leaf' },
      { id: 'butterfly', label: 'Butterfly' },
      { id: 'sun', label: 'Sun' },
      { id: 'moon', label: 'Moon' },
      { id: 'cloud', label: 'Cloud' },
    ],
  },
  {
    label: 'Cute',
    items: [
      { id: 'star', label: 'Star' },
      { id: 'sparkle', label: 'Sparkle' },
      { id: 'strawberry', label: 'Strawberry' },
      { id: 'smiley', label: 'Smiley' },
    ],
  },
  {
    label: 'Paper',
    items: [
      { id: 'washiRose', label: 'Rose washi' },
      { id: 'washiGingham', label: 'Gingham washi' },
      { id: 'washiBlue', label: 'Sage washi' },
      { id: 'washiCream', label: 'Cream washi' },
      { id: 'stamp', label: 'Postage stamp' },
      { id: 'clip', label: 'Paper clip' },
      { id: 'arrow', label: 'Doodle arrow' },
    ],
  },
];
