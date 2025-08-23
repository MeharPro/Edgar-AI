export type Plan = "starter" | "pro" | "max";

export const PLAN_LIMITS: Record<Plan, number | "infinite"> = {
  starter: 5_000, // Free → 5K tokens per billing cycle
  pro: 10_000_000, // $20 → 10M tokens per billing cycle
  max: "infinite", // $100 → infinite tokens
};

export function approximateTokensFromText(text: string): number {
  // Rough heuristic ~ 4 chars per token
  return Math.ceil(text.length / 4);
}

type ChatMessage = { role: string; content: string | { [key: string]: unknown } };

export function approximateTokensFromMessages(messages: ChatMessage[]): number {
  const text = messages
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join("\n");
  return approximateTokensFromText(text);
}


