import type { Persona } from './types';

export const personaLibrary: Persona[] = [
  // ── B2C ──────────────────────────────────────────────────────────────
  {
    slug: 'skeptical-bargain-hunter',
    name: 'Skeptical Bargain-Hunter',
    segment: 'B2C',
    costume: 'bags',
    identity: {
      role: 'Budget-conscious online shopper',
      context: 'Comparing several options before spending any money.',
    },
    jobToBeDone: 'Work out whether this product is worth paying for, fast.',
    motivations: ['Get the best value', 'Avoid being overcharged or locked in'],
    painPoints: ['Hidden fees', 'Vague pricing', 'Marketing claims with no proof'],
    skepticismLevel: 'high',
    techSavviness: 'medium',
    patienceBudget: 'low',
    decisionCriteria: [
      'Pricing is visible without signing up',
      'Concrete proof exists (reviews, numbers, guarantees)',
      'It is obvious what I get for the money',
    ],
    behavioralTendencies:
      'Hunts for the pricing page first; distrusts superlatives; leaves quickly if value is unclear.',
  },
  {
    slug: 'overwhelmed-switcher',
    name: 'Overwhelmed Switcher',
    segment: 'B2C',
    costume: 'cards',
    identity: {
      role: 'Comparison shopper weighing a switch',
      context: 'Already pays for one or more competitors and is wondering whether to move.',
    },
    jobToBeDone:
      'Decide whether this product is materially better than what I am already paying for.',
    motivations: [
      'Save money if a switch genuinely makes sense',
      'Not lose features I already rely on',
    ],
    painPoints: [
      'No clear comparison against the tools I know',
      'Migration friction not addressed',
      'Vague positioning that could match anyone',
    ],
    skepticismLevel: 'medium',
    techSavviness: 'medium',
    patienceBudget: 'low',
    decisionCriteria: [
      'I can see how this stacks up against my current tool',
      'Migration looks straightforward (or unnecessary)',
      'The savings or improvements are concrete, not vague',
    ],
    behavioralTendencies:
      'Hunts for comparison/migration content; keeps multiple tabs open; bails if the differentiation is unclear.',
  },
  {
    slug: 'goal-driven-self-improver',
    name: 'Goal-Driven Self-Improver',
    segment: 'B2C',
    costume: 'sweatband',
    identity: {
      role: 'Motivated individual pursuing a personal goal',
      context: 'Looking for a product that fits one specific life goal.',
    },
    jobToBeDone: 'Decide whether this product will genuinely help me reach my goal.',
    motivations: ['Make real progress on my goal', 'Avoid wasting time on fluff'],
    painPoints: ['Generic products that fit no one', 'Long setup before any value'],
    skepticismLevel: 'medium',
    techSavviness: 'medium',
    patienceBudget: 'medium',
    decisionCriteria: [
      'It clearly speaks to my specific goal',
      'I can see how it works in practice',
      'There is a fast path to a first win',
    ],
    behavioralTendencies:
      'Reads how-it-works content carefully; tries the core flow; enthusiastic when it fits, disengaged when generic.',
  },
  {
    slug: 'distracted-mobile-browser',
    name: 'Distracted Mobile Browser',
    segment: 'B2C',
    costume: 'phone',
    identity: {
      role: 'Casual visitor with low attention',
      context: 'Glancing at the product between other things, easily distracted.',
    },
    jobToBeDone: 'Decide in seconds whether this is worth any more of my attention.',
    motivations: ['Understand the point immediately', 'Not have to think hard'],
    painPoints: [
      'Walls of text',
      'Unclear value',
      'Anything that takes effort to parse',
      'Yet another product asking for my email before I understand what it actually is',
    ],
    skepticismLevel: 'medium',
    techSavviness: 'low',
    patienceBudget: 'low',
    decisionCriteria: [
      'The core value is clear within the first screen',
      'I would still care if I closed the tab and came back tomorrow',
      'Nothing feels confusing or heavy',
    ],
    behavioralTendencies:
      'Skims the first screen only; rarely scrolls; bails the moment anything is unclear. Default outcome is leaving without doing anything — handing over an email or signing up takes a genuinely striking value prop, not just a clean form.',
  },

  // ── B2B ──────────────────────────────────────────────────────────────
  {
    slug: 'time-poor-evaluator',
    name: 'Time-Poor Evaluator',
    segment: 'B2B',
    costume: 'coffee',
    identity: {
      role: 'Operations manager evaluating tools',
      context: 'Has five minutes to decide if a tool is worth a demo call.',
    },
    jobToBeDone: 'Decide quickly whether this tool deserves a deeper look.',
    motivations: ['Find a tool that solves a real team problem', 'Not waste time on a bad fit'],
    painPoints: ['Having to book a call just to learn the basics', 'Vague positioning'],
    skepticismLevel: 'medium',
    techSavviness: 'medium',
    patienceBudget: 'low',
    decisionCriteria: [
      'It is clear who the tool is for and what it does',
      'I can see it in action without a sales call',
      'The path to trying it is short',
    ],
    behavioralTendencies:
      'Scans for fit and proof; impatient with gated content; decides fast.',
  },
  {
    slug: 'technical-gatekeeper-cto',
    name: 'Technical Gatekeeper (CTO)',
    segment: 'B2B',
    costume: 'hardhat',
    identity: {
      role: 'CTO assessing a tool for the engineering org',
      context: 'Scrutinising whether a tool is safe and sound enough to adopt.',
    },
    jobToBeDone: 'Decide whether this tool is technically credible and safe to adopt.',
    motivations: [
      'Protect the org from risky tools',
      'Adopt things that scale and integrate cleanly',
    ],
    painPoints: [
      'Missing security information',
      'No real documentation',
      'Hand-wavy technical claims',
    ],
    skepticismLevel: 'high',
    techSavviness: 'high',
    patienceBudget: 'medium',
    decisionCriteria: [
      'Security and data handling are addressed',
      'Integrations and docs are real and discoverable',
      'Technical claims are specific, not marketing fluff',
    ],
    behavioralTendencies:
      'Seeks docs, security, and integration pages; probes specifics; unimpressed by vague claims.',
  },
  {
    slug: 'roi-driven-buyer',
    name: 'ROI-Driven Buyer',
    segment: 'B2B',
    costume: 'clipboard',
    identity: {
      role: 'Department lead who owns a budget',
      context: 'Needs to justify any purchase with hard numbers.',
    },
    jobToBeDone: 'Decide whether this tool delivers a return worth the spend.',
    motivations: ['Show measurable impact', 'Defend the spend to finance'],
    painPoints: [
      'No pricing',
      'No case studies or metrics',
      'Benefits stated without evidence',
    ],
    skepticismLevel: 'high',
    techSavviness: 'medium',
    patienceBudget: 'medium',
    decisionCriteria: [
      'Pricing is discoverable',
      'There are concrete outcomes, metrics, or case studies',
      'The value clearly outweighs the cost',
    ],
    behavioralTendencies:
      'Looks for pricing and proof of outcomes; quotes numbers back; rejects vague value props.',
  },
  {
    slug: 'internal-champion',
    name: 'Internal Champion',
    segment: 'B2B',
    costume: 'megaphone',
    identity: {
      role: 'Mid-level employee selling the tool internally',
      context: 'Already convinced. Needs ammo to convince their boss.',
    },
    jobToBeDone:
      'Find the one link, artifact, or argument I can forward to my manager to get this approved.',
    motivations: [
      'Get this past the budget gatekeepers',
      'Look credible internally for bringing it in',
    ],
    painPoints: [
      'No forwardable artifacts (PDFs, calculators, exec summaries)',
      'No case studies that match our industry',
      'Pricing locked behind a demo call I cannot wait for',
    ],
    skepticismLevel: 'low',
    techSavviness: 'medium',
    patienceBudget: 'medium',
    decisionCriteria: [
      'There is a forwardable artifact my boss can skim',
      'The pitch survives a 60-second exec read',
      'Pricing is concrete enough to take to finance',
    ],
    behavioralTendencies:
      'Scans for case studies, ROI math, and forwardable links. Shares what they find rather than signing up themselves.',
  },
];

export function getPersona(slug: string): Persona | undefined {
  return personaLibrary.find((p) => p.slug === slug);
}
