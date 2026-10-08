import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";

let db: Promise<AsyncDuckDB> | undefined;

// One shared in-browser DuckDB. The .wasm (~34 MB) is over the 25 MiB Workers asset cap, so it loads from jsDelivr.
export const getDb = () =>
  (db ??= (async () => {
    const duckdb = await import("@duckdb/duckdb-wasm");
    const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
    // cross-origin worker scripts can't be started directly; wrap in a same-origin blob
    const workerUrl = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
    );
    const instance = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(workerUrl));
    await instance.instantiate(bundle.mainModule, bundle.pthreadWorker);
    // without this, duckdb-wasm downloads each parquet file whole instead of the row groups a query needs
    await instance.open({ filesystem: { forceFullHTTPReads: false } });
    URL.revokeObjectURL(workerUrl);
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
