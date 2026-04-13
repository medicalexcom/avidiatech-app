import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are the AvidiaTech AI Assistant — a knowledgeable, concise helper embedded inside the AvidiaTech product data automation platform.

AvidiaTech helps eCommerce stores automate product data: extracting structured data from manufacturer URLs (AvidiaExtract), generating SEO-optimized descriptions (AvidiaDescribe + AvidiaSEO), monitoring product pages for changes, bulk-processing catalogs, importing via CSV/connectors, and exporting to Shopify/BigCommerce/WooCommerce.

You help users:
- Troubleshoot why audits failed or scored low
- Improve SEO title/description quality
- Understand the pipeline stages and what each module does
- Navigate the dashboard features
- Set up monitor watches, bulk jobs, and imports
- Interpret ingestion results, error codes, and field-level diagnostics
- Best practices for medical, industrial, and technical catalogs

Be direct, actionable, and specific. If you don't know something, say so. Keep responses under 250 words unless depth is clearly needed.`;

export async function POST(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    // Validate message shapes
    const cleaned = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12); // keep last 12 turns max

    if (cleaned.length === 0) {
      return NextResponse.json({ error: "No valid messages" }, { status: 400 });
    }

    // Optionally enrich with recent tenant activity for context
    let contextNote = "";
    try {
      const supabase = getServerSupabase();
      const [ingestions, pipelineRuns] = await Promise.all([
        supabase.from("product_ingestions").select("status, export_type, created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("pipeline_runs").select("status, created_at").order("created_at", { ascending: false }).limit(3),
      ]);

      const recentIngestions = ingestions.data ?? [];
      const recentPipelines = pipelineRuns.data ?? [];

      if (recentIngestions.length > 0 || recentPipelines.length > 0) {
        const lines: string[] = [];
        if (recentIngestions.length > 0) {
          lines.push(`Recent ingestions: ${recentIngestions.map((i: any) => `${i.export_type ?? "unknown"} (${i.status})`).join(", ")}`);
        }
        if (recentPipelines.length > 0) {
          lines.push(`Recent pipeline runs: ${recentPipelines.map((p: any) => p.status).join(", ")}`);
        }
        contextNote = `\n\nUser's recent activity:\n${lines.join("\n")}`;
      }
    } catch (e) {
      // Non-critical — continue without context enrichment
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
      // Graceful fallback when AI not configured — return a helpful static response
      const lastUserMsg = [...cleaned].reverse().find((m: any) => m.role === "user")?.content ?? "";
      return NextResponse.json({
        reply: `I can see you asked: "${lastUserMsg}"\n\nThe AI assistant requires an OpenAI API key to be configured (OPENAI_API_KEY env var). Once configured, I'll be able to provide real-time, context-aware answers about your catalog, pipeline, audits, and SEO settings.`,
      });
    }

    const payload = {
      model: process.env.ASSISTANT_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + contextNote },
        ...cleaned,
      ],
      max_tokens: 600,
      temperature: 0.5,
    };

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      console.error("OpenAI error:", aiRes.status, errText);
      return NextResponse.json({ error: "AI provider returned an error. Please try again." }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const reply = aiData?.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Assistant route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
