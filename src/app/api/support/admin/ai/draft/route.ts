import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

/**
 * POST /api/support/admin/ai/draft
 * Body: { threadId, promptOverrides? }
 * Returns: { draft: string }
 *
 * Requires process.env.AI_API_KEY and provider. If not present returns 501.
 */
export async function POST(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServerSupabase();
    const { data: agentCheck } = await supabase.rpc("is_support_agent", { user_id: userId });
    if (!agentCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { threadId, promptOverrides } = body;
    if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 });

    if (!process.env.AI_API_KEY) {
      return NextResponse.json({ error: "AI provider not configured" }, { status: 501 });
    }

    // Fetch last N messages for thread context
    const { data: messages } = await supabase.from("chat_messages").select("content, sender_role, created_at").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(12);

    const contextText = (messages || []).reverse().map((m: any) => `${m.sender_role}: ${m.content}`).join("\n");

    // Small OpenAI-compatible call (example); adapt to your provider
    const prompt = `You are a helpful support agent. Based on the conversation context, draft a concise helpful reply to resolve the user's issue.\n\nContext:\n${contextText}\n\nDraft:`;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // change to your default model
        messages: [{ role: "system", content: "You are AvidiaTech support assistant." }, { role: "user", content: prompt }],
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI provider error:", res.status, text);
      return NextResponse.json({ error: "AI provider error", details: text }, { status: 502 });
    }

    const payload = await res.json();
    const draft = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text ?? "";

    return NextResponse.json({ draft });
  } catch (err: any) {
    console.error("AI draft error:", err);
    return NextResponse.json({ error: "Internal server error", details: String(err?.message ?? err) }, { status: 500 });
  }
}
