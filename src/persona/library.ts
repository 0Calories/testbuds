import type { Persona } from './types';

export const personaLibrary: Persona[] = [
  {
    slug: 'skeptical-bargain-hunter',
    segment: 'B2C',
    identity: {
      name: 'Dana Pryce',
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
    behavioralTendencies: 'Hunts for the pricing page first; distrusts superlatives; leaves quickly if value is unclear.',
  },
  {
    slug: 'goal-driven-self-improver',
    segment: 'B2C',
    identity: {
      name: 'Marcus Hale',
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
    behavioralTendencies: 'Reads how-it-works content carefully; tries the core flow; enthusiastic when it fits, disengaged when generic.',
  },
  {
    slug: 'distracted-mobile-browser',
    segment: 'B2C',
    identity: {
      name: 'Priya Anand',
      role: 'Casual visitor with low attention',
      context: 'Glancing at the product between other things, easily distracted.',
    },
    jobToBeDone: 'Decide in seconds whether this is worth any more of my attention.',
    motivations: ['Understand the point immediately', 'Not have to think hard'],
    painPoints: ['Walls of text', 'Unclear value', 'Anything that takes effort to parse'],
    skepticismLevel: 'medium',
    techSavviness: 'low',
    patienceBudget: 'low',
    decisionCriteria: [
      'The core value is clear within the first screen',
      'The next step is obvious',
      'Nothing feels confusing or heavy',
    ],
    behavioralTendencies: 'Skims headlines only; never scrolls far; bails the moment anything is unclear.',
  },
  {
    slug: 'time-poor-evaluator',
    segment: 'B2B',
    identity: {
      name: 'Sam Okafor',
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
    behavioralTendencies: 'Scans for fit and proof; impatient with gated content; decides fast.',
  },
  {
    slug: 'technical-gatekeeper-cto',
    segment: 'B2B',
    identity: {
      name: 'Lena Vásquez',
      role: 'CTO assessing a tool for the engineering org',
      context: 'Scrutinising whether a tool is safe and sound enough to adopt.',
    },
    jobToBeDone: 'Decide whether this tool is technically credible and safe to adopt.',
    motivations: ['Protect the org from risky tools', 'Adopt things that scale and integrate cleanly'],
    painPoints: ['Missing security information', 'No real documentation', 'Hand-wavy technical claims'],
    skepticismLevel: 'high',
    techSavviness: 'high',
    patienceBudget: 'medium',
    decisionCriteria: [
      'Security and data handling are addressed',
      'Integrations and docs are real and discoverable',
      'Technical claims are specific, not marketing fluff',
    ],
    behavioralTendencies: 'Seeks docs, security, and integration pages; probes specifics; unimpressed by vague claims.',
  },
  {
    slug: 'roi-driven-buyer',
    segment: 'B2B',
    identity: {
      name: 'Tom Reilly',
      role: 'Department lead who owns a budget',
      context: 'Needs to justify any purchase with hard numbers.',
    },
    jobToBeDone: 'Decide whether this tool delivers a return worth the spend.',
    motivations: ['Show measurable impact', 'Defend the spend to finance'],
    painPoints: ['No pricing', 'No case studies or metrics', 'Benefits stated without evidence'],
    skepticismLevel: 'high',
    techSavviness: 'medium',
    patienceBudget: 'medium',
    decisionCriteria: [
      'Pricing is discoverable',
      'There are concrete outcomes, metrics, or case studies',
      'The value clearly outweighs the cost',
    ],
    behavioralTendencies: 'Looks for pricing and proof of outcomes; quotes numbers back; rejects vague value props.',
  },
];

export function getPersona(slug: string): Persona | undefined {
  return personaLibrary.find((p) => p.slug === slug);
}
