import React from "react";
import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getDb, query } from "../utils/db";
import { DATA_URL, mapQuery, type Geo, type Params } from "../utils/queries";

// Live check of the explorer's numbers against CalPIP query exports in public/groundtruth/csv_records.
// Each comparison runs the same map query the explorer runs, in the browser, against the current data.
type Comparison = {
  name: string;
  file: string; // CalPIP export id
  geo: Geo;
  params: Params;
  truthCols: [string, string]; // CalPIP [AI lbs, product lbs]
  join?: [string, string]; // [explorer key, CalPIP key] for per-area r²
  tolerance?: number; // max |total difference|, default 1%
};

const COUNTY_COLS: [string, string] = ["SUM_LBS_CHEMICAL", "SUM_LBS_PRODUCT"];
const SECTION_COLS: [string, string] = ["POUNDS_CHEMICAL_APPLIED", "POUNDS_PRODUCT_APPLIED"];
// DPR county codes are the counties in alphabetical order, as are California's odd FIPS codes
const BY_COUNTY: [string, string] = [`(right("FIPS", 3)::int + 1) // 2`, "COUNTY_CODE::int"];
const BY_SECTION: [string, string] = ["comtrs", "COMTRS"];
const year = (y: number) => ({ start: `${y}-01`, end: `${y}-12` });
const statewide2020 = (geo: Geo, name: string, tolerance?: number): Comparison => ({
  name: `2020 ag, statewide total by ${name}`,
  file: "12495048391211_241206085403",
  geo,
  params: { ...year(2020), usetype: "AG" },
  truthCols: COUNTY_COLS,
  tolerance,
});

const COMPARISONS: Comparison[] = [
  { name: "2022 all use, by county", file: "12472378904908_241206074018", geo: "county", params: { ...year(2022), usetype: "*" }, truthCols: COUNTY_COLS, join: BY_COUNTY },
  { name: "2023 all use, by county", file: "140488361239316_260313130416", geo: "county", params: { ...year(2023), usetype: "*" }, truthCols: COUNTY_COLS, join: BY_COUNTY },
  { name: "2022 non-ag, by county", file: "12472378904908_241206074507", geo: "county", params: { ...year(2022), usetype: "NON-AG" }, truthCols: COUNTY_COLS, join: BY_COUNTY },
  { name: "2023 non-ag, by county", file: "140488361239316_260313130447", geo: "county", params: { ...year(2023), usetype: "NON-AG" }, truthCols: COUNTY_COLS, join: BY_COUNTY },
  { name: "2020 ag, by county", file: "12495048391211_241206085403", geo: "county", params: { ...year(2020), usetype: "AG" }, truthCols: COUNTY_COLS, join: BY_COUNTY },
  statewide2020("tract", "census tract"),
  statewide2020("school", "school district"),
  // some sections fall in no ZCTA, so zip totals run ~1.9% low by construction
  statewide2020("zip", "ZCTA", 0.03),
  statewide2020("township", "township"),
  statewide2020("section", "section"),
  { name: "2020 Sacramento alfalfa (ag), by section", file: "12472378904908_241206074829", geo: "section", params: { ...year(2020), usetype: "AG", site: "23001", county: "34" }, truthCols: SECTION_COLS, join: BY_SECTION },
  { name: "2023 Sacramento alfalfa (ag), by section", file: "142340312794115_260318072125", geo: "section", params: { ...year(2023), usetype: "AG", site: "23001", county: "34" }, truthCols: SECTION_COLS, join: BY_SECTION },
  { name: "2020 Sacramento mineral oil (ag)", file: "12489387854613_241206083511", geo: "county", params: { ...year(2020), usetype: "AG", county: "34", chemical: "401" }, truthCols: COUNTY_COLS },
];

const truthUrl = (file: string) => `${import.meta.env.BASE_URL}groundtruth/csv_records/${file}.txt`;

type Result = {
  ours_chm: number;
  ours_prd: number;
  truth_chm: number;
  truth_prd: number;
  r2_chm: number | null;
  r2_prd: number | null;
  ms: number;
};

const runComparison = async (c: Comparison): Promise<Result> => {
  const t0 = performance.now();
  const res = await fetch(truthUrl(c.file));
  if (!res.ok) throw new Error(`${truthUrl(c.file)}: ${res.status}`);
  await (await getDb()).registerFileText(`${c.file}.txt`, await res.text());
  const [tc, tp] = c.truthCols;
  // no join key: joining on null matches nothing, so r² comes back null
  const [ourKey, truthKey] = c.join ?? ["null", "null"];
  const [row] = await query(`with
    o as (select ${ourKey} k, lbs_chm_used chm, lbs_prd_used prd from (${mapQuery(c.geo, c.params)})),
    t as (select ${truthKey} k, sum(${tc}) chm, sum(${tp}) prd
          from read_csv('${c.file}.txt', delim='\\t', nullstr='N/A', header=true) group by k),
    j as (select o.chm oc, t.chm tc, o.prd op, t.prd tp from o join t using (k))
    select (select sum(chm) from o) ours_chm, (select sum(prd) from o) ours_prd,
      (select sum(chm) from t) truth_chm, (select sum(prd) from t) truth_prd,
      (select pow(corr(oc, tc), 2) from j) r2_chm, (select pow(corr(op, tp), 2) from j) r2_prd`);
  return { ...(row as Omit<Result, "ms">), ms: performance.now() - t0 };
};

