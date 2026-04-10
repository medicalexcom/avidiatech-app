/**
 * Stubbed tenant quota assert. Replace with your real quota checks.
 */
export async function assertTenantQuota(tenantId: string, opts: { kind: "match" | "extract" }) {
  if (!tenantId) throw new Error("tenant-id-required");
  // Example: check a DB row or a rate limiter. For scaffold, permit all.
  return true;
}
