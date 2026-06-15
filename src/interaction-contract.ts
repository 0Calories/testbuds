/**
 * The Interaction boundary contract (see ARCHITECTURE.md).
 *
 * Everything crossing this boundary is Surface-neutral: web concepts
 * (DOM, CSS selectors, URLs) must never appear in these types.
 */

export type Confidence = 'low' | 'medium' | 'high';

/** What a Bud is allowed to perceive — the strongest behavioral lever. */
export type PerceptionMode = 'a11y' | 'vision' | 'hybrid';

/** The lens a Run applies to a Flow Spec. v1 ships Persona mode. */
export type Mode = 'persona' | 'assertion';

/**
 * The resolved, declarative, Surface-neutral policy a Bud runs under.
 * Carried as data across the boundary — never adapter code.
 */
export interface BudConfig {
	perceptionMode: PerceptionMode;
	/** Patience/step budget hard-capping a Run. */
	stepBudget?: number;
	dispositionPrompt?: string;
}

/** Normalized perceived element — ARIA-like, the cross-platform a11y model. */
export interface PerceivedElement {
	/** Adapter-assigned id, NOT a CSS selector. */
	id: string;
	/** ARIA-like role: button | link | textfield | checkbox | heading | … */
	role: string;
	name?: string;
	value?: string;
	state?: {
		disabled?: boolean;
		focused?: boolean;
		checked?: boolean;
		expanded?: boolean;
		hidden?: boolean;
	};
	text?: string;
}

/** Normalized action — 'point' is a click on web, a tap on mobile. */
export interface NormalizedAction {
	type:
		| 'point'
		| 'input'
		| 'scroll'
		| 'gesture'
		| 'key'
		| 'navigate'
		| 'wait'
		| 'finish';
	targetId?: string;
	value?: string;
	reason: string;
}

/** Grounded evidence event taxonomy — what Findings are built from. */
export type MechanicalKind =
	| 'deviation'
	| 'backtrack'
	| 'repeat_attempt'
	| 'search_thrash'
	| 'perception_miss'
	| 'stuck'
	| 'budget_exceeded'
	| 'error_state'
	| 'gave_up'
	| 'goal_achieved';

/** The live event stream an Interaction adapter emits during a Run. */
export type RunEvent =
	| {
			type: 'perceived';
			stepRef: number;
			elements: PerceivedElement[];
			screenshotRef?: string;
	  }
	| {
			type: 'intent';
			stepRef: number;
			rationale: string;
			action: NormalizedAction;
	  }
	| { type: 'action'; stepRef: number; action: NormalizedAction }
	| {
			type: 'outcome';
			stepRef: number;
			success: boolean;
			latencyMs?: number;
			changed?: string;
	  }
	| {
			type: 'mechanical';
			stepRef: number;
			kind: MechanicalKind;
			confidence: Confidence;
			perceivedRef?: string;
			detail?: string;
	  }
	| {
			type: 'reaction';
			stepRef: number;
			utterance: string;
			expression: string;
			cause?: MechanicalKind;
	  }
	| {
			type: 'milestone';
			stepRef: number;
			kind: 'hint_reached' | 'deviated' | 'goal_achieved';
			detail?: string;
	  };

export type MechanicalEvent = Extract<RunEvent, { type: 'mechanical' }>;

/** Final run result an adapter reports after the event stream ends. */
export interface RunResult {
	outcome: 'achieved' | 'partial' | 'failed';
	traceRef?: string;
}

export type Surface = 'web' | 'mobile-native' | 'desktop';

/**
 * What an adapter can do — lets the Orchestrator validate a Bud config
 * before a Run and fail loudly rather than silently degrade.
 */
export interface Capabilities {
	surface: Surface;
	perceptionModes: PerceptionMode[];
	inputs: NormalizedAction['type'][];
	canScreenshot: boolean;
	liveView: boolean;
}

/** A plain-language Flow: a goal plus optional soft step-hints. */
export interface FlowSpec {
	goal: string;
	hints?: string[];
}

/**
 * Opaque, surface-tagged handle to the thing under test. Only the
 * matching adapter interprets `entry` and `auth`.
 */
export interface TargetHandle {
	surface: Surface;
	entry: string;
	auth?: unknown;
}

export interface RunInvocation {
	budConfig: BudConfig;
	flowSpec: FlowSpec;
	mode: Mode;
	target: TargetHandle;
}

/** A Run in flight: the live event stream plus the final result. */
export interface InteractionRun {
	events: AsyncIterable<RunEvent>;
	result: Promise<RunResult>;
}

export interface InteractionAdapter {
	readonly capabilities: Capabilities;
	interact(invocation: RunInvocation): InteractionRun;
}
