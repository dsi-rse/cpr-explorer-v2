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
    const instance = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(workerUrl));
    await instance.instantiate(bundle.mainModule, bundle.pthreadWorker);
    // without this, duckdb-wasm downloads each parquet file whole instead of the row groups a query needs
    await instance.open({ filesystem: { forceFullHTTPReads: false } });
    URL.revokeObjectURL(workerUrl);
    const conn = await instance.connect();
    await conn.query(`set custom_extension_repository = '${runtime}/extensions'`);
    // fetch the parquet extension now, during idle-time init, instead of on the first query
    await conn.query("load parquet");
    await conn.close();
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