const lbs = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });
const pct = (v: number) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;

export const Validation: React.FC = () => {
  const [results, setResults] = React.useState<Record<string, Result | Error>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      // one at a time: the DuckDB worker runs queries serially anyway, and rows fill in as they finish
      for (const c of COMPARISONS) {
        const result = await runComparison(c).catch((e: Error) => e);
        if (cancelled) return;
        setResults((r) => ({ ...r, [c.name]: result }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box sx={{ background: "white", p: 3, maxWidth: "75rem", mx: "auto" }}>
      <Typography component="h1" variant="h5" fontWeight="bold" gutterBottom>
        Data validation: Explorer vs. CalPIP
      </Typography>
      <Typography variant="body1" component="p" sx={{ fontSize: "0.9rem" }} gutterBottom>
        Each row re-runs an Explorer query in your browser, against the data the Explorer serves now, and compares it
        with a query exported from DPR's{" "}
        <a target="_blank" href="https://calpip.cdpr.ca.gov/main.cfm">
          California Pesticide Information Portal (CalPIP)
        </a>
        . Difference is (Explorer − CalPIP) / CalPIP over all areas. r² compares the per-area values where the
        CalPIP export has an area key.
      </Typography>
      <Typography variant="body2" component="p" color="text.secondary" gutterBottom>
        Data: <code>{DATA_URL}</code>
      </Typography>

      <Table size="small" sx={{ mt: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>Comparison</TableCell>
            <TableCell>Pounds</TableCell>
            <TableCell align="right">Explorer</TableCell>
            <TableCell align="right">CalPIP</TableCell>
            <TableCell align="right">Difference</TableCell>
            <TableCell align="right">r²</TableCell>
            <TableCell>Result</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {COMPARISONS.map((c) => {
            const r = results[c.name];
            const label = (
              <TableCell rowSpan={2} sx={{ verticalAlign: "top" }}>
                <strong>{c.name}</strong>
                <br />
                <Typography variant="caption" color="text.secondary">
                  <a href={truthUrl(c.file)} target="_blank">
                    CalPIP export {c.file}
                  </a>
                  {r && !(r instanceof Error) && ` · ${Math.round(r.ms)} ms`}
                </Typography>
              </TableCell>
            );
            if (!r || r instanceof Error)
              return (
                <TableRow key={c.name}>
                  {React.cloneElement(label, { rowSpan: 1 })}
                  <TableCell colSpan={6}>
                    {r ? <Typography color="error">{r.message}</Typography> : <CircularProgress size="1rem" />}
                  </TableCell>
                </TableRow>
              );
            return (["chm", "prd"] as const).map((m, i) => {
              const [ours, truth, r2] = [r[`ours_${m}`], r[`truth_${m}`], r[`r2_${m}`]];
              const diff = (ours - truth) / truth;
              const ok = Math.abs(diff) <= (c.tolerance ?? 0.01) && (r2 == null || r2 >= 0.9);
              return (
                <TableRow key={c.name + m}>
                  {i === 0 && label}
                  <TableCell>{m === "chm" ? "Active ingredient" : "Product"}</TableCell>
                  <TableCell align="right">{lbs(ours)}</TableCell>
                  <TableCell align="right">{lbs(truth)}</TableCell>
                  <TableCell align="right">{pct(diff)}</TableCell>
                  <TableCell align="right">{r2 == null ? "–" : r2.toFixed(4)}</TableCell>
                  <TableCell sx={{ color: ok ? "success.main" : "error.main", fontWeight: "bold" }}>
                    {ok ? "Match" : "Differs"}
                  </TableCell>
                </TableRow>
              );
            });
          })}
        </TableBody>
      </Table>

      <Typography component="h2" variant="h6" fontWeight="bold" sx={{ mt: 3 }}>
        Known differences
      </Typography>
      <Typography variant="body1" component="div" sx={{ fontSize: "0.9rem" }}>
        <ul>
          <li>
            A match is a total within 1% (3% for ZCTAs) and, where per-area values exist, r² of at least 0.9.
          </li>
          <li>
            CalPIP's query tool collapses active-ingredient rows within one application when they have identical pounds
            and percent (for example propiconazole and tebuconazole in WOLMAN E), so it undercounts product pounds for
            some multi-AI products. The Explorer counts each product application once, in full; this is why Mendocino
            County product pounds run about 21% above CalPIP.
          </li>
          <li>
            The 2022 CalPIP exports are from December 2024; DPR has revised the data since. Expect about 0.4% drift for
            2022 until they are re-pulled.
          </li>
          <li>ZCTA totals run about 1.9% low by construction: some sections fall in no ZCTA.</li>
        </ul>
      </Typography>
    </Box>
  );
};
