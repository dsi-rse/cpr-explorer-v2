// Runs every fixtures.json case (nectr API snapshots, 2026-10-08) through the query builders in src/utils/queries.ts.
// Same comparison as cpr/fe-migration/reference_queries.py check(), plus row order, duplicate keys and column names.
//   pnpm parity                                  # the R2 data, or VITE_DATA_URL from the env or .env
//   VITE_DATA_URL=/path/to/cpr/data/r2 pnpm parity  # a local build works too
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DuckDBInstance } from "@duckdb/node-api";
import { DATA_ID, DATA_URL, buildParams, mapQuery, timeseriesQuery, type Geo, type Series } from "../src/utils/queries";

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

const base = (process.env.VITE_DATA_URL || DATA_URL).replace(/\/$/, "");
const SERIES_KEY: Record<Series, string> = { class: "ai_class", usetype: "ai_type", ai: "chem_code", product: "prodno" };
const fx: { cases: Case[]; sample_api_rows: Record<Geo, Row> } = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8")
);

// buildParams: UI filters -> params as the old API took them (only filterKeys, empties dropped, arrays joined, range split)
assert.deepEqual(
  buildParams(
    [
      { queryParam: ["start", "end"], label: "Date Range", value: ["2023-01", "2023-12"], valueLabels: null },
      { queryParam: "chemical", label: "Active Ingredient (AI)", value: ["2276", "3850"], valueLabels: null },
      { queryParam: "site", label: "Crop or Site", value: [], valueLabels: null },
      { queryParam: "pcthispanic", label: "Percent Hispanic or Latino", value: 0, valueLabels: null },
      { queryParam: "county", label: "County", value: "10", valueLabels: null },
    ],
    ["Date Range", "Active Ingredient (AI)", "Crop or Site", "Percent Hispanic or Latino"]
  ),
  { start: "2023-01", end: "2023-12", chemical: "2276,3850", pcthispanic: "0" }
);

const conn = await (await DuckDBInstance.create()).connect();
if (base.startsWith("http")) await conn.run("install httpfs; load httpfs");
const run = async (sql: string) => (await conn.runAndReadAll(sql)).getRowObjectsJS() as Row[];

let failures = 0;
for (const c of fx.cases) {
  const problems: string[] = [];
  try {
    await check(c, problems);
  } catch (e) {
    problems.push(String(e)); // e.g. a SQL error from a bad column name
  }
  failures += problems.length ? 1 : 0;
  console.log(`${problems.length ? "FAIL" : "ok  "} ${c.name.padEnd(26)} ${problems.slice(0, 3).join("; ")}`);
}
console.log(failures ? `${failures} cases differ` : "all cases match the API");
process.exit(failures ? 1 : 0);

async function check(c: Case, problems: string[]) {
  let got: Row[], exp: Row[], key: string[], cols: string[];
  if (c.view === "map") {
    key = [DATA_ID[c.geo]];
    cols = ["lbs_chm_used", "lbs_prd_used", "ai_intensity", "prd_intensity"];
    got = await run(mapQuery(c.geo, c.params, base));
    if (got.length !== c.api_row_count) problems.push(`${got.length} rows, api ${c.api_row_count}`);
    // the samples omit null columns, so check a subset: pins Area Name and the Pop/Pct names store.ts relies on
    const missingCols = Object.keys(fx.sample_api_rows[c.geo]).filter((col) => got.length && !(col in got[0]));
    if (missingCols.length) problems.push(`missing columns ${missingCols.join(", ")}`);
    got = got.filter((r) => r.lbs_chm_used != null);
    exp = c.rows_with_use;
  } else {
    key = ["monthyear", SERIES_KEY[c.series]];
    cols = ["lbs_chm_used", ...(c.series === "product" ? ["lbs_prd_used"] : [])];
    got = await run(timeseriesQuery(c.series, c.params, base));
    exp = c.rows;
    // infillTimeseries walks rows in date order
    if (!got.every((r, i) => i === 0 || got[i - 1].monthyear <= r.monthyear)) problems.push("rows not in month order");
  }
  const k = (r: Row) => JSON.stringify(key.map((x) => r[x]));
  const g = new Map(got.map((r) => [k(r), r]));
  if (g.size !== got.length) problems.push(`${got.length - g.size} duplicate keys`);
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
}
