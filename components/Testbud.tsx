import type { CSSProperties, ReactElement } from 'react';
import type { Costume } from '@/src/persona/types';

export type Expression =
  | 'neutral'
  | 'curious'
  | 'pleased'
  | 'delighted'
  | 'confused'
  | 'frustrated'
  | 'impatient';

/** Shared color tokens used inside the bud SVG. */
export const TB = {
  body: '#9CC182',
  bodyHi: '#B8D6A0',
  bodyLo: '#7AA565',
  bodyDeep: '#5E8848',
  belly: '#DBEACA',
  sprout: '#3F6B2E',
  sproutMid: '#5E8E4A',
  sproutHi: '#82AE6B',
  eye: '#1B1611',
  eyeHi: '#FFFFFF',
  cheek: '#F0A092',
  cheekDeep: '#DC7E70',
  mouthLine: '#3A1E14',
  mouthOpen: '#5A2A1E',
  tongue: '#E18B7A',
} as const;

// ── Body parts (palette is locked to "sage") ─────────────────────────────
// Idle float: the bud bobs ~6 SVG units; the shadow shrinks and lightens in
// counterphase so it reads as the bud lifting off the ground.
const FLOAT_DUR = '3.2s';
const FLOAT_KEYTIMES = '0;0.5;1';
const FLOAT_KEYSPLINES = '0.42 0 0.58 1;0.42 0 0.58 1';

function TBShadow({ animated }: { animated: boolean }) {
  return (
    <ellipse cx="100" cy="210" rx="56" ry="5" fill="rgba(0,0,0,0.10)">
      {animated && (
        <>
          <animate
            attributeName="rx"
            values="56;48;56"
            keyTimes={FLOAT_KEYTIMES}
            dur={FLOAT_DUR}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines={FLOAT_KEYSPLINES}
          />
          <animate
            attributeName="opacity"
            values="1;0.55;1"
            keyTimes={FLOAT_KEYTIMES}
            dur={FLOAT_DUR}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines={FLOAT_KEYSPLINES}
          />
        </>
      )}
    </ellipse>
  );
}

type ArmPose = 'rest' | 'hold' | 'up' | 'hide';

