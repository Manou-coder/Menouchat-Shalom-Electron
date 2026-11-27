/** The ornaments' size on the surface; the drawing is made on a 92 × 92 grid. */
const SIZE = 70;

/** Gold scrollwork for one corner, drawn for the top left and mirrored into the others. */
function Corner() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 92 92" aria-hidden>
      <defs>
        <linearGradient id="classic-new-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e7c46a" />
          <stop offset="0.5" stopColor="#a87628" />
          <stop offset="1" stopColor="#d9a948" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#classic-new-gold)" strokeLinecap="round">
        <path d="M12 86 V30 Q12 12 30 12 H86" strokeWidth="2.6" />
        <path d="M20 86 V34 Q20 20 34 20 H86" strokeWidth="1.2" />
        <path d="M86 12 C94 12 95 24 87 25 C81 26 79 19 84 18" strokeWidth="2" />
        <path d="M12 86 C12 94 24 95 25 87 C26 81 19 79 18 84" strokeWidth="2" />
        <path d="M30 30 C40 30 44 38 50 38 C56 38 58 32 54 30" strokeWidth="1.6" />
        <path d="M30 30 C30 40 38 44 38 50 C38 56 32 58 30 54" strokeWidth="1.6" />
      </g>
      <g fill="url(#classic-new-gold)">
        <circle cx="30" cy="30" r="4.5" />
        <path d="M30 19 L33 24 L30 26 L27 24 Z" />
        <path d="M19 30 L24 27 L26 30 L24 33 Z" />
      </g>
    </svg>
  );
}

const corners = [
  { key: 'top-right', style: { top: 0, right: 0, transform: 'scaleX(-1)' } },
  { key: 'top-left', style: { top: 0, left: 0 } },
  { key: 'bottom-right', style: { bottom: 0, right: 0, transform: 'scale(-1, -1)' } },
  { key: 'bottom-left', style: { bottom: 0, left: 0, transform: 'scaleY(-1)' } },
] as const;

/** Gold scrollwork in the four corners of the parchment, inside `inset` of gold moulding. */
export function FrameOrnaments({ inset }: { inset: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute" style={{ inset }}>
      {corners.map((corner) => (
        <div key={corner.key} className="absolute" style={corner.style}>
          <Corner />
        </div>
      ))}
    </div>
  );
}
