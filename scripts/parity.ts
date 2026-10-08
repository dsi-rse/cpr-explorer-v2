// Runs every fixtures.json case (nectr API snapshots, 2026-10-08) through the query builders in src/utils/queries.ts.
// Same comparison as cpr/fe-migration/reference_queries.py check().
//   pnpm parity                                  # VITE_DATA_URL from the env or .env
//   VITE_DATA_URL=/path/to/cpr/data/r2 pnpm parity  # a local build works too
import { readFileSync } from "node:fs";
import { DuckDBInstance } from "@duckdb/node-api";
import { DATA_ID, mapQuery, timeseriesQuery, type Geo, type Series } from "../src/utils/queries";

type Row = Record<string, number>; // keys are strings too, only compared via JSON.stringify
type Case = {
  name: string;
  view: "map" | "timeseries";
  geo: Geo;
  series: Series;
  params: Record<string, string>;
  api_row_count: number;
  rows_with_use: Row[];
  rows: Row[];
};

const base = (process.env.VITE_DATA_URL ?? "").replace(/\/$/, "");
if (!base) throw new Error("set VITE_DATA_URL");
const SERIES_KEY: Record<Series, string> = { class: "ai_class", usetype: "ai_type", ai: "chem_code", product: "prodno" };
const { cases }: { cases: Case[] } = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));

const conn = await (await DuckDBInstance.create()).connect();
if (base.startsWith("http")) await conn.run("install httpfs; load httpfs");
const run = async (sql: string) => (await conn.runAndReadAll(sql)).getRowObjectsJS() as Row[];

let failures = 0;
for (const c of cases) {
  const problems: string[] = [];
  let got: Row[], exp: Row[], key: string[], cols: string[];
  if (c.view === "map") {
    key = [DATA_ID[c.geo]];
    cols = ["lbs_chm_used", "lbs_prd_used", "ai_intensity", "prd_intensity"];
    got = await run(mapQuery(c.geo, c.params, base));
    if (got.length !== c.api_row_count) problems.push(`${got.length} rows, api ${c.api_row_count}`);
    got = got.filter((r) => r.lbs_chm_used != null);
    exp = c.rows_with_use;
  } else {
    key = ["monthyear", SERIES_KEY[c.series]];
    cols = ["lbs_chm_used", ...(c.series === "product" ? ["lbs_prd_used"] : [])];
    got = await run(timeseriesQuery(c.series, c.params, base));
    exp = c.rows;
  }
  const k = (r: Row) => JSON.stringify(key.map((x) => r[x]));
  const g = new Map(got.map((r) => [k(r), r]));
  if (g.size !== exp.length) problems.push(`${g.size} rows with use, api ${exp.length}`);
  for (const e of exp) {
    const r = g.get(k(e));
    if (!r) {
      problems.push(`missing ${k(e)}`);
      continue;
    }
    // use/ stores float32, so filtered totals can differ from the API past the 6th significant digit
    for (const col of cols)
      if (!(Math.abs(r[col] - e[col]) <= Math.max(0.02, 1e-4 * Math.abs(e[col]))))
        problems.push(`${k(e)} ${col}: ${r[col]} vs api ${e[col]}`);
  }
  failures += problems.length ? 1 : 0;
  console.log(`${problems.length ? "FAIL" : "ok  "} ${c.name.padEnd(26)} ${problems.slice(0, 3).join("; ")}`);
}
console.log(failures ? `${failures} cases differ` : "all cases match the API");
process.exit(failures ? 1 : 0);
