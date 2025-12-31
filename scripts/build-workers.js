const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

(async () => {
  try {
    const srcDir = path.resolve(__dirname, "../src/workers");
    const outDir = path.resolve(__dirname, "../dist/workers");

    if (!fs.existsSync(srcDir)) {
      console.error("No src/workers directory found — nothing to build.");
      process.exit(0);
    }
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js"));
    if (files.length === 0) {
      console.log("No worker entry files found under src/workers — nothing to bundle.");
      process.exit(0);
    }

    console.log("Building worker entries:", files);

    // Build each worker file individually so they can be run separately in prod.
    for (const file of files) {
      const infile = path.join(srcDir, file);
      const outfile = path.join(outDir, file.replace(/\.(ts|tsx)$/, ".js"));
      console.log(`Bundling ${infile} -> ${outfile}`);

      await esbuild.build({
        entryPoints: [infile],
        outfile,
        bundle: true,
        platform: "node",
        format: "cjs",
        target: ["node22"],
        sourcemap: false,
        external: [], // if you want to leave some modules external add them here
        define: {
          "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
        },
        // Simple path alias: "@" -> src/
        plugins: [
          {
            name: "alias-at",
            setup(build) {
              const srcRoot = path.resolve(__dirname, "../src");
              build.onResolve({ filter: /^@\/(.+)/ }, (args) => {
                const sub = args.path.replace(/^@\//, "");
                const resolved = path.join(srcRoot, sub);
                return { path: resolved };
              });
            },
          },
        ],
      });

      console.log(`Wrote ${outfile}`);
    }

    console.log("Worker build complete.");
  } catch (err) {
    console.error("Worker build failed:", err);
    process.exit(1);
  }
})();
