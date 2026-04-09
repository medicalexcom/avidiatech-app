/**
 * Auto-create missing tenant/team membership rows for failed items and requeue them.
 *
 * Usage:
 *   # Dry-run (default) - shows what would be done
 *   SUPABASE_URL="https://..." SUPABASE_SERVICE_ROLE_KEY="..." REDIS_URL="rediss://:...@..." node scripts/auto_create_members_and_requeue.js
 *
 *   # Apply changes (create members + requeue)
 *   SUPABASE_URL="https://..." SUPABASE_SERVICE_ROLE_KEY="..." REDIS_URL="rediss://:...@..." node scripts/auto_create_members_and_requeue.js --apply --limit=2000
 *
 * Options:
 *   --apply        Actually insert membership rows and requeue items. Without it the script only prints actions.
 *   --limit=N      Max number of failed items to process (default 2000).
 *   --dry          Shortcut to force dry-run (same as no --apply).
 *
 * Notes:
 *  - Uses Supabase service-role key to insert/update DB rows.
 *  - Uses BullMQ to enqueue into "bulk-item".
 *  - Idempotent: checks for existing membership rows before inserting.
 *  - If team_members.id requires a UUID and DB has no default, script generates one.
 */

const { createClient } = require("@supabase/supabase-js");
const IORedis = require("ioredis");
const { Queue } = require("bullmq");
const { v4: uuidv4 } = require("uuid");
const argv = require("minimist")(process.argv.slice(2));

