import type { Buffer } from "buffer";

export type ParseResult = {
  headers: string[];
  rows: any[];
};

/**
 * Parse a file buffer (CSV or Excel) into rows + headers.
 * Uses dynamic imports so papaparse/xlsx are only required at runtime (server-side)
 * and won't be accidentally bundled into client bundles.
 */
export async function parseFileBuffer(buffer: Buffer, format?: string): Promise<ParseResult> {
  const fmt = (format || detectFormat(buffer)).toLowerCase();

  try {
    if (fmt === "csv") {
      const PapaMod = await import("papaparse");
      // papaparse may be the default export or named export depending on bundler
      const Papa = (PapaMod && (PapaMod.default ?? PapaMod)) as any;

      const text = buffer.toString("utf8");
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: any) => (typeof h === "string" ? h.trim() : h),
      });

      return {
        headers: parsed.meta?.fields ?? [],
        rows: parsed.data ?? [],
      };
    } else {
      // treat as excel (xlsx / xls)
      const XLSX = (await import("xlsx")) as any;

      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames?.[0];
      if (!sheetName) return { headers: [], rows: [] };

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

      return { headers, rows };
    }
  } catch (err) {
    // surface a clear error up the stack
    throw new Error(`parseFileBuffer failed: ${(err as Error).message ?? String(err)}`);
  }
}

function detectFormat(buffer: Buffer) {
  // crude detection:
  // - xlsx files are zip archives and begin with 'PK' (0x50 0x4b)
  // - otherwise treat as csv
  try {
    if (buffer && buffer.length >= 2 && buffer.slice(0, 2).toString("hex") === "504b") return "xlsx";
  } catch {
    // ignore and fallthrough
  }
  return "csv";
}
