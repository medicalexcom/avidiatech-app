import type { NextRequest } from "next/server";

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

function clean(v: string | null | undefined): string {
  if (!v) return "";
  return String(v).replace(ANSI_REGEX, "").trim();
}

export function getInternalProvidedSecret(req: Pick<NextRequest, "headers">): string {
  const service = clean(req.headers.get("x-service-api-key"));
  if (service) return service;

  const pipeline = clean(req.headers.get("x-pipeline-secret"));
  if (pipeline) return pipeline;

  return "";
}

export function getInternalExpectedSecrets(): string[] {
  const candidates = [
    clean(process.env.PIPELINE_INTERNAL_SECRET),
    clean(process.env.SERVICE_API_KEY),
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}

export function internalAuthOk(req: Pick<NextRequest, "headers">): boolean {
  const provided = getInternalProvidedSecret(req);
  if (!provided) return false;

  const expected = getInternalExpectedSecrets();
  if (expected.length === 0) return false;

  return expected.includes(provided);
}