const APPLY = !!argv.apply;
const LIMIT = parseInt(argv.limit || argv.l || 2000, 10);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.REDIS_URL) {
  console.error("Missing env. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REDIS_URL");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REDIS_URL = process.env.REDIS_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function looksLikeUuid(s) {
  if (!s) return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

(async () => {
  try {
    console.log(`Dry-run mode: ${!APPLY}. Limit: ${LIMIT}`);

    // 1) fetch failed items with membership error
    const { data: items, error: itemsErr } = await supabase
      .from("bulk_job_items")
      .select("id, bulk_job_id, last_error")
      .eq("status", "failed")
      .limit(LIMIT);

    if (itemsErr) throw itemsErr;

    // filter those whose last_error message contains membership text
    const targetItems = items.filter((i) => {
      try {
        const msg = i.last_error && (typeof i.last_error === "object" ? (i.last_error.message || JSON.stringify(i.last_error)) : String(i.last_error));
        return msg && msg.toLowerCase().includes("tenant membership");
      } catch {
        return false;
      }
    });

    if (targetItems.length === 0) {
      console.log("No failed items with 'tenant membership' error found.");
      process.exit(0);
    }

    console.log(`Found ${targetItems.length} failed items with membership error (limited to ${LIMIT}).`);

    // 2) fetch bulk_jobs for those items to get org_id / created_by
    const bulkJobIds = [...new Set(targetItems.map((it) => it.bulk_job_id))];
    const { data: bulkJobs, error: jobsErr } = await supabase
      .from("bulk_jobs")
      .select("id, org_id, created_by")
      .in("id", bulkJobIds);

    if (jobsErr) throw jobsErr;

    const jobsById = {};
    for (const j of bulkJobs) jobsById[j.id] = j;

    // 3) build distinct pairs (org_id, created_by)
    const pairs = {};
    for (const it of targetItems) {
      const bj = jobsById[it.bulk_job_id];
      if (!bj) continue;
      const org = bj.org_id;
      const user = bj.created_by;
      if (!org || !user) continue;
      const key = `${org}||${user}`;
      pairs[key] = { org_id: org, user_id: user };
    }
    const distinctPairs = Object.values(pairs);

    console.log(`Distinct org/user pairs to check: ${distinctPairs.length}`);

    // 4) For each pair, check tenant_members and team_members and optionally insert
    const toInsertTenant = [];
    const toInsertTeam = [];

    for (const p of distinctPairs) {
      // tenant_members (tenant_id uuid, clerk_user_id text)
      if (looksLikeUuid(p.org_id)) {
        const { data: existTenant, error: checkTenantErr } = await supabase
          .from("tenant_members")
          .select("tenant_id")
          .eq("tenant_id", p.org_id)
          .eq("clerk_user_id", p.user_id)
          .limit(1);

        if (checkTenantErr) throw checkTenantErr;
        if (!existTenant || existTenant.length === 0) {
          toInsertTenant.push({ tenant_id: p.org_id, clerk_user_id: p.user_id, role: "member" });
        }
      } else {
        console.log(`Skipping tenant_members insert for org_id (not UUID): ${p.org_id}`);
      }

      // team_members (tenant_id text, user_id text)
      const { data: existTeam, error: checkTeamErr } = await supabase
        .from("team_members")
        .select("tenant_id")
        .eq("tenant_id", p.org_id)
        .eq("user_id", p.user_id)
        .limit(1);

      if (checkTeamErr) throw checkTeamErr;
      if (!existTeam || existTeam.length === 0) {
        toInsertTeam.push({ tenant_id: p.org_id, user_id: p.user_id, role: "member", id: uuidv4() });
      }
    }

    console.log(`Tenant members to create: ${toInsertTenant.length}`);
    console.log(`Team members to create: ${toInsertTeam.length}`);

    if (!APPLY) {
      if (toInsertTenant.length) console.log("Tenant inserts (preview):", toInsertTenant.slice(0, 20));
      if (toInsertTeam.length) console.log("Team inserts (preview):", toInsertTeam.slice(0, 20));
    } else {
      // Insert tenant_members in batches
      if (toInsertTenant.length) {
        console.log("Inserting tenant_members...");
        const chunkSize = 200;
        for (let i = 0; i < toInsertTenant.length; i += chunkSize) {
          const chunk = toInsertTenant.slice(i, i + chunkSize);
          const { error: insertTenantErr } = await supabase.from("tenant_members").insert(chunk, { returning: "minimal" });
          if (insertTenantErr) {
            console.error("Error inserting tenant_members chunk:", insertTenantErr);
            throw insertTenantErr;
          }
        }
        console.log("Inserted tenant_members.");
      }

      if (toInsertTeam.length) {
        console.log("Inserting team_members (with generated ids)...");
        const chunkSize = 200;
        for (let i = 0; i < toInsertTeam.length; i += chunkSize) {
          const chunk = toInsertTeam.slice(i, i + chunkSize);
          const { error: insertTeamErr } = await supabase.from("team_members").insert(chunk, { returning: "minimal" });
          if (insertTeamErr) {
            console.error("Error inserting team_members chunk:", insertTeamErr);
            throw insertTeamErr;
          }
        }
        console.log("Inserted team_members.");
      }
    }

    // 5) Requeue affected items
    const itemsToRequeue = targetItems.map((it) => it.id);
    console.log(`Items to requeue: ${itemsToRequeue.length}`);

    if (!APPLY) {
      console.log("Dry-run complete. Add --apply to perform inserts and requeue.");
      process.exit(0);
    }

    // Connect to Redis and BullMQ queue
    const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
    const queue = new Queue("bulk-item", { connection });

    let requeued = 0;
    for (const itemId of itemsToRequeue) {
      // enqueue job
      await queue.add("process-bulk-item", { bulkJobItemId: itemId }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });

      // update DB row back to queued
      const { error: updateErr } = await supabase
        .from("bulk_job_items")
        .update({ status: "queued", last_error: null, tries: 0, started_at: null, finished_at: null })
        .eq("id", itemId);

      if (updateErr) {
        console.warn("Failed to update db for item", itemId, updateErr);
      } else {
        requeued++;
      }
    }

    await queue.close();
    connection.disconnect();

    console.log(`Done. Requeued ${requeued} items and created memberships as needed.`);
    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();
