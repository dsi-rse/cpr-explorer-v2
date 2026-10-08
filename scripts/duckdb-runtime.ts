// Puts the DuckDB-WASM runtime for the installed @duckdb/duckdb-wasm (wasm, workers, parquet extension) on our R2
// bucket, so the explorer doesn't depend on jsDelivr or extensions.duckdb.org. src/utils/db.ts loads it from
// <data host>/duckdb-wasm/<package version>/. Run `upload` after upgrading @duckdb/duckdb-wasm; CI runs `check`.
//   R2_ACCOUNT_ID=… R2_BUCKET=… AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… pnpm exec tsx scripts/duckdb-runtime.ts upload
//   pnpm exec tsx scripts/duckdb-runtime.ts check        # every file is on the bucket's public domain
//   pnpm exec tsx scripts/duckdb-runtime.ts stage <dir>  # write the files locally instead (testing)
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { brotliCompressSync } from "node:zlib";
import { DATA_URL } from "../src/utils/queries";

const [mode, stageDir] = process.argv.slice(2);
if (mode === "upload" && !(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET))
  throw new Error("set R2_ACCOUNT_ID, R2_BUCKET, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
const require = createRequire(import.meta.url);
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs");
const dist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-eh.wasm"));

// DuckDB builds extension URLs from its engine version (e.g. v1.5.4), not the package version
const db = await duckdb.createDuckDB(
  { eh: { mainModule: `${dist}/duckdb-eh.wasm`, mainWorker: `${dist}/duckdb-node-eh.worker.cjs` } },
  new duckdb.VoidLogger(),
  duckdb.NODE_RUNTIME
);
await db.instantiate();
const engine: string = db.getVersion();
const prefix = `duckdb-wasm/${duckdb.PACKAGE_VERSION}`;

const local = (name: string) => async () => readFileSync(join(dist, name));
const remote = (url: string) => async () => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};
const files = (["mvp", "eh"] as const).flatMap((b) => [
  { key: `${prefix}/duckdb-${b}.wasm`, type: "application/wasm", read: local(`duckdb-${b}.wasm`) },
  { key: `${prefix}/duckdb-browser-${b}.worker.js`, type: "text/javascript", read: local(`duckdb-browser-${b}.worker.js`) },
  {
    key: `${prefix}/extensions/${engine}/wasm_${b}/parquet.duckdb_extension.wasm`,
    type: "application/wasm",
    read: remote(`https://extensions.duckdb.org/${engine}/wasm_${b}/parquet.duckdb_extension.wasm`),
  },
]);

if (mode === "check") {
  // the host the site is built against: VITE_DATA_URL (import.meta.env is undefined under tsx), else the default
  const origin = new URL(process.env.VITE_DATA_URL || DATA_URL).origin;
  const problems = [];
  for (const f of files) {
    const res = await fetch(`${origin}/${f.key}`, { method: "HEAD", headers: { Origin: "https://example.org" } });
    // a wrong encoding or missing CORS header only shows up in the browser, so check those too
    if (!res.ok) problems.push(`${f.key}: HTTP ${res.status}`);
    else if (res.headers.get("content-encoding") !== "br") problems.push(`${f.key}: not served with Content-Encoding: br`);
    else if (!res.headers.get("access-control-allow-origin")) problems.push(`${f.key}: no CORS header`);
  }
  if (problems.length) {
    console.error(`${origin} (run scripts/duckdb-runtime.ts upload):\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`DuckDB-WASM ${duckdb.PACKAGE_VERSION} runtime is on ${origin}`);
} else if (mode === "upload" || (mode === "stage" && stageDir)) {
  const dir = stageDir ?? mkdtempSync(join(tmpdir(), "duckdb-runtime-"));
  for (const f of files) {
    const path = join(dir, f.key);
    mkdirSync(dirname(path), { recursive: true });
    // Cloudflare doesn't compress application/wasm on the fly, so store brotli and serve it with Content-Encoding: br
    writeFileSync(path, brotliCompressSync(await f.read()));
    if (mode !== "upload") continue;
    execFileSync(
      "aws",
      ["s3", "cp", path, `s3://${process.env.R2_BUCKET}/${f.key}`, "--only-show-errors",
        "--endpoint-url", `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        "--content-type", f.type, "--content-encoding", "br",
        "--cache-control", "public, max-age=31536000, immutable"],
      // same settings as the cpr repo's R2 workflows
      { stdio: "inherit", env: { ...process.env, AWS_DEFAULT_REGION: "auto", AWS_REQUEST_CHECKSUM_CALCULATION: "when_required", AWS_RESPONSE_CHECKSUM_VALIDATION: "when_required" } }
    );
    console.log(`uploaded ${f.key}`);
  }
  if (mode === "stage") console.log(`staged ${files.length} files in ${dir}`);
} else {
  console.error("usage: duckdb-runtime.ts check | upload | stage <dir>");
  process.exit(1);
}
