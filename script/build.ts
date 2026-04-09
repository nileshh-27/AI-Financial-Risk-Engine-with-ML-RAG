import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile } from "fs/promises";
import dotenv from "dotenv";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  // Load repo-root .env for local builds so we can generate runtime-config.
  // (Vite also loads .env itself, but drag-and-drop deployments benefit from a separate runtime file.)
  dotenv.config();

  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  // Write runtime Supabase config if values are available.
  // This allows Netlify drag-and-drop: upload dist/public with config already embedded.
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseAnonKey) {
    const runtimeConfigJs =
      "/** Generated at build time. Do not commit secrets here. */\n" +
      "window.__RISK_DASHBOARD_CONFIG__ = {\n" +
      `  supabaseUrl: ${JSON.stringify(supabaseUrl)},\n` +
      `  supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)},\n` +
      "};\n";

    await writeFile("dist/public/runtime-config.js", runtimeConfigJs, "utf-8");
  }

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
