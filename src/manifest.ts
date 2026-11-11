// Which data build the site shows. Each build is an immutable v<date>-<time>/ folder on R2; the cpr repo's
// Build data workflow points /preview.json at it and Publish data points /manifest.json at it, so a data update
// needs no FE deploy. main.tsx awaits loadManifest() before importing App: the config modules read the years
// when they're first evaluated.

// bucket root. VITE_DATA_URL overrides it, e.g. a local copy of the bucket. (?. because import.meta.env is
// undefined under tsx, which runs scripts/parity.ts.)
export const DATA_HOST: string = (import.meta.env?.VITE_DATA_URL || "https://pesticide.cdn.uchicago-dsi.org").replace(/\/$/, "");

export const PREVIEW = typeof location !== "undefined" && new URLSearchParams(location.search).has("preview");
export let DATA_URL: string; // ${DATA_HOST}/<version>, the folder every query and lookup reads
export let VERSION: string;
export let START_YEAR: number;
export let END_YEAR: number;

export const loadManifest = async () => {
  const file = `${DATA_HOST}/${PREVIEW ? "preview" : "manifest"}.json`;
  const res = await fetch(file);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const m = await res.json();
  // cpr bumps format when the files change shape, so the FE can refuse builds it wasn't written for
  if (m.format !== 1) throw new Error(`data version ${m.version} has format ${m.format}; this explorer reads format 1`);
  ({ version: VERSION, start_year: START_YEAR, end_year: END_YEAR } = m);
  DATA_URL = `${DATA_HOST}/${VERSION}`;
};