function TBArms({ pose }: { pose: ArmPose }) {
  if (pose === 'hide') return null;
  if (pose === 'rest') {
    return (
      <g>
        <ellipse cx="34" cy="158" rx="11" ry="15" fill={TB.bodyLo} transform="rotate(-12 34 158)" />
        <ellipse cx="166" cy="158" rx="11" ry="15" fill={TB.bodyLo} transform="rotate(12 166 158)" />
      </g>
    );
  }
  if (pose === 'hold') {
    return (
      <g>
        <path d="M 38 155 Q 50 178 78 178" stroke={TB.bodyLo} strokeWidth="15" fill="none" strokeLinecap="round" />
        <path d="M 162 155 Q 150 178 122 178" stroke={TB.bodyLo} strokeWidth="15" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  // pose === 'up'
  return (
    <g>
      <path d="M 40 150 Q 28 130 36 110" stroke={TB.bodyLo} strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M 160 150 Q 172 130 164 110" stroke={TB.bodyLo} strokeWidth="14" fill="none" strokeLinecap="round" />
    </g>
  );
}

function TBBody() {
  // The clip ensures interior shading (highlight + belly + bottom shade) never bleeds past the body silhouette.
  const clipId = 'tb-body-clip';
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <ellipse cx="100" cy="132" rx="64" ry="68" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="132" rx="64" ry="68" fill={TB.body} />
      <g clipPath={`url(#${clipId})`}>
        <ellipse cx="78" cy="98" rx="22" ry="18" fill={TB.bodyHi} opacity="0.65" />
        <ellipse cx="100" cy="158" rx="42" ry="32" fill={TB.belly} opacity="0.55" />
        <ellipse cx="100" cy="180" rx="50" ry="14" fill={TB.bodyLo} opacity="0.22" />
      </g>
    </g>
  );
}

function TBSprout() {
  return (
    <g transform="translate(100 64)">
      <path d="M 0 4 Q -1 -6 -3 -14" stroke={TB.sprout} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path
        d="M -3 -14 Q -16 -22 -13 -36 Q 2 -30 -3 -14 Z"
        fill={TB.sproutMid}
        stroke={TB.sprout}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M -3 -14 Q -7 -22 -10 -30" stroke={TB.sprout} strokeWidth="1" fill="none" opacity="0.7" />
      <path d="M -10 -28 Q -8 -24 -6 -22" stroke={TB.sproutHi} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

// ── Eye sets ─────────────────────────────────────────────────────────────
function EyesDots({ size = 6 }: { size?: number }) {
  return (
    <g fill={TB.eye}>
      <circle cx="78" cy="128" r={size} />
      <circle cx="122" cy="128" r={size} />
      <g fill={TB.eyeHi}>
        <circle cx="80" cy="125" r="1.6" />
        <circle cx="124" cy="125" r="1.6" />
      </g>
    </g>
  );
}

function EyesArcUp() {
  return (
    <g stroke={TB.eye} strokeWidth="3.5" fill="none" strokeLinecap="round">
      <path d="M 70 130 Q 78 120 86 130" />
      <path d="M 114 130 Q 122 120 130 130" />
    </g>
  );
}

function EyesSparkle() {
  // Anime-style butter-yellow star eyes.
  const star = (cx: number, cy: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 8 : 3.4;
      const a = ((i * 36 - 90) * Math.PI) / 180;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
  };
  return (
    <g>
      <path d={star(78, 128)} fill="#F0C557" stroke={TB.eye} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={star(122, 128)} fill="#F0C557" stroke={TB.eye} strokeWidth="1.5" strokeLinejoin="round" />
      <g fill="#FFFFFF">
        <circle cx="75" cy="124" r="1.5" />
        <circle cx="119" cy="124" r="1.5" />
      </g>
    </g>
  );
}

function EyesHalfLid() {
  return (
    <g>
      <g fill={TB.eye} stroke={TB.eye} strokeWidth="1">
        <path d="M 72 128 A 6 6 0 0 1 84 128 L 72 128 Z" />
        <path d="M 116 128 A 6 6 0 0 1 128 128 L 116 128 Z" />
      </g>
      <g stroke={TB.eye} strokeWidth="2.5" strokeLinecap="round">
        <line x1="71" y1="128" x2="85" y2="128" />
        <line x1="115" y1="128" x2="129" y2="128" />
      </g>
    </g>
  );
}

// ── Brow sets ────────────────────────────────────────────────────────────
function BrowsAngry() {
  return (
    <g stroke={TB.eye} strokeWidth="3.5" strokeLinecap="round">
      <line x1="68" y1="111" x2="86" y2="119" />
      <line x1="132" y1="111" x2="114" y2="119" />
    </g>
  );
}

function BrowsRaisedOne() {
  return (
    <g stroke={TB.eye} strokeWidth="3" strokeLinecap="round" fill="none">
      <path d="M 70 114 Q 78 109 86 114" />
    </g>
  );
}

function BrowsConcerned() {
  return (
    <g stroke={TB.eye} strokeWidth="3" strokeLinecap="round" fill="none">
      <path d="M 70 116 Q 78 112 86 118" />
      <path d="M 130 116 Q 122 112 114 118" />
    </g>
  );
}

// ── Mouths ───────────────────────────────────────────────────────────────
function MouthLine() {
  return <path d="M 90 152 Q 100 156 110 152" stroke={TB.mouthLine} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
}

function MouthSmile() {
  return <path d="M 86 150 Q 100 162 114 150" stroke={TB.mouthLine} strokeWidth="3" fill="none" strokeLinecap="round" />;
}

function MouthGrin() {
  return (
    <g>
      <path d="M 82 148 Q 100 174 118 148 Q 100 156 82 148 Z" fill={TB.mouthOpen} stroke={TB.mouthLine} strokeWidth="2" />
      <path d="M 96 165 Q 100 172 104 165 Q 100 170 96 165 Z" fill={TB.tongue} />
    </g>
  );
}

function MouthOpenO() {
  return <ellipse cx="100" cy="155" rx="5" ry="6" fill={TB.mouthOpen} stroke={TB.mouthLine} strokeWidth="1.5" />;
}

function MouthZigzag() {
  return (
    <path
      d="M 86 153 L 92 149 L 98 154 L 104 149 L 110 154 L 114 150"
      stroke={TB.mouthLine}
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function MouthGrimace() {
  return (
    <g>
      <path d="M 84 152 Q 100 145 116 152 Q 100 161 84 152 Z" fill="#F1E4D4" stroke={TB.mouthLine} strokeWidth="2" />
      <line x1="92" y1="148" x2="92" y2="156" stroke={TB.mouthLine} strokeWidth="1.5" />
      <line x1="100" y1="146" x2="100" y2="158" stroke={TB.mouthLine} strokeWidth="1.5" />
      <line x1="108" y1="148" x2="108" y2="156" stroke={TB.mouthLine} strokeWidth="1.5" />
    </g>
  );
}

function MouthFlat() {
  return <line x1="90" y1="154" x2="110" y2="154" stroke={TB.mouthLine} strokeWidth="2.5" strokeLinecap="round" />;
}

// ── Cheeks + extras ──────────────────────────────────────────────────────
function Cheeks({ deep = false }: { deep?: boolean }) {
  const c = deep ? TB.cheekDeep : TB.cheek;
  return (
    <g fill={c} opacity={deep ? 0.7 : 0.55}>
      <ellipse cx="60" cy="148" rx="9" ry="6" />
      <ellipse cx="140" cy="148" rx="9" ry="6" />
    </g>
  );
}

function SweatDrop() {
  return (
    <g transform="translate(150 96) rotate(-8)">
      <path
        d="M 0 0 C 2 5, 5 9, 5 12 C 5 15, 2 17, 0 17 C -2 17, -5 15, -5 12 C -5 9, -2 5, 0 0 Z"
        fill="#A8D2EA"
        stroke="#4F8BA8"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <ellipse cx="-1.6" cy="9" rx="1.2" ry="2.4" fill="#FFFFFF" opacity="0.85" />
    </g>
  );
}

function AngerMark() {
  // Classic 💢 — a single 4-pointed crystal with concave sides.
  return (
    <g
      transform="translate(150 95) rotate(-12)"
      fill="#DC6B5A"
      stroke="#7A2D22"
      strokeWidth="1.2"
      strokeLinejoin="miter"
      strokeMiterlimit="10"
    >
      <path d="M 0 -11 Q 2.5 -2.5, 11 0 Q 2.5 2.5, 0 11 Q -2.5 2.5, -11 0 Q -2.5 -2.5, 0 -11 Z" />
    </g>
  );
}

function QuestionMark() {
  return (
    <g transform="translate(146 92)">
      <text x="0" y="0" fontFamily="var(--font-display, sans-serif)" fontSize="22" fontWeight="700" fill="#7A5A8A">
        ?
      </text>
    </g>
  );
}

// ── Face composition by expression ───────────────────────────────────────
function Face({ expression, eyeSize = 6 }: { expression: Expression; eyeSize?: number }): ReactElement {
  // Auto-cheeks on pleased + delighted; deep on delighted.
  const autoCheeks = expression === 'pleased' || expression === 'delighted';
  const cheekEl = autoCheeks ? <Cheeks deep={expression === 'delighted'} /> : null;

  switch (expression) {
    case 'neutral':
      return (
        <g>
          <EyesDots size={eyeSize} />
          <MouthLine />
          {cheekEl}
        </g>
      );
    case 'curious':
      return (
        <g>
          <BrowsRaisedOne />
          <EyesDots size={eyeSize} />
          <MouthOpenO />
          <QuestionMark />
          {cheekEl}
        </g>
      );
    case 'pleased':
      return (
        <g>
          <EyesArcUp />
          <MouthSmile />
          {cheekEl}
        </g>
      );
    case 'delighted':
      return (
        <g>
          <EyesSparkle />
          <MouthGrin />
          {cheekEl}
        </g>
      );
    case 'confused':
      return (
        <g>
          <BrowsConcerned />
          <EyesDots size={Math.min(8, eyeSize + 1)} />
          <MouthZigzag />
          <SweatDrop />
          {cheekEl}
        </g>
      );
    case 'frustrated':
      return (
        <g>
          <BrowsAngry />
          <EyesDots size={Math.max(3, eyeSize - 1)} />
          <MouthGrimace />
          <AngerMark />
          {cheekEl}
        </g>
      );
    case 'impatient':
      return (
        <g>
          <EyesHalfLid />
          <MouthFlat />
          {cheekEl}
        </g>
      );
  }
}

// ── Costumes ─────────────────────────────────────────────────────────────
function CostumeHardHat() {
  return (
    <g>
      <ellipse cx="100" cy="80" rx="58" ry="9" fill="#E8923A" />
      <path d="M 50 80 Q 50 38 100 38 Q 150 38 150 80 Z" fill="#F4A340" />
      <path d="M 64 70 Q 70 45 100 42" stroke="#FFD49B" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M 100 38 L 100 80" stroke="#C97624" strokeWidth="1.5" opacity="0.5" />
      <circle cx="100" cy="62" r="6" fill="#FFFFFF" stroke="#C97624" strokeWidth="1" />
      <path d="M 96 62 L 99 65 L 104 59" stroke="#C97624" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function CostumeBags() {
  return (
    <g>
      <g transform="translate(28 168)">
        <path d="M 0 0 L 26 0 L 26 32 Q 26 36 22 36 L 4 36 Q 0 36 0 32 Z" fill="#D8A36B" stroke="#8C5A2A" strokeWidth="1.5" />
        <path d="M 6 0 Q 6 -8 13 -8 Q 20 -8 20 0" stroke="#8C5A2A" strokeWidth="1.8" fill="none" />
        <text x="13" y="22" textAnchor="middle" fontFamily="var(--font-display, sans-serif)" fontSize="11" fontWeight="700" fill="#8C5A2A">
          %
        </text>
      </g>
      <g transform="translate(146 168)">
        <path d="M 0 0 L 26 0 L 26 32 Q 26 36 22 36 L 4 36 Q 0 36 0 32 Z" fill="#DC6B5A" stroke="#7A2D22" strokeWidth="1.5" />
        <path d="M 6 0 Q 6 -8 13 -8 Q 20 -8 20 0" stroke="#7A2D22" strokeWidth="1.8" fill="none" />
        <rect x="4" y="6" width="18" height="9" rx="2" fill="#FFF4E0" />
        <text x="13" y="13" textAnchor="middle" fontFamily="var(--font-mono, monospace)" fontSize="6.5" fontWeight="700" fill="#7A2D22">
          SALE
        </text>
      </g>
    </g>
  );
}

function CostumeClipboard() {
  return (
    <g transform="translate(64 162)">
      <rect x="0" y="0" width="72" height="56" rx="3" fill="#F4EEE2" stroke="#3B362B" strokeWidth="1.6" />
      <rect x="26" y="-6" width="20" height="10" rx="2" fill="#8C7A55" stroke="#3B362B" strokeWidth="1.3" />
      <line x1="8" y1="14" x2="64" y2="14" stroke="#A39C8A" strokeWidth="1" />
      <line x1="8" y1="22" x2="58" y2="22" stroke="#A39C8A" strokeWidth="1" />
      <line x1="8" y1="30" x2="64" y2="30" stroke="#A39C8A" strokeWidth="1" />
      <line x1="8" y1="38" x2="50" y2="38" stroke="#A39C8A" strokeWidth="1" />
      <rect x="46" y="38" width="4" height="12" fill="#9CC182" />
      <rect x="52" y="34" width="4" height="16" fill="#DC6B5A" />
      <rect x="58" y="42" width="4" height="8" fill="#F0C557" />
      <text x="8" y="50" fontFamily="var(--font-mono, monospace)" fontSize="6" fill="#3B362B">
        ROI: 3.4×
      </text>
    </g>
  );
}

function CostumeCoffee() {
  return (
    <g>
      <g transform="translate(118 168)">
        <path d="M 0 0 L 28 0 L 25 32 Q 24 36 20 36 L 8 36 Q 4 36 3 32 Z" fill="#FFFFFF" stroke="#3B362B" strokeWidth="1.6" />
        <rect x="-1" y="10" width="30" height="10" fill="#C8956A" stroke="#3B362B" strokeWidth="1.3" />
        <text x="14" y="17.5" textAnchor="middle" fontFamily="var(--font-display, sans-serif)" fontSize="6.5" fontWeight="700" fill="#3B362B">
          TESTBUDS
        </text>
        <path d="M -1 0 L 29 0 L 27 -3 L 1 -3 Z" fill="#3B362B" />
        <ellipse cx="14" cy="-3" rx="3" ry="1.2" fill="#7A4A28" />
        <path d="M 8 -8 Q 6 -14 10 -18 Q 14 -14 12 -8" stroke="#A39C8A" strokeWidth="1.4" fill="none" opacity="0.7" />
        <path d="M 18 -8 Q 16 -14 20 -18 Q 24 -14 22 -8" stroke="#A39C8A" strokeWidth="1.4" fill="none" opacity="0.5" />
      </g>
      <g transform="translate(34 170)">
        <rect x="-9" y="-2" width="18" height="14" rx="3" fill="#1C1A14" stroke="#3B362B" strokeWidth="1" />
        <rect x="-6" y="0" width="12" height="10" rx="1.5" fill="#F4EEE2" />
        <line x1="0" y1="5" x2="0" y2="1.5" stroke="#1C1A14" strokeWidth="1" />
        <line x1="0" y1="5" x2="3" y2="5" stroke="#DC6B5A" strokeWidth="1" />
      </g>
    </g>
  );
}

function CostumeMegaphone() {
  return (
    <g>
      <g transform="translate(86 152)">
        <rect x="0" y="0" width="28" height="20" rx="2" fill="#F4EEE2" stroke="#3B362B" strokeWidth="1.4" />
        <path d="M 0 0 L 14 11 L 28 0" stroke="#3B362B" strokeWidth="1.4" fill="none" />
        <circle cx="24" cy="-2" r="4" fill="#DC6B5A" />
        <text x="24" y="0.5" textAnchor="middle" fontFamily="var(--font-display, sans-serif)" fontSize="5.5" fontWeight="700" fill="#fff">
          1
        </text>
      </g>
      <g transform="translate(154 158) rotate(-30)">
        <rect x="-10" y="-3" width="12" height="6" rx="1" fill="#3B362B" />
        <path d="M 2 -10 L 30 -18 L 30 18 L 2 10 Z" fill="#DC6B5A" stroke="#3B362B" strokeWidth="1.5" strokeLinejoin="round" />
        <ellipse cx="30" cy="0" rx="3" ry="18" fill="#F4EEE2" stroke="#3B362B" strokeWidth="1.3" />
        <rect x="-2" y="3" width="3" height="6" rx="1" fill="#3B362B" />
        <g stroke="#F0C557" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M 40 -10 L 48 -14" />
          <path d="M 42 0 L 52 0" />
          <path d="M 40 10 L 48 14" />
        </g>
      </g>
    </g>
  );
}

function CostumeCards() {
  return (
    <g transform="translate(60 158)">
      <g transform="translate(0 12) rotate(-14)">
        <rect x="0" y="0" width="32" height="46" rx="3" fill="#7AAFCB" stroke="#1C1A14" strokeWidth="1.5" />
        <rect x="4" y="6" width="14" height="3" rx="1" fill="#fff" opacity="0.85" />
        <rect x="4" y="12" width="22" height="2" fill="#fff" opacity="0.5" />
        <rect x="4" y="16" width="18" height="2" fill="#fff" opacity="0.5" />
        <rect x="4" y="34" width="10" height="6" rx="1" fill="#1C1A14" />
      </g>
      <g transform="translate(18 6)">
        <rect x="0" y="0" width="32" height="46" rx="3" fill="#DC6B5A" stroke="#1C1A14" strokeWidth="1.5" />
        <rect x="4" y="6" width="16" height="3" rx="1" fill="#fff" />
        <rect x="4" y="12" width="22" height="2" fill="#fff" opacity="0.6" />
        <rect x="4" y="16" width="14" height="2" fill="#fff" opacity="0.6" />
        <rect x="4" y="34" width="10" height="6" rx="1" fill="#1C1A14" />
      </g>
      <g transform="translate(38 12) rotate(14)">
        <rect x="0" y="0" width="32" height="46" rx="3" fill="#F0C557" stroke="#1C1A14" strokeWidth="1.5" />
        <rect x="4" y="6" width="14" height="3" rx="1" fill="#1C1A14" opacity="0.7" />
        <rect x="4" y="12" width="22" height="2" fill="#1C1A14" opacity="0.35" />
        <rect x="4" y="16" width="18" height="2" fill="#1C1A14" opacity="0.35" />
        <rect x="4" y="34" width="10" height="6" rx="1" fill="#1C1A14" />
      </g>
      <text x="44" y="-4" fontFamily="var(--font-display, sans-serif)" fontSize="22" fontWeight="700" fill="#7A5A8A">
        ?
      </text>
    </g>
  );
}

function CostumeSweatband() {
  return (
    <g>
      <path
        d="M 38 108 Q 100 92 162 108 L 162 120 Q 100 105 38 120 Z"
        fill="#F0C557"
        stroke="#3B362B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M 88 102 L 88 118" stroke="#DC6B5A" strokeWidth="3" />
      <path d="M 112 102 L 112 118" stroke="#DC6B5A" strokeWidth="3" />
      <g transform="translate(146 164)">
        <rect x="-6" y="-2" width="20" height="34" rx="4" fill="#7AAFCB" stroke="#1C1A14" strokeWidth="1.5" />
        <rect x="-3" y="-7" width="14" height="6" rx="1.5" fill="#1C1A14" />
        <rect x="-6" y="14" width="20" height="18" fill="#5499BC" />
        <path d="M -6 14 Q 4 12 14 14" stroke="#A5D2EA" strokeWidth="1.2" fill="none" />
        <rect x="-4" y="6" width="16" height="9" fill="#fff" />
        <text x="4" y="13" textAnchor="middle" fontFamily="var(--font-display, sans-serif)" fontSize="6" fontWeight="700" fill="#1C1A14">
          H₂O
        </text>
      </g>
    </g>
  );
}

function CostumePhone() {
  return (
    <g>
      <g>
        <circle cx="148" cy="58" r="9" fill="#DC6B5A" stroke="#1C1A14" strokeWidth="1.4" />
        <text x="148" y="62" textAnchor="middle" fontFamily="var(--font-display, sans-serif)" fontSize="11" fontWeight="700" fill="#fff">
          3
        </text>
        <circle cx="166" cy="78" r="6" fill="#F0C557" stroke="#1C1A14" strokeWidth="1.2" />
        <circle cx="42" cy="74" r="5" fill="#7AAFCB" stroke="#1C1A14" strokeWidth="1.2" />
      </g>
      <g transform="translate(72 158)">
        <rect x="0" y="0" width="56" height="80" rx="7" fill="#1C1A14" stroke="#3B362B" strokeWidth="1.5" />
        <rect x="3" y="6" width="50" height="62" rx="3" fill="#F4EEE2" />
        <rect x="6" y="9" width="22" height="3" rx="1" fill="#1C1A14" />
        <rect x="6" y="15" width="44" height="14" rx="2" fill="#DBEACA" />
        <rect x="9" y="18" width="14" height="3" rx="1" fill="#5E8848" />
        <rect x="9" y="23" width="22" height="2" fill="#5E8848" opacity="0.5" />
        <rect x="6" y="32" width="44" height="14" rx="2" fill="#F8E4A5" />
        <rect x="9" y="35" width="14" height="3" rx="1" fill="#7A5810" />
        <rect x="9" y="40" width="20" height="2" fill="#7A5810" opacity="0.5" />
        <rect x="6" y="49" width="44" height="14" rx="2" fill="#F2C7BE" />
        <rect x="9" y="52" width="14" height="3" rx="1" fill="#7A2D22" />
        <rect x="20" y="73" width="16" height="2" rx="1" fill="#A39C8A" />
        <ellipse cx="48" cy="46" rx="6" ry="9" fill={TB.bodyLo} />
      </g>
    </g>
  );
}

interface CostumeDef {
  arms: ArmPose;
  hidesSprout: boolean;
  draw: () => ReactElement;
}

const COSTUMES: Record<Costume, CostumeDef> = {
  hardhat: { arms: 'rest', hidesSprout: true, draw: () => <CostumeHardHat /> },
  bags: { arms: 'hold', hidesSprout: false, draw: () => <CostumeBags /> },
  clipboard: { arms: 'hold', hidesSprout: false, draw: () => <CostumeClipboard /> },
  coffee: { arms: 'hold', hidesSprout: false, draw: () => <CostumeCoffee /> },
  megaphone: { arms: 'hold', hidesSprout: false, draw: () => <CostumeMegaphone /> },
  cards: { arms: 'hold', hidesSprout: false, draw: () => <CostumeCards /> },
  sweatband: { arms: 'rest', hidesSprout: false, draw: () => <CostumeSweatband /> },
  phone: { arms: 'hold', hidesSprout: false, draw: () => <CostumePhone /> },
};

export interface TestbudProps {
  expression?: Expression;
  costume?: Costume;
  size?: number;
  style?: CSSProperties;
  title?: string;
  /** Opt-in idle bob + counter-phasing shadow. Reserved for live previews and the active selection. Default: false. */
  animated?: boolean;
}

/**
 * The Testbud mascot. One species, eight costumes, seven expressions.
 *
 * Body, sprout, and arms never change with expression — the expression is
 * carried entirely by eyes + brows + mouth + optional extras (sweat / anger / `?`).
 *
 * The bud has no feet. Pass `animated` to add a continuous idle bob with a
 * counter-phasing ground shadow — reserved for surfaces where the bud is
 * "live" (active selection, narration avatar, run sidebar, hero preview).
 * Everywhere else it renders still so grids and galleries stay calm.
 */
export function Testbud({
  expression = 'neutral',
  costume,
  size = 180,
  style,
  title,
  animated = false,
}: TestbudProps) {
  const c = costume ? COSTUMES[costume] : null;
  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={size}
      style={{ display: 'block', overflow: 'visible', ...style }}
      role="img"
      aria-label={title ?? `Testbud, ${expression}${costume ? `, ${costume}` : ''}`}
    >
      {title && <title>{title}</title>}
      <TBShadow animated={animated} />
      <g>
        {animated && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;0 -6;0 0"
            keyTimes={FLOAT_KEYTIMES}
            dur={FLOAT_DUR}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines={FLOAT_KEYSPLINES}
          />
        )}
        <TBArms pose={c ? c.arms : 'rest'} />
        <TBBody />
        {!(c && c.hidesSprout) && <TBSprout />}
        <Face expression={expression} />
        {c && c.draw()}
      </g>
    </svg>
  );
}
