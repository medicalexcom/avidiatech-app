import { createClient } from "@supabase/supabase-js";
import { parse } from "papaparse";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}
const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export type ValidationResult =
  | { ok: true; rows: number; cols?: number; fileSizeBytes: number }
  | { ok: false; errorCode: string; message: string; rows?: number; cols?: number };

export async function validateImportFile(options: {
  bucket?: string;
  filePath: string;
  maxRows?: number;
  maxCols?: number;
  maxBytes?: number;
}): Promise<ValidationResult> {
  const maxRows = options.maxRows ?? parseInt(process.env.IMPORT_MAX_ROWS ?? "5000", 10);
  const maxCols = options.maxCols ?? parseInt(process.env.IMPORT_MAX_COLS ?? "50", 10);
  const maxBytes = options.maxBytes ?? parseInt(process.env.IMPORT_MAX_SIZE_BYTES ?? "10000000", 10);

  const storage = supa.storage.from(options.bucket ?? "imports");

  // download: Supabase storage.download returns { data, error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const downloadResult: any = await storage.download(options.filePath);
  const { data: downloadedData, error: downloadError } = downloadResult ?? {};
  if (downloadError || !downloadedData) {
    return { ok: false, errorCode: "download_failed", message: `failed to download file: ${downloadError?.message ?? "unknown"}` };
  }

  // Normalize to Buffer
  let buffer: Buffer;
  if (typeof downloadedData.arrayBuffer === "function") {
    // Blob-like
    const ab = await downloadedData.arrayBuffer();
    buffer = Buffer.from(ab);
  } else if (Buffer.isBuffer(downloadedData)) {
    buffer = downloadedData;
  } else if (downloadedData instanceof Uint8Array) {
    buffer = Buffer.from(downloadedData);
  } else if (typeof downloadedData.text === "function") {
    const txt = await downloadedData.text();
    buffer = Buffer.from(txt);
  } else {
    buffer = Buffer.from(String(downloadedData));
  }

  if (buffer.length > maxBytes) {
    return { ok: false, errorCode: "file_too_large", message: `File size ${buffer.length} bytes exceeds limit ${maxBytes} bytes` };
  }

  const lower = options.filePath.toLowerCase();
  const looksCsv = lower.endsWith(".csv") || lower.endsWith(".txt");

  if (looksCsv) {
    const tmp = path.join(tmpdir(), `validate-${Date.now()}.csv`);
    fs.writeFileSync(tmp, buffer);

    try {
      const stream = fs.createReadStream(tmp);
      return await new Promise<ValidationResult>((resolve, reject) => {
        let rows = 0;
        let cols = 0;
        let headerSeen = false;
        parse(stream as any, {
          header: true,
          step: (result) => {
            if (!headerSeen) {
              headerSeen = true;
              cols = Object.keys(result.data).length;
              if (cols > maxCols) {
                stream.close?.();
                return resolve({ ok: false, errorCode: "too_many_columns", message: `Columns ${cols} exceed allowed ${maxCols}`, cols, rows });
              }
            }
            rows++;
            if (rows > maxRows) {
              stream.close?.();
              return resolve({ ok: false, errorCode: "too_many_rows", message: `Rows ${rows} exceed allowed ${maxRows}`, rows, cols });
            }
          },
          complete: () => {
            resolve({ ok: true, rows, cols, fileSizeBytes: buffer.length });
          },
          error: (err) => {
            reject({ ok: false, errorCode: "parse_error", message: String(err?.message ?? err) });
          },
        });
      });
    } finally {
      try {
        fs.unlinkSync(tmp);
      } catch (_) {
        // ignore
      }
    }
  }

  // Fallback for non-csv files (XLSX or others): do an approximate check by line count in the UTF-8 rendering.
  const asText = buffer.toString("utf8");
  const lineCount = asText.split(/\r\n|\n/).length;
  if (lineCount > maxRows) {
    return { ok: false, errorCode: "too_many_rows", message: `Estimated rows ${lineCount} exceed allowed ${maxRows}`, rows: lineCount };
  }

  return { ok: true, rows: lineCount, fileSizeBytes: buffer.length };
}
