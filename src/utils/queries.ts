// Every FE data query, as DuckDB SQL over the static parquet files on R2 (VITE_DATA_URL).
// Ported unchanged in logic from cpr/fe-migration/reference_queries.py; `pnpm parity` checks it against nectr snapshots.
import type { FilterState } from "../types/state";

export type Geo = "county" | "section" | "township" | "tract" | "school" | "zip";
export type Series = "class" | "usetype" | "ai" | "product";
export type Params = Record<string, string>;

// R2 files are immutable; a data refresh ships as /v2. VITE_DATA_URL overrides it (pnpm parity also takes a local data/r2 path).
// Optional chain: import.meta.env is undefined under tsx (scripts/parity.ts).
export const DATA_URL: string = (import.meta.env?.VITE_DATA_URL || "https://pesticide.cdn.uchicago-dsi.org/v1").replace(/\/$/, "");

// column name the map tiles join on, per geography
export const DATA_ID: Record<Geo, string> = {
  county: "FIPS",
  school: "FIPS",
  tract: "GEOID",
  section: "comtrs",
  township: "MeridianTownshipRange",
  zip: "Zip Code",
};
// demographic range filters (map dual view only): single threshold
const DEMOG: Record<string, [string, string]> = {
  pctblack: ['"Pct NH Black"', ">="],
  pcthispanic: ['"Pct Hispanic"', ">="],
  pctwhite: ['"Pct NH White"', ">="],
  pctasian: ['"Pct NH Asian"', ">="],
  pctnativeamerican: ['"Pct NH AIAN"', ">="],
  pctnativehawaiian: ['"Pct NH NHPI"', ">="],
  income: ['"Median HH Income"', "<="],
};
// any of these needs the per-AI `use/` table; otherwise the small `summary/` table answers the query
const DETAIL_PARAMS = ["site", "category", "health", "ai_type", "chemical", "product"];

// filters -> params, as the old API took them: only filterKeys, empty values skipped,
// arrays comma-joined, the date range expanded to start/end
export const buildParams = (filters: FilterState[], filterKeys: string[] = []) => {
  const p: Params = {};
  filters.forEach((filter) => {
    if (filterKeys.length > 0 && !filterKeys.includes(filter.label)) return;
    const { queryParam, value } = filter;
    const valueIsGood = Array.isArray(value)
      ? value.length > 0
      : typeof value === "number" || (typeof value === "string" && value.length > 0);
    if (!valueIsGood) return;
    if (Array.isArray(queryParam) && Array.isArray(value)) {
      p[queryParam[0]] = String(value[0]);
      p[queryParam[1]] = String(value[1]);
    } else {
      p[queryParam as string] = Array.isArray(value) ? value.join(",") : String(value);
    }
  });
  return p;
};

// comma-separated filter value -> SQL string list. Values can come from saved or shared selections, so escape quotes.
const lit = (csv: string) =>
  csv
    .split(",")
    .map((v) => `'${v.replace(/'/g, "''")}'`)
    .join(", ");

const where = (p: Params, base: string) => {
  const attrs = `'${base}/lookup/chem_attrs.parquet'`;
  const w = [`monthyear between ${lit(p.start)} and ${lit(p.end)}`];
  if ((p.usetype ?? "*") !== "*") w.push(`usetype in (${lit(p.usetype)})`);
  if ((p.aerial_ground ?? "*") !== "*") w.push(`aerial_ground in (${lit(p.aerial_ground)})`);
  if ("county" in p) w.push(`county_cd in (${lit(p.county)})`);
  if ("site" in p) w.push(`site_code in (${lit(p.site)})`);
  if ("product" in p) w.push(`prodno in (${lit(p.product)})`);
  if ("chemical" in p) w.push(`chem_code in (${lit(p.chemical)})`);
  if ("ai_type" in p)
    w.push(`chem_code in (select chem_code from ${attrs} where ai_type_ID in (${lit(p.ai_type)}))`);
  // class and health ids are pipe-joined per chemical, e.g. 'OP|PYR': match whole ids, not substrings
  for (const [param, col] of [
    ["category", "major_category"],
    ["health", "health"],
  ])
    if (param in p)
      w.push(
        `chem_code in (select chem_code from ${attrs} where list_has_any(string_split(${col}, '|'), [${lit(p[param])}]))`
      );
  return w.join(" and ");
};

// chm/prd summed by `keys` (use_by() in the reference). In use/, prd repeats on each AI row of a cell, so max() it per cell before summing.
const poundsBy = (geo: Geo, p: Params, keys: string, base: string) =>
  DETAIL_PARAMS.some((k) => k in p)
    ? `select ${keys}, sum(chm) chm, sum(prd) prd from (
        select ${keys}, county_cd, monthyear, usetype, aerial_ground, site_code, prodno, sum(chm) chm, max(prd) prd
        from '${base}/use/${geo}.parquet' where ${where(p, base)} group by all
      ) group by all`
    : `select ${keys}, sum(chm) chm, sum(prd) prd from '${base}/summary/${geo}.parquet' where ${where(p, base)} group by all`;

// one row per geography (left join: geographies without use get null lbs), same columns as the old API
export const mapQuery = (geo: Geo, p: Params, base = DATA_URL) => {
  const demog =
    Object.entries(DEMOG)
      .filter(([k]) => k in p)
      .map(([k, [col, op]]) => `${col} ${op} ${Number(p[k])}`)
      .join(" and ") || "true";
  // intensity from the rounded lbs, matching the old API exactly
  return `select g.geo "${DATA_ID[geo]}", g.* exclude (geo, sqmi),
      round(u.chm, 2) lbs_chm_used, round(u.prd, 2) lbs_prd_used,
      round(round(u.chm, 2) / g.sqmi, 2) ai_intensity, round(round(u.prd, 2) / g.sqmi, 2) prd_intensity
    from '${base}/geo/${geo}.parquet' g left join (${poundsBy(geo, p, "geo", base)}) u using (geo)
    where ${demog}`;
};

// statewide monthly series from the county tables; `county` filter narrows it.
// Ordered by month: infillTimeseries zero-fills gaps by walking rows in date order.
export const timeseriesQuery = (series: Series, p: Params, base = DATA_URL) => {
  if (series === "product")
    return `select monthyear, prodno, round(chm, 2) lbs_chm_used, round(prd, 2) lbs_prd_used from (${poundsBy("county", p, "monthyear, prodno", base)}) order by monthyear, prodno`;
  if (series === "ai")
    return `select monthyear, chem_code, round(chm, 2) lbs_chm_used from (${poundsBy("county", p, "monthyear, chem_code", base)}) order by monthyear, chem_code`;
  // class keys are a chemical's pipe-joined classes ('INO|FUM'), as nectr returned them: cleanMultiCategoryData
  // splits them into the selected classes and their combinations, so a chemical in two selected classes is counted once
  const [col, name] = series === "usetype" ? ["ai_type_ID", "ai_type"] : ["major_category", "ai_class"];
  return `select monthyear, a.${col} ${name}, round(sum(chm), 2) lbs_chm_used
    from (${poundsBy("county", p, "monthyear, chem_code", base)}) u join '${base}/lookup/chem_attrs.parquet' a using (chem_code)
    group by all order by monthyear, ${name}`;
};
