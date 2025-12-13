import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "pipeline-outputs";

type ModuleStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    // Require exact service role key as Bearer token (server triggers this)
    const auth = req.headers.get("authorization") ?? "";
    const incoming = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!incoming || !serviceKey || incoming !== serviceKey) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const { pipelineRunId } = await req.json().catch(() => ({}));
    if (!pipelineRunId) {
      return new Response(JSON.stringify({ error: "missing_pipelineRunId" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    if (!supabaseUrl) {
      return new Response(JSON.stringify({ error: "missing_SUPABASE_URL" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Mark pipeline running (set started_at once)
    const now = new Date().toISOString();
    await supabase
      .from("pipeline_runs")
      .update({ status: "running", started_at: now })
      .eq("id", pipelineRunId)
      .is("started_at", null);

    await supabase.from("pipeline_runs").update({ status: "running" }).eq("id", pipelineRunId);

    // Load module runs
    const { data: modules, error: modErr } = await supabase
      .from("module_runs")
      .select("*")
      .eq("pipeline_run_id", pipelineRunId)
      .order("module_index", { ascending: true });

    if (modErr) throw modErr;

    for (const m of modules ?? []) {
      const moduleId = m.id as string;
      const moduleName = m.module_name as string;
      const moduleIndex = m.module_index as number;

      await supabase
        .from("module_runs")
        .update({ status: "running" satisfies ModuleStatus, started_at: new Date().toISOString() })
        .eq("id", moduleId);

      try {
        await sleep(150);

        const key = `${pipelineRunId}/${moduleIndex}-${moduleName}.json`;
        const payload = {
          pipelineRunId,
          module: { name: moduleName, index: moduleIndex },
          generatedAt: new Date().toISOString(),
          note: "placeholder output from pipeline-runner",
        };

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(
            key,
            new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
            { upsert: true, contentType: "application/json" },
          );

        if (uploadErr) throw uploadErr;

        await supabase
          .from("module_runs")
          .update({
            status: "succeeded" satisfies ModuleStatus,
            finished_at: new Date().toISOString(),
            output_ref: key,
            error: null,
          })
          .eq("id", moduleId);
      } catch (e) {
        await supabase
          .from("module_runs")
          .update({
            status: "failed" satisfies ModuleStatus,
            finished_at: new Date().toISOString(),
            error: { message: String(e), module: moduleName },
          })
          .eq("id", moduleId);

        await supabase
          .from("pipeline_runs")
          .update({ status: "failed", finished_at: new Date().toISOString() })
          .eq("id", pipelineRunId);

        return new Response(JSON.stringify({ ok: false, pipelineRunId, failedModule: moduleName }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    }

    await supabase
      .from("pipeline_runs")
      .update({ status: "succeeded", finished_at: new Date().toISOString() })
      .eq("id", pipelineRunId);

    return new Response(JSON.stringify({ ok: true, pipelineRunId }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "unexpected", details: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
