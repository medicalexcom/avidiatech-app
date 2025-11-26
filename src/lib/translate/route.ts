import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { translateProduct } from "@/lib/translate/translateProduct";
import { SUPPORTED_LANGUAGES } from "@/lib/translate/languageMap";

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth() as any;
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const productId = body?.productId;
    const languages: string[] = Array.isArray(body?.languages) ? body.languages : [];
    const fields: string[] = Array.isArray(body?.fields) ? body.fields : [];

    if (!productId) return NextResponse.json({ error: "missing productId" }, { status: 400 });
    if (!languages || languages.length === 0) return NextResponse.json({ error: "missing languages" }, { status: 400 });
    if (!fields || fields.length === 0) return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const supportedCodes = new Set(SUPPORTED_LANGUAGES.map((s) => s.code));
    for (const l of languages) {
      if (!supportedCodes.has(l)) {
        return NextResponse.json({ error: `unsupported language: ${l}` }, { status: 400 });
      }
    }

    const supabase = getServiceSupabaseClient();
    const { data: productRow, error: prodErr } = await supabase
      .from("product_ingestions")
      .select("id, tenant_id, normalized_payload, source_url")
      .eq("id", productId)
      .single();

    if (prodErr || !productRow) {
      return NextResponse.json({ error: "product_not_found", detail: prodErr?.message || null }, { status: 404 });
    }

    const productJson = productRow.normalized_payload || {};
    const translations = await translateProduct(productJson, languages, fields);

    const inserts: any[] = [];
    for (const lang of Object.keys(translations)) {
      inserts.push({
        tenant_id: productRow.tenant_id || null,
        product_id: productId,
        language: lang,
        name: translations[lang].name ?? null,
        description_html: translations[lang].description_html ?? null,
        features: translations[lang].features ?? null,
        specs: translations[lang].specs ?? null,
        metadata: translations[lang].metadata ?? null
      });
    }

    if (inserts.length > 0) {
      const { data: insData, error: insErr } = await supabase.from("product_translations").insert(inserts).select();
      if (insErr) {
        await supabase
          .from("product_ingestions")
          .update({ diagnostics: { translate_insert_error: insErr.message || String(insErr) } })
          .eq("id", productId);
        return NextResponse.json({ error: "db_insert_failed", detail: insErr.message || String(insErr) }, { status: 500 });
      }
    }

    return NextResponse.json({ translations }, { status: 200 });
  } catch (err: any) {
    console.error("translate route error", err);
    return NextResponse.json({ error: err?.message || "internal_error" }, { status: 500 });
  }
}
