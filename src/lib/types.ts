/** Supported OpenAI chat models for the MVP. */
export type OpenAIModel = "gpt-4o-mini" | "gpt-4o";

export type ThemePreference = "dark" | "light";

export interface Settings {
  openaiApiKey: string;
  model: OpenAIModel;
  theme: ThemePreference;
}

/** Completed Q&A turns sent with a follow-up so the model keeps the thread. */
export interface FollowUpHistoryItem {
  question: string;
  answer: string;
}

/** Soft cap so the overlay stays a mini-chat, not a full assistant. */
export const MAX_FOLLOW_UPS = 6;

/** Structured explanation returned by the model (or a UI preview). */
export interface Explanation {
  term: string;
  definition: string;
  explanation: string;
  analogy: string;
}

export interface FollowUpTurn {
  id: string;
  question: string;
  answer: string;
  pending: boolean;
}

export interface ExplainPayload {
  term: string;
  context: string;
  pageTitle: string;
  pageUrl: string;
}

export interface ExplainSuccess {
  ok: true;
  data: Explanation;
}

export interface ExplainFailure {
  ok: false;
  code: ExplainErrorCode;
  message: string;
}

export type ExplainResult = ExplainSuccess | ExplainFailure;

export type ExplainErrorCode =
  | "NO_API_KEY"
  | "INVALID_KEY"
  | "RATE_LIMIT"
  | "QUOTA"
  | "NETWORK"
  | "TIMEOUT"
  | "BAD_RESPONSE"
  | "UNKNOWN";

export interface Point {
  top: number;
  left: number;
}

/** Viewport-relative box copied off a DOMRect so it can live in React state. */
export interface AnchorRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface OverlayPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  side: "above" | "below" | "start" | "end";
}

export interface SelectionSnapshot {
  term: string;
  context: string;
  /** Cloned range so we can remeasure after scroll without the live Selection. */
  range: Range;
  /** Last visual line — used to park the Explain chip. */
  endRect: AnchorRect;
  /** Full selection bounds — used to park the panel. */
  bounds: AnchorRect;
  /** Set when the highlight lives in a same-origin iframe. */
  frame?: HTMLIFrameElement;
}
