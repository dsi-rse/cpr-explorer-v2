import { percentFormatter } from "../components/MapLegend";
import { FilterSpec } from "../types/state";
import {
  applicationFilters,
  geographyFilters,
  impactFilters,
  pesticideInfoFilters,
} from "./filters";
import * as d3 from "d3";
import { END_YEAR, START_YEAR } from "../dates";
import type { Geo } from "../utils/queries";

const demographicFilterKeys = [
  "Median Household Income",
  "Percent Black or African American",
  "Percent Hispanic or Latino",
  "Percent Non-Hispanic White",
  "Percent Asian",
  "Percent Native American",
  "Percent Native Hawaiian or Pacific Islander",
];

const mapKeys = [
  "Date Range",
  ...applicationFilters.filters.map((filter) => filter.label),
  ...pesticideInfoFilters.filters.map((filter) => filter.label),
  ...impactFilters.filters.map((filter) => filter.label),
  ...geographyFilters.filters.map((filter) => filter.label),
];
const demogViewKeys = [...demographicFilterKeys, ...mapKeys];
const ACS_ATTRIBTUION = "ACS 2021 5-year estiamtes, 2020 Census Geos";

export const mapLayers: {
  label: string;
  dataColumn: string;
  attribution: string;
  colorScheme?: readonly string[] | string[];
  tooltipKeys?: Record<string, string>;
  tooltipFormatter?: (value: any) => string;
}[] = [
  {
    label: "Pounds of Chemicals Applied",
    dataColumn: "lbs_chm_used",
    attribution: `CDPR PUR ${START_YEAR}-${END_YEAR}; 2020 Census Geos`,
    tooltipKeys: {
      lbs_chm_used: "Pounds of Chemicals Applied",
    },
  },
  {
    label: "Pounds of Product Applied",
    dataColumn: "lbs_prd_used",
    attribution: `CDPR PUR ${START_YEAR}-${END_YEAR}; 2020 Census Geos`,
    tooltipKeys: {
      lbs_prd_used: "Pounds of Product Applied",
    },
  },
  {
    label: "AI Intensity (lbs/sq mi)",
    dataColumn: "ai_intensity",
    attribution: `CDPR PUR ${START_YEAR}-${END_YEAR}; 2020 Census Geos`,
    tooltipKeys: {
      ai_intensity: "AI Intensity (lbs/sq mi)",
    },
  },
  {
    label: "Product Intensity (lbs/sq mi)",
    dataColumn: "prd_intensity",
    attribution: `CDPR PUR ${START_YEAR}-${END_YEAR}; 2020 Census Geos`,
    tooltipKeys: {
      prd_intensity: "Product Intensity (lbs/sq mi)",
    },
  },
  {
    label: "Total Population",
    dataColumn: "Pop Total",
    attribution: ACS_ATTRIBTUION,
    colorScheme: d3.schemeYlGnBu[5],
    tooltipKeys: {
      "Pop Total": "Total Population",
    },
  },
  {
    label: "Percent Black or African American",
    dataColumn: "Pct NH Black",
    attribution: ACS_ATTRIBTUION,
    colorScheme: d3.schemePurples[5],
    tooltipKeys: {
      "Pct NH Black": "Percent Black or African American",
    },
    tooltipFormatter: (v: number) => isNaN(v) ? `${v}` :percentFormatter(v/100)
  },
  {
    label: "Percent Hispanic or Latino",
    dataColumn: "Pct Hispanic",
    attribution: ACS_ATTRIBTUION,
    colorScheme: d3.schemeOranges[5],
    tooltipKeys: {
      "Pct Hispanic": "Percent Hispanic or Latino",
    },
    tooltipFormatter: (v: number) => isNaN(v) ? `${v}` :percentFormatter(v/100)
  },
  // "Percent Non-Hispanic White",
  // "Percent Asian",
  // "Percent Native American",
  // "Percent Native Hawaiian or Pacific Islander",
  {
    label: "Percent Non-Hispanic White",
    dataColumn: "Pct NH White",
    attribution: ACS_ATTRIBTUION,
    colorScheme: d3.schemeBlues[5],
    tooltipKeys: {
      "Pct NH White": "Percent Non-Hispanic White",
    },
    tooltipFormatter: (v: number) => isNaN(v) ? `${v}` :percentFormatter(v/100)
  },
  {
    label: "Percent Non-Hispanic Asian",
    dataColumn: "Pct NH Asian",
    attribution: ACS_ATTRIBTUION,
    colorScheme: d3.schemeGreens[5],
    tooltipKeys: {
      "Pct NH Asian": "Percent Asian",
    },
    tooltipFormatter: (v: number) => isNaN(v) ? `${v}` :percentFormatter(v/100)
  },
  {
    label: "Percent Non-Hispanic American Indian and Alaska Native",
    dataColumn: "Pct NH AIAN",
    attribution: ACS_ATTRIBTUION,
    colorScheme: d3.schemeReds[5],
    tooltipKeys: {
      "Pct NH AIAN": "Percent American Indian and Alaska Native",
    },
    tooltipFormatter: (v: number) => isNaN(v) ? `${v}` :percentFormatter(v/100)
  },
  {
    label: "Percent Non-Hispanic Native Hawaiian and Pacific Islander",
    dataColumn: "Pct NH NHPI",
    attribution: ACS_ATTRIBTUION,
    colorScheme: d3.schemeOranges[5],
    tooltipKeys: {
      "Pct NH NHPI": "Percent Native Hawaiian and Pacific Islander",
    },
    tooltipFormatter: (v: number) => isNaN(v) ? `${v}` :percentFormatter(v/100)
  },
  {
    label: "Percent With Less Than High School",
    dataColumn: "Pct No High School",
    attribution: ACS_ATTRIBTUION,
    colorScheme: d3.schemeReds[5],
    tooltipKeys: {
      "Pct No High School": "Percent With Less Than High School",
    },
    tooltipFormatter: (v: number) => isNaN(v) ? `${v}` :percentFormatter(v/100)
  },
  {
    label: "Percent Working in Agriculture",
    dataColumn: "Pct Agriculture",
    attribution: ACS_ATTRIBTUION,
    colorScheme: d3.schemeGreens[5],
    tooltipKeys: {
      "Pct Agriculture": "Percent Working in Agriculture",
    },
    tooltipFormatter: (v: number) => isNaN(v) ? `${v}` :percentFormatter(v/100)
  },
];
export const MapLayerOptions = mapLayers.map((layer) => layer.label);

