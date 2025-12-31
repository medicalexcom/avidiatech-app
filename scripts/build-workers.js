const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

function resolveWithExtensions(basePath) {
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
  // direct file
  for (const ext of exts) {
    const p = basePath + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  // index files in directory
  for (const ext of exts) {
    const p = path.join(basePath, "index" + ext);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  // if basePath itself is file (with extension already)
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath;
  return null;
}

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
        define: {
          "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
        },
        plugins: [
          {
            name: "alias-at-resolver",
            setup(build) {
              const srcRoot = path.resolve(__dirname, "../src");

              // Resolve imports starting with @/
              build.onResolve({ filter: /^@\/(.+)/ }, (args) => {
                const sub = args.path.replace(/^@\//, "");
                const candidate = path.join(srcRoot, sub);
                const resolvedFile = resolveWithExtensions(candidate);
                if (resolvedFile) {
                  return { path: resolvedFile };
                }
                // If not found, still return candidate so esbuild gives a helpful error
                return { path: candidate };
              });

              // Also handle bare imports that might point to src/ by some usages
              build.onResolve({ filter: /^~\/(.+)/ }, (args) => {
                const sub = args.path.replace(/^~\//, "");
                const candidate = path.join(srcRoot, sub);
                const resolvedFile = resolveWithExtensions(candidate);
                if (resolvedFile) {
                  return { path: resolvedFile };
                }
                return { path: candidate };
              });
            },
          },
        ],
        // leave node builtins external to keep native behavior
        external: ["fs", "path", "os", "crypto"],
      });

      console.log(`Wrote ${outfile}`);
    }

    console.log("Worker build complete.");
  } catch (err) {
    console.error("Worker build failed:", err);
    process.exit(1);
  }
})();
