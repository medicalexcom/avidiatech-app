// Job type definitions for BullMQ jobs used in the worker
export type JobName = "connector-sync" | "import-process" | "pipeline-retry";

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

export type JobPayloads = {
  "connector-sync": ConnectorSyncPayload;
  "import-process": ImportProcessPayload;
  "pipeline-retry": PipelineRetryPayload;
};
