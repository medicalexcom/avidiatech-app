import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function parseFileBuffer(buffer: Buffer, format?: string) {
  // try to detect by format if not provided
  const fmt = (format || detectFormat(buffer)).toLowerCase();
  if (fmt === "csv") {
    const text = buffer.toString("utf8");
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h?.trim() ?? h,
    });
    return { headers: parsed.meta.fields ?? [], rows: parsed.data as any[] };
  } else {
    // treat as excel
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows };
  }
}

function detectFormat(buffer: Buffer) {
  // crude: check for zip header (xlsx) or presence of commas/newlines
  if (buffer.slice(0, 2).toString("hex") === "504b") return "xlsx"; // PK - zip
  return "csv";
}
