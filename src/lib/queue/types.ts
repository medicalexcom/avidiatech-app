// src/lib/queue/types.ts
// Job type definitions for BullMQ jobs used in the worker

// Existing/previous types kept, with addition of bulk-master and bulk-item
export type JobName =
  | "connector-sync"
  | "import-process"
  | "pipeline-retry"
  | "bulk-master"
  | "bulk-item";

export interface ConnectorSyncPayload {
  integrationId: string;
  jobId: string; // import_jobs.id
}

export interface ImportProcessPayload {
  jobId: string; // import_jobs.id
}

export interface PipelineRetryPayload {
  pipelineRunId: string;
}

/** Bulk job payloads */
export interface BulkMasterPayload {
  bulkJobId: string;
}
export interface BulkItemPayload {
  bulkJobItemId: string;
}

export type JobPayloads = {
  "connector-sync": ConnectorSyncPayload;
  "import-process": ImportProcessPayload;
  "pipeline-retry": PipelineRetryPayload;
  "bulk-master": BulkMasterPayload;
  "bulk-item": BulkItemPayload;
};
