/**
 * Simple token estimator for Stage 1 (F037).
 *
 * Note: Accurate tokenization (tiktoken/HF) is planned for Stage 3 (F049).
 * For beta, we use a lightweight approximation based on character length.
 */

export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Approximate 1 token ≈ 4 characters (rough heuristic for GPT-like models)
  return Math.ceil(text.length / 4);
}
