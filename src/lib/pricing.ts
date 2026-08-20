/** gpt-4o-mini list prices (USD per 1M tokens). */
export const GPT_4O_MINI_INPUT_PER_MILLION = 0.15;
export const GPT_4O_MINI_OUTPUT_PER_MILLION = 0.6;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CompletionUsage extends TokenUsage {
  costUsd: number;
}

export function estimateCostUsd(usage: TokenUsage): number {
  const input =
    (usage.inputTokens / 1_000_000) * GPT_4O_MINI_INPUT_PER_MILLION;
  const output =
    (usage.outputTokens / 1_000_000) * GPT_4O_MINI_OUTPUT_PER_MILLION;
  return input + output;
}

export function toCompletionUsage(usage: TokenUsage): CompletionUsage {
  return {
    ...usage,
    costUsd: estimateCostUsd(usage),
  };
}

/** Compact USD for the overlay, e.g. ≈ $0.0007 */
export function formatCostHint(costUsd: number): string {
  return `≈ ${formatUsd(costUsd)}`;
}

export function formatUsd(costUsd: number): string {
  if (costUsd <= 0) return "$0";
  if (costUsd < 0.01) return `$${costUsd.toFixed(4)}`;
  if (costUsd < 1) return `$${costUsd.toFixed(4)}`;
  return `$${costUsd.toFixed(3)}`;
}

/** Fallback when the API omits a usage object. */
export function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
