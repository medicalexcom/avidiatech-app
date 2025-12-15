import { validateImportFile } from "../validateImportFile";

// We will mock the supabase client storage.download by mocking createClient from @supabase/supabase-js
jest.mock("@supabase/supabase-js", () => {
  return {
    createClient: jest.fn(() => {
      return {
        storage: {
          from: jest.fn(() => {
            return {
              // download returns { data, error }
              download: jest.fn(async (filePath: string) => {
                // Provide a small CSV buffer for test file paths
                const csv = "header1,header2\nval1,val2\n";
                const buf = Buffer.from(csv, "utf8");
                // return an object with arrayBuffer method to mimic Blob-like
                return { data: { arrayBuffer: async () => buf.buffer }, error: null };
              }),
            };
          }),
        },
      };
    }),
  };
});

describe("validateImportFile", () => {
  it("validates a small CSV file", async () => {
    const result = await validateImportFile({ filePath: "test.csv" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toBeGreaterThanOrEqual(1);
      expect(result.fileSizeBytes).toBeGreaterThan(0);
    }
  });

  it("rejects too many rows", async () => {
    const result = await validateImportFile({ filePath: "test.csv", maxRows: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("too_many_rows");
    }
  });
});
