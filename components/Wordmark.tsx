// Compact wordmark: small bud icon + the word "Testbuds".
// Used in the AppHeader and anywhere the brand is shown small.

export interface WordmarkProps {
  size?: number;
}

export function Wordmark({ size = 1 }: WordmarkProps) {
  const s = size;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 * s }}>
      <svg viewBox="0 0 200 220" width={48 * s} height={48 * s} style={{ display: 'block' }} role="img" aria-label="Testbuds">
        <ellipse cx="100" cy="135" rx="62" ry="65" fill="#9CC182" />
        <ellipse cx="78" cy="100" rx="20" ry="16" fill="#B8D6A0" opacity="0.65" />
        <g transform="translate(100 65)">
          <path d="M 0 4 Q -1 -6 -3 -14" stroke="#3F6B2E" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path
            d="M -3 -14 Q -16 -22 -13 -36 Q 2 -30 -3 -14 Z"
            fill="#5E8E4A"
            stroke="#3F6B2E"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>
        <circle cx="80" cy="130" r="6" fill="#1B1611" />
        <circle cx="120" cy="130" r="6" fill="#1B1611" />
        <path d="M 88 152 Q 100 160 112 152" stroke="#3A1E14" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <span
        className="display"
        style={{
          fontSize: 34 * s,
          fontWeight: 600,
          color: 'var(--color-ink)',
          letterSpacing: '-0.03em',
        }}
      >
        Testbuds
      </span>
    </div>
  );
}
