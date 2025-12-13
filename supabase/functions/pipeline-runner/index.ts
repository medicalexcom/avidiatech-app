import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "pipeline-outputs";
type ModuleStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

async function uploadJson(supabase: any, key: string, payload: any) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(
      key,
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      {
        upsert: true,
        contentType: "application/json",
      }
    );
  if (error) throw error;
}

function skipReasonPayload(reason: string, details?: any) {
  return {
    skipped: true,
    reason,
    details: details ?? null,
  };
}

Deno.serve(async (req) => {
  try {
    // Ensure caller is server-side (service role)
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

    const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "");
    const internalSecret = Deno.env.get("PIPELINE_INTERNAL_SECRET") ?? "";
    if (!appUrl || !internalSecret) {
      return new Response(
        JSON.stringify({ error: "missing_APP_URL_or_PIPELINE_INTERNAL_SECRET" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Mark pipeline running
    const now = new Date().toISOString();
    await supabase
      .from("pipeline_runs")
      .update({ status: "running", started_at: now })
      .eq("id", pipelineRunId)
      .is("started_at", null);

    await supabase.from("pipeline_runs").update({ status: "running" }).eq("id", pipelineRunId);

    // Load run metadata for ingestionId/options/steps
    const { data: runRow, error: runErr } = await supabase
      .from("pipeline_runs")
      .select("id, metadata")
      .eq("id", pipelineRunId)
      .maybeSingle();

    if (runErr) throw runErr;
    if (!runRow) throw new Error("pipeline_run_not_found");

    const payload = (runRow?.metadata as any)?.payload ?? {};
    const ingestionId = payload?.ingestionId ?? null;
    const options = payload?.options ?? {};
    const requestedSteps: string[] = Array.isArray(payload?.steps) ? payload.steps : [];

    // Load module runs
    const { data: modules, error: modErr } = await supabase
      .from("module_runs")
      .select("*")
      .eq("pipeline_run_id", pipelineRunId)
      .order("module_index", { ascending: true });

    if (modErr) throw modErr;

    const stepSet = new Set(
      requestedSteps.length ? requestedSteps : (modules ?? []).map((m: any) => m.module_name)
    );

    // Soft gate flags
    let auditPassedOrNotRun = true;
    let auditFailureDetails: any = null;

    for (const m of modules ?? []) {
      const moduleId = m.id as string;
      const moduleName = m.module_name as string;
      const moduleIndex = m.module_index as number;

      if (!stepSet.has(moduleName)) {
        await supabase
          .from("module_runs")
          .update({ status: "skipped" satisfies ModuleStatus, finished_at: new Date().toISOString() })
          .eq("id", moduleId);
        continue;
      }

      // Soft gate policy:
      // If audit failed, automatically skip import/monitor/price (and anything after audit you choose later).
      const shouldSkipDueToAudit =
        auditPassedOrNotRun === false && ["import", "monitor", "price"].includes(moduleName);

      if (shouldSkipDueToAudit) {
        const key = `${pipelineRunId}/${moduleIndex}-${moduleName}.json`;

        await uploadJson(supabase, key, {
          pipelineRunId,
          ingestionId: ingestionId ?? null,
          module: { name: moduleName, index: moduleIndex },
          generatedAt: new Date().toISOString(),
          ...skipReasonPayload("skipped_due_to_audit_fail", {
            audit: auditFailureDetails,
          }),
        });

        await supabase
          .from("module_runs")
          .update({
            status: "skipped" satisfies ModuleStatus,
            finished_at: new Date().toISOString(),
            output_ref: key,
            error: { message: "skipped_due_to_audit_fail", audit: auditFailureDetails },
          })
          .eq("id", moduleId);

        continue;
      }

      await supabase
        .from("module_runs")
        .update({
          status: "running" satisfies ModuleStatus,
          started_at: new Date().toISOString(),
          input_ref: ingestionId ? String(ingestionId) : null,
        })
        .eq("id", moduleId);

      try {
        const key = `${pipelineRunId}/${moduleIndex}-${moduleName}.json`;

        if (moduleName === "extract") {
          if (!ingestionId) throw new Error("missing_ingestionId_for_extract");

          const { data: ing, error: ingErr } = await supabase
            .from("product_ingestions")
            .select(
              "id, tenant_id, source_url, status, normalized_payload, diagnostics, created_at, updated_at"
            )
            .eq("id", ingestionId)
            .maybeSingle();

          if (ingErr) throw ingErr;
          if (!ing) throw new Error("ingestion_not_found");

          await uploadJson(supabase, key, {
            pipelineRunId,
            ingestionId,
            module: { name: moduleName, index: moduleIndex },
            generatedAt: new Date().toISOString(),
            extract: ing,
          });

          await supabase
            .from("module_runs")
            .update({
              status: "succeeded" satisfies ModuleStatus,
              finished_at: new Date().toISOString(),
              output_ref: key,
              error: null,
            })
            .eq("id", moduleId);

          continue;
        }

        if (moduleName === "seo") {
          if (!ingestionId) throw new Error("missing_ingestionId_for_seo");

          const resp = await fetch(`${appUrl}/api/v1/pipeline/internal/seo`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-pipeline-secret": internalSecret,
            },
            body: JSON.stringify({ ingestionId, options: options?.seo ?? null }),
          });

          const text = await resp.text().catch(() => "");
          let json: any;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = { raw: text };
          }

          await uploadJson(supabase, key, {
            pipelineRunId,
            ingestionId,
            module: { name: moduleName, index: moduleIndex },
            generatedAt: new Date().toISOString(),
            http: { status: resp.status },
            seo: json,
          });

          if (!resp.ok) {
            throw new Error(`seo_internal_http_${resp.status}`);
          }

          await supabase
            .from("module_runs")
            .update({
              status: "succeeded" satisfies ModuleStatus,
              finished_at: new Date().toISOString(),
              output_ref: key,
              error: null,
            })
            .eq("id", moduleId);

          continue;
        }

        if (moduleName === "audit") {
          if (!ingestionId) throw new Error("missing_ingestionId_for_audit");

          const resp = await fetch(`${appUrl}/api/v1/pipeline/internal/audit`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-pipeline-secret": internalSecret,
            },
            body: JSON.stringify({ ingestionId, options: options?.audit ?? null }),
          });

          const text = await resp.text().catch(() => "");
          let json: any;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = { raw: text };
          }

          await uploadJson(supabase, key, {
            pipelineRunId,
            ingestionId,
            module: { name: moduleName, index: moduleIndex },
            generatedAt: new Date().toISOString(),
            http: { status: resp.status },
            audit: json,
          });

          if (!resp.ok) {
            throw new Error(`audit_internal_http_${resp.status}`);
          }

          const auditOk = Boolean(json?.audit?.ok ?? json?.ok);
          if (!auditOk) {
            // Soft gate: DO NOT fail the runner immediately. Record the failure and continue,
            // but downstream import/monitor/price will be skipped.
            auditPassedOrNotRun = false;
            auditFailureDetails = {
              score: json?.audit?.score ?? json?.score ?? null,
              blockers: json?.audit?.blockers ?? [],
              warnings: json?.audit?.warnings ?? [],
              summary: json?.audit?.summary ?? null,
            };

            // Mark audit module "failed" (it ran, but did not pass). Artifact still exists.
            await supabase
              .from("module_runs")
              .update({
                status: "failed" satisfies ModuleStatus,
                finished_at: new Date().toISOString(),
                output_ref: key,
                error: { message: "audit_failed", audit: auditFailureDetails },
              })
              .eq("id", moduleId);

            // Continue loop; downstream modules will be skipped.
            continue;
          }

          // Audit passed
          auditPassedOrNotRun = true;
          auditFailureDetails = null;

          await supabase
            .from("module_runs")
            .update({
              status: "succeeded" satisfies ModuleStatus,
              finished_at: new Date().toISOString(),
              output_ref: key,
              error: null,
            })
            .eq("id", moduleId);

          continue;
        }

                if (moduleName === "import") {
          if (!ingestionId) throw new Error("missing_ingestionId_for_import");

          const resp = await fetch(`${appUrl}/api/v1/pipeline/internal/import`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-pipeline-secret": internalSecret,
            },
            body: JSON.stringify({ ingestionId, options: options?.import ?? null }),
          });

          const text = await resp.text().catch(() => "");
          let json: any;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = { raw: text };
          }

          await uploadJson(supabase, key, {
            pipelineRunId,
            ingestionId,
            module: { name: moduleName, index: moduleIndex },
            generatedAt: new Date().toISOString(),
            http: { status: resp.status },
            import: json,
          });

          if (!resp.ok) {
            throw new Error(`import_internal_http_${resp.status}`);
          }

          await supabase
            .from("module_runs")
            .update({
              status: "succeeded" satisfies ModuleStatus,
              finished_at: new Date().toISOString(),
              output_ref: key,
              error: null,
            })
            .eq("id", moduleId);

          continue;
        }
        
        // Other modules not implemented yet: still write a durable artifact
        await uploadJson(supabase, key, {
          pipelineRunId,
          ingestionId: ingestionId ?? null,
          module: { name: moduleName, index: moduleIndex },
          generatedAt: new Date().toISOString(),
          note: "module not implemented yet; artifact records requested options",
          options: options?.[moduleName] ?? null,
        });

        await supabase
          .from("module_runs")
          .update({
            status: "skipped" satisfies ModuleStatus,
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

    // Final pipeline status:
    // - if audit failed (soft gate), mark pipeline as failed (but runner execution is "ok")
    // - otherwise succeeded
    const finalStatus: PipelineRunStatus = auditPassedOrNotRun ? "succeeded" : "failed";

    await supabase
      .from("pipeline_runs")
      .update({ status: finalStatus, finished_at: new Date().toISOString() })
      .eq("id", pipelineRunId);

    return new Response(JSON.stringify({ ok: true, pipelineRunId, status: finalStatus }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "unexpected", details: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