export const getMapConfig = (view: string): {
  layer: string;
  tileset: string;
  geo: Geo;
  tileId: string;
  dataId: string;
  filterKeys?: string[];
  tooltipKeys?: Record<string, string>;
  sortKeys?: string | string[];
}[] => [
  {
    layer: "Townships",
    tileset: "cpr2024.62lnnt0z",
    geo: "township",
    tileId: "MeridianTownshipRange",
    dataId: "MeridianTownshipRange",
    sortKeys: "MeridianTownshipRange",
    filterKeys: view === 'map' ? mapKeys : demogViewKeys,
    tooltipKeys: {
      MeridianTownshipRange: "MeridianTownshipRange",
    },
  },
  {
    layer: "Counties",
    tileset: "cpr2024.47ns3kc2",
    geo: "county",
    tileId: "GEOID",
    dataId: "FIPS",
    sortKeys: "Area Name",
    filterKeys: [...view === 'map' ? mapKeys : demogViewKeys, "Agricultural Use"],
    tooltipKeys: {
      "Area Name": "Name",
      GEOID: "GEOID",
    },
  },
  {
    layer: "School Districts",
    tileset: "cpr2024.5i4j8yha",
    geo: "school",
    tileId: "FIPS",
    dataId: "FIPS",
    filterKeys: view === 'map' ? mapKeys : demogViewKeys,
    sortKeys: "Area Name",
    tooltipKeys: {
      "Area Name": "Name",
      FIPS: "FIPS",
    },
  },
  {
    layer: "Tracts",
    tileset: "cpr2024.0n14fhc6",
    geo: "tract",
    tileId: "GEOID",
    dataId: "GEOID",
    filterKeys: view === 'map' ? mapKeys : demogViewKeys,
    sortKeys: ["NAMELSADCO", "NAMELSAD"],
    tooltipKeys: {
      NAMELSADCO: "County",
      NAMELSAD: "Name",
      GEOID: "GEOID",
    },
  },
  {
    layer: "Sections",
    tileset: "cpr2024.atj2mdo6",
    geo: "section",
    tileId: "CO_MTRS",
    dataId: "comtrs",
    sortKeys: "comtrs",
    filterKeys: view === 'map' ? mapKeys : demogViewKeys,
    tooltipKeys: { NAMELSAD: "Name", REGIONNAME: "Region", comtrs: "CO_MTRS" },
  },
  {
    layer: "Zip Codes",
    tileset: "cpr2024.3w98sm2d",
    geo: "zip",
    tileId: "ZCTA5CE20",
    dataId: "Zip Code",
    sortKeys: "Zip Code",
    filterKeys: view === 'map' ? mapKeys : demogViewKeys,
    tooltipKeys: { 'Zip Code': "Zip Code", USPS_ZIP_PREF_CITY: "City" },
  },
];

export const getMapConfigFilterSpec: (view:string) => FilterSpec = (view) => ({
  queryParam: "na",
  label: "Geography",
  component: "dropdown",
  options: {
    type: "static",
    values: getMapConfig(view).map((config) => ({
      value: config.layer!,
      label: config.layer!,
    })),
  },
})
