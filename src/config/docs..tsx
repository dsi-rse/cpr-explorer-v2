const dateAccessed = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const revision = `12-2024`
export const license = `
Data are licensed under the Creative Commons Attribution License 4.0 (CC-BY 4.0) (https://creativecommons.org/licenses/by/4.0/)

An appropriate attribution must accompany this data wherever it is used or published. Attribution should look like the following information:\n

Halpern, Dylan, Susan Paykin, PANNA, and CPR. PUR Data Explorer. Open Spatial Lab, Data Science Institute, 2023-2024. Accessed ${dateAccessed}. CPR Explorer, ${window.location.href}. Licensed under CC-BY 4.0.

Bibtex for citation managers such as Zotero:

@misc{halpern2024pur,
  author       = {Dylan Halpern and Susan Paykin and Pesticide Action Network North America and Californians for Pesticide Reform},
  title        = {PUR Data Explorer},
  year         = {2023--2024},
  note         = {Accessed: ${dateAccessed}},
  url          = {${window.location.href}},
  license      = {CC-BY},
  organization = {Open Spatial Lab, Data Science Institute, University of Chicago}
}
`

export const errata = `
Downloads prior to revision 12-2024 may contain the following errors:
- Overestimate of pounds of product applied due to a data duplication error for pesticides with multiple active ingredients
- Duplicate rows of the same ZIP codes and zip code data 
`
export const dataSources = `
Revision: ${revision}

Data Sources
--
California Department of Pesticide Regulation, 2022. AI Categories Table.
CalPIP Home - California Pesticide Information Portal [WWW Document], 2024. URL https://calpip.cdpr.ca.gov/main.cfm (accessed 9.5.24).
Pesticide Use Reporting [WWW Document], 2022. URL https://www.cdpr.ca.gov/docs/pur/purmain.htm (accessed 9.5.24).
Social Explorer - Tables - ACS 2021 (5-Year Estimates) [WWW Document], 2021. . Social Explorer. URL https://www.socialexplorer.com/explore-maps (accessed 9.5.24).
US Census Bureau, 2020. TIGER/Line Shapefiles [WWW Document]. Census.gov. URL https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html (accessed 9.5.24).

Errata 
--
Please note that data downloads prior to revision [11-2024-WORK-IN-PROGRESS] may contain overestimtions in the "lbs_prd_used" column.
`
const mapColumns = `
Data columns
--
- GEOID: Geographic Identifier [Census tracts and ZIP codes (ZCTA) only]
- FIPS: Federal Information Processing Standards [Counties, School Districts]
- TownshipRange: Township Range [Townships]
- comtrs: County-Municipality-Section [Sections]
- lbs_chm_used: Pounds of active ingredient chemcial used
- lbs_prd_used: Pounds of product used
- ai_intensity: Pounds of active ingredient per square mile of total area (not just growing area)
- prd_intensity: Pounds of product per square mile of total area (not just growing area)
`
const demographicColumns = `- Median HH Income: Median Household Income (2021 dollars)
- Pop Total: Total Population
- Pop NH Black: Total Black or African American Population (non hispanic)
- Pct NH Black: Percent Black or African American
- Pop Hispanic: Total Hispanic or Latino Population
- Pct Hispanic: Percent Hispanic or Latino
- Pop NH White: Total White Population (non-Hispanic)
- Pct NH White: Percent White (non-Hispanic)
- Pop NH Asian: Total Asian Population (non-Hispanic)
- Pct NH Asian: Percent Asian (non-Hispanic)
- Pop NH American Indian: Total American Indian Population (non-Hispanic)
- Pct NH American Indian: Percent American Indian (non-Hispanic)
- Pop NH Pacific Islander: Total Pacific Islander Population (non-Hispanic)
- Pct NH Pacific Islander: Percent Pacific Islander (non-Hispanic)
- Pct No High School: Percent of people over 25 with Less Than High School degree as their highest level of education
- Pct Agriculture: Percent of people working in Agriculture
`
export const dataDescription = {
map: `${mapColumns}${dataSources}
`,
mapDualView: `${mapColumns}${demographicColumns}${dataSources}
`,
timeseries: `
Data columns
--
- monthyear: Month and Year as YYYY-MM
- lbs_chm_used: Pounds of active ingredient chemcial used
- lbs_prd_used: Pounds of product used
- chem_code / use_type / ai_class / prodno: Chemical codes and types
${dataSources}
`
}