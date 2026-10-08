import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import { DATA_URL } from "./queries";

let db: Promise<AsyncDuckDB> | undefined;

// One shared in-browser DuckDB. Its runtime (wasm, workers, parquet extension) is on our R2 bucket next to the data,
// put there by scripts/duckdb-runtime.ts: the .wasm (~34 MB) is over the 25 MiB Workers asset cap, so it can't ship
// in dist, and this keeps jsDelivr and extensions.duckdb.org out of the loading path.
export const getDb = () =>
  (db ??= (async () => {
    const duckdb = await import("@duckdb/duckdb-wasm");
    const runtime = `${new URL(DATA_URL).origin}/duckdb-wasm/${duckdb.PACKAGE_VERSION}`;
    const bundle = await duckdb.selectBundle({
      mvp: { mainModule: `${runtime}/duckdb-mvp.wasm`, mainWorker: `${runtime}/duckdb-browser-mvp.worker.js` },
      eh: { mainModule: `${runtime}/duckdb-eh.wasm`, mainWorker: `${runtime}/duckdb-browser-eh.worker.js` },
    });
    // cross-origin worker scripts can't be started directly; wrap in a same-origin blob
    const workerUrl = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
    );
    const worker = new Worker(workerUrl);
    const instance = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    // duckdb-wasm drops, rather than rejects, its pending calls when the worker fails: a missing worker script fires
    // "error", a missing .wasm just hangs. Fail on either, so queries land in the error state and the next one retries.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const failed = new Promise<never>((_, reject) => {
      worker.addEventListener("error", (e) => reject(new Error(`DuckDB worker failed to load: ${e.message}`)), { once: true });
      // ~6 MB to download: 60 s leaves room for slow connections
      timer = setTimeout(() => reject(new Error("DuckDB didn't start within 60 s")), 60_000);
    });
    const start = async () => {
      await instance.instantiate(bundle.mainModule, bundle.pthreadWorker);
      // without this, duckdb-wasm downloads each parquet file whole instead of the row groups a query needs
      await instance.open({ filesystem: { forceFullHTTPReads: false } });
      const conn = await instance.connect();
      await conn.query(`set custom_extension_repository = '${runtime}/extensions'`);
      // fetch the parquet extension now, during idle-time init, instead of on the first query
      await conn.query("load parquet");
      await conn.close();
    };
    try {
      await Promise.race([start(), failed]);
    } catch (e) {
      worker.terminate();
      throw e;
    } finally {
      clearTimeout(timer);
      URL.revokeObjectURL(workerUrl);
    }
    return instance;
  })().catch((e) => {
    db = undefined; // let the next query retry
    throw e;
  }));

export const query = async (sql: string) => {
  const conn = await (await getDb()).connect();
  try {
    const table = await conn.query(sql);
    return table.toArray().map((row) => row.toJSON()) as Record<string, unknown>[];
  } finally {
    await conn.close();
  }
};
