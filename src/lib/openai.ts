// src/lib/openai.ts

// Minimal OpenAI chat wrapper using fetch. Adjust to your OpenAI client if needed.
export async function callOpenaiChat(opts: {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  max_tokens?: number;
}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const body = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.max_tokens ?? 1200,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }
  return res.json() as Promise<{
    id: string;
    choices: { message: { role: string; content: string } }[];
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    [k: string]: any;
  }>;
}

// Helper to safely read the assistant content
export function extractAssistantContent(resp: any): string {
  return resp?.choices?.[0]?.message?.content ?? "";
}

// Compatibility alias for legacy imports: `import { openai } from "@/lib/openai"`
export { callOpenaiChat as openai };
