import { Box, Button, styled, Typography } from "@mui/material";
import { WidgetContainer } from "./WidgetContainer";
import React from "react";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import { END_YEAR } from "../dates";

const InlineCode = styled("code")({
  backgroundColor: "#f4f4f4",
  padding: "0.2rem",
  borderRadius: "0.2rem",
  fontFamily: "monospace",
});

const LogoContainer = styled(Box)`
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  width: 100%;
  flex-wrap: wrap;
  @media (max-width: 600px) {
    flex-direction: column;
  }
  img {
    height: 4rem;
    width: auto;
    margin: 1rem 0;
  }
`;

const references = {
  "areal-interpolation": [
    {
      name: "Markoff and Shapiro, 1973",
      link: "https://www.tandfonline.com/doi/epdf/10.1080/00182494.1973.10112670",
    },
    {
      name: "Crackel, 1975",
      link: "https://www.tandfonline.com/doi/pdf/10.1080/00182494.1975.10112707",
    },
    {
      name: "Tobler, 1979",
      link: "https://www.tandfonline.com/doi/abs/10.1080/01621459.1979.10481647",
    },
    {
      name: "Lam, 1983",
      link: "https://www.tandfonline.com/doi/abs/10.1559/152304083783914958",
    },
    {
      name: "Gotway and Young, 2002",
      link: "https://www.tandfonline.com/doi/abs/10.1198/016214502760047140?casa_token=YgEHY",
    },
  ],
};

const Reference: React.FC<{ id: keyof typeof references }> = ({ id }) => {
  // list of a elements inline
  if (!references[id]) return <></>;

  const refs = references[id].map((ref, i) => (
    <span style={{ display: "inline" }} key={i}>
      <a
        style={{ display: "inline" }}
        href={ref.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {ref.name}
      </a>
      {i < references[id].length - 1 ? "; " : ""}
    </span>
  ));
  return (
    <Typography variant="body1" display="inline">
      ({refs})
    </Typography>
  );
};

const arealSteps = [
  {
    imagePath: "/assets/explainer-01.png",
    title: "Areal Interpolation Problem",
    text: "The areal interpolation problem is a method to combine data from different spatial units. Imagine we want to assign the pesticide use in a section that overlaps two school districts.",
  },
  {
    imagePath: "/assets/explainer-02.png",
    title: "Calculate Original Area",
    text: "First we calculate the area of the section. In this case, the section is roughly 1 square mile.",
  },
  {
    imagePath: "/assets/explainer-03.png",
    title: "Overlay and Calculate Proportions",
    text: "Next, we calculate how much of the section is in the two (or more) school districts. In this case, the section is 70% in School District 1 and 30% in School District 2.",
  },
  {
    imagePath: "/assets/explainer-04.png",
    title: "Assign Values to Census Areas",
    text: "Last, we assign the value from the section to the two school districts as a proportion weighted by the overlap. Imagine that there are 210lbs used in the section. We assign 70% of that to School District 1 (147lb = 210lbs * 0.7) and 30% to School District 2 (63lbs = 210lbs * 0.3).",
  },
];
const ArealExplainer: React.FC = () => {
  const [step, setStep] = React.useState(0);
  return (
    <Box
      sx={{
        width: "100%",
        background: "white",
        border: "1px solid gray",
        boxShadow: "0 0 5px rgba(0,0,0,0.1)",
        my: 2,
      }}
    >
      <Box
        p={2}
        my={2}
        component={"div"}
        sx={{ width: "100%", boxSizing: "border-box" }}
      >
        <img
          src={arealSteps[step].imagePath}
          alt={arealSteps[step].title}
          style={{
            width: "100%",
            height: "auto",
            maxWidth: "800px",
            margin: "0 auto",
            display: "block",
          }}
        />
        <Typography component={"h4"}>{arealSteps[step].text}</Typography>
      </Box>
      <Stepper activeStep={step} alternativeLabel>
        {arealSteps.map((step) => (
          <Step key={step.title} onClick={() => console.log(step)}>
            <StepLabel>{step.title}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ display: "flex", flexDirection: "row", pt: 2 }}>
        <Button
          color="inherit"
          disabled={step === 0}
          onClick={() => setStep((prev) => (prev - 1 >= 0 ? prev - 1 : prev))}
          sx={{ mr: 1 }}
        >
          Back
        </Button>
        <Box sx={{ flex: "1 1 auto" }} />
        <Button
          disabled={step === arealSteps.length - 1}
          onClick={() =>
            setStep((prev) => (prev + 1 < arealSteps.length ? prev + 1 : prev))
          }
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export const AboutWidget = () => {
  return (
    <WidgetContainer
      style={{
        maxHeight: "calc(100vh - 70px)",
        overflow: "auto",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        flexDirection="column"
        gap={2}
        p={4}
        pb={24}
        maxWidth="800px"
        margin="0 auto"
      >
        <Typography component={"h3"} fontSize={"1.5rem"} fontWeight={"bold"}>
          About
        </Typography>
        <Typography variant="body1">
          The California People and Pesticides Explorer is a one-of-a-kind tool
          that makes it easier to view, map, and download California&#x27;s
          pesticide use report data, and serves as a resource for scientists,
          growers, advocates, and the general public.  This interactive data tool
          links pesticide use data with community demographic data and makes
          data available at common census geographies, from townships to zip
          codes and counties.
          <br />
          <br />
          This project was developed by{" "}
          <a
            href="https://www.pesticidereform.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Californians for Pesticide Reform
          </a>{" "}
          and{" "}
          <a
            href="https://www.panna.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pesticide Action &amp; Agroecology Network
          </a>{" "}
          North America, with the{" "}
          <a
            href="https://datascience.uchicago.edu/research/open-spatial-lab/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Spatial Lab
          </a>{" "}
          at the{" "}
          <a
            href="https://datascience.uchicago.edu/"
            target="_blank"
            rel="noopener noreferrer"
          >
            University of Chicago Data Science Institute
          </a>{" "}
          . Support was provided by the Robert Wood Johnson Foundation and 11th
          Hour Foundation. The views expressed here do not necessarily reflect
          the views of the Foundations.
        </Typography>
        <LogoContainer>
          <a
            href="https://www.panna.org/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img src="/assets/pan-logo.png" alt="Logo for PANNA" />
          </a>
          <a
            href="https://www.pesticidereform.org/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img src="/assets/CPR Logo.png" alt="Logo for CPR" />
          </a>
          <a
            href="https://datascience.uchicago.edu/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img src="/assets/dsi-logo.png" alt="Logo for UChicago DSI" />
          </a>
        </LogoContainer>

        <Typography component={"h4"} fontWeight={"bold"}>
          Data Description
        </Typography>
        <Typography component={"h5"} fontWeight={"bold"}>
          Pesticide Use Data
        </Typography>
        <Typography variant="body1">
          California&#x27;s{" "}
          <a href="https://www.cdpr.ca.gov/docs/pur/purmain.htm">
            Pesticide Use Report (PUR) program
          </a>{" "}
          has collected data on California&#x27;s agriculture and many
          non-agriculture pesticide uses across the state since 1970 through
          present day. PUR data for this tool was accessed from the{" "}
          <strong>
            {" "}
            <a target="_blank" href="https://calpip.cdpr.ca.gov/main.cfm">
              California Pesticide Information Portal (CalPIP).
            </a>{" "}
          </strong>{" "}
          PUR data are managed and collected by California's Department of
          Pesticide Regulation, and it is updated about once per year. More
          information is available from{" "}
          <a
            target="_blank"
            href="https://www.cdpr.ca.gov/docs/pur/purmain.htm"
          >
            CA DPR
          </a>
          . Data on adjuvant use is not made publicly available. The California
          PUR data are updated in this tool within six months of release by DPR.
          The <a href="?page=validation">data validation page</a> compares this
          tool's totals with CalPIP query exports, live.
          <br />
          <br />
          This interactive data tool enables users to filter or summarize
          publicly-available California PUR data based on the following
          parameters:
          <ul>
            <li>
              Geography (townships, counties, school districts, tracts,
              sections, zip codes)
            </li>
            <li>Agricultural or Non-Agricultural use</li>
            <li>Date range</li>
            <li>Crop or site</li>
            <li>Application method (aerial, ground, fumigation, or other)</li>
            <li>
              Chemical and Product Information: (chemical class, active
              ingredients, product and use type)
            </li>
            <li>
              Health/Environmental Impact: (carcinogen, cholinesterase
              inhibitor, groundwater contaminant, reproductive toxin, restricted
              material, toxic air contaminant)
            </li>
          </ul>
          <br />
          <Typography component={"h5"} fontWeight={"bold"}>
            Pesticide Category Data
          </Typography>
          <br />
          The pesticide category data include the following categorizations:
          <ul>
            <li>
              <b>Chemical Class</b>: The major category of the active
              ingredient, such as amide, inorganic, or oil
            </li>
            <li>
              <b>Use Type</b>: The use type of the active ingredient, such as
              fungicide or insecticide
            </li>
            <li>
              <b>Health/Environmental Impact</b>: The health and environmental
              impact of the active ingredient, such as carcinogen or
              reproductive health impact
            </li>
          </ul>
          <br />
          These categories help filter and summarize the data based on the
          characteristics of the active ingredients.
          <br />
          <br />
          <Typography component={"h5"} fontWeight={"bold"}>
            Spatial Data (GIS)
          </Typography>
          <br />
          Spatial data enables users to query data based on the following areas,
          or spatial units:
          <br />
          <ul>
            <li>Townships</li>
            <li>Counties</li>
            <li>
              School districts: elementary, secondary, and unified school
              districts
            </li>
            <li>Census Tracts</li>
            <li>Sections</li>
            <li>Zip Codes (Zip Code Tabulation Areas/ZCTA)</li>
          </ul>
          <br />
          <Typography component={"h5"} fontWeight={"bold"}>
            Demographic Data:
          </Typography>
          <br />
          Community and demographic data allow users to better understand the
          impact of pesticide use on different populations locally and across
          the state. Demographic data can be accessed through{" "}
          <a
            target="_blank"
            href="https://www.google.com/url?q=https://data.census.gov/&amp;sa=D&amp;source=editors&amp;ust=1734559247939420&amp;usg=AOvVaw3mS3ArvzDohkKeKBxiwJoN"
          >
            Census website
          </a>{" "}
          or tools like{" "}
          <a
            target="_blank"
            href="https://www.google.com/url?q=https://www.census.gov/programs-surveys/acs/data/data-via-api.html&amp;sa=D&amp;source=editors&amp;ust=1734559247939748&amp;usg=AOvVaw2ypK-Yb2YZF7esoqAVUlH4"
          >
            Census API
          </a>{" "}
          or{" "}
          <a
            target="_blank"
            href="https://www.google.com/url?q=https://www.socialexplorer.com/explore-maps&amp;sa=D&amp;source=editors&amp;ust=1734559247940180&amp;usg=AOvVaw0_Mvb51vbgctfJ-XRBwcYE"
          >
            Social Explorer
          </a>
          . Demographic data available to filter includes:
          <br />
          <ul>
            <li>
              <b>Total Population:</b> American Community Survey (ACS) 2021
              5-Year Average
            </li>
            <li>
              <b>Percent Black or African American</b>: American Community
              Survey (ACS) 2021 5-Year Average, non-Hispanic Black or African
              American Population divided by Total Population
            </li>
            <li>
              <b>Percent Hispanic or Latino</b>: American Community Survey (ACS)
              2021 5-Year Average, Hispanic or Latino Population divided by
              Total Population
            </li>
            <li>
              <b>Percent White (non-Hispanic)</b>: American Community Survey
              (ACS) 2021 5-Year Average, non-Hispanic White Population divided
              by Total Population
            </li>
            <li>
              <b>Percent Asian (non-Hispanic)</b>: American Community Survey
              (ACS) 2021 5-Year Average, non-Hispanic Asian Population divided
              by Total Population
            </li>
            <li>
              <b>Percent American Indian and Alaska Native (non-Hispanic)</b>:
              American Community Survey (ACS) 2021 5-Year Average, non-Hispanic
              American Indian and Alaska Native Population divided by Total
              Population
            </li>
            <li>
              <b>
                Percent Native Hawaiian and Other Pacific Islander
                (non-Hispanic)
              </b>
              : American Community Survey (ACS) 2021 5-Year Average,
              non-Hispanic Native Hawaiian and Other Pacific Islander Population
              divided by Total Population
            </li>
            <li>
              <b>Percent with less than High School</b>: Population over 25
              without a high school degree, American Community Survey (ACS) 2021
              5-Year Average
            </li>
            <li>
              <b>Percent Working in Agriculture</b>: Population over 16 working
              in agriculture, American Community Survey (ACS) 2021 5-Year
              Average
            </li>
            <li>
              <b>Median Household Income</b>:American Community Survey (ACS)
              2021 5-Year Average
            </li>
          </ul>
          <Typography component={"h5"} fontWeight={"bold"}>
            Data References
          </Typography>
          <ul>
            <li>
              CalPIP Home - California Pesticide Information Portal [WWW
              Document], 2024. URL{" "}
              <a
                target="_blank"
                href="https://www.google.com/url?q=https://calpip.cdpr.ca.gov/main.cfm&amp;sa=D&amp;source=editors&amp;ust=1734559247942088&amp;usg=AOvVaw0DQdAykVxpJWY2qvrHk0Gt"
              >
                https://calpip.cdpr.ca.gov/main.cfm
              </a>{" "}
              (accessed 9.5.24).
            </li>
            <li>
              Pesticide Use Reporting [WWW Document], {END_YEAR}, URL{" "}
              <a
                target="_blank"
                href="https://www.google.com/url?q=https://www.cdpr.ca.gov/docs/pur/purmain.htm&amp;sa=D&amp;source=editors&amp;ust=1734559247942635&amp;usg=AOvVaw3EwVIQ2dgTRQXciEECxLJ-"
              >
                https://www.cdpr.ca.gov/docs/pur/purmain.htm
              </a>{" "}
              (accessed 9.5.24).
            </li>
            <li>
              Social Explorer - Tables - ACS 2021 (5-Year Estimates) [WWW
              Document], 2021. Social Explorer. URL{" "}
              <a
                target="_blank"
                href="https://www.google.com/url?q=https://www.socialexplorer.com/explore-maps&amp;sa=D&amp;source=editors&amp;ust=1734559247942990&amp;usg=AOvVaw0-7L5lWYvRLhGtgSXw-1VI"
              >
                https://www.socialexplorer.com/explore-maps
              </a>{" "}
              (accessed 9.5.24).
            </li>
            <li>
              US Census Bureau, 2020. TIGER/Line Shapefiles [WWW Document].
              Census.gov. URL{" "}
              <a
                target="_blank"
                href="https://www.google.com/url?q=https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html&amp;sa=D&amp;source=editors&amp;ust=1734559247965935&amp;usg=AOvVaw0f3F_GLoUYT-m0vKpPw5DI"
              >
                https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html
              </a>{" "}
              (accessed 9.5.24).
            </li>
          </ul>
        </Typography>
        <Typography component={"h4"} fontWeight="bold">
          Data Methods &amp; Processing
        </Typography>
        <Typography variant="body1">
          Data processing for this tool included the following steps:
          <ol>
            <li>Data accessed from CalPip via web interface and downloaded</li>
            <li>
              Data converted from <InlineCode>txt</InlineCode> format to Apache
              Parquet with the following columns retained:
              <InlineCode>COMTRS</InlineCode>,{" "}
              <InlineCode>POUNDS_CHEMICAL_APPLIED</InlineCode>,{" "}
              <InlineCode>POUNDS_PRODUCT_APPLIED</InlineCode>,{" "}
              <InlineCode>AERIAL_GROUND_INDICATOR</InlineCode>,{" "}
              <InlineCode>AG_NONAG</InlineCode>,{" "}
              <InlineCode>AMOUNT_PLANTED</InlineCode>,{" "}
              <InlineCode>CHEMICAL_CODE</InlineCode>,{" "}
              <InlineCode>COUNTY_CODE</InlineCode>,{" "}
              <InlineCode>PRODUCT_CHEMICAL_PERCENT</InlineCode>,{" "}
              <InlineCode>PRODUCT_NUMBER</InlineCode>,{" "}
              <InlineCode>SITE_CODE</InlineCode>,{" "}
              <InlineCode>USE_NUMBER</InlineCode>{" "}
            </li>
            <li>
              Date converted to ISO format <InlineCode>YYYY-MM</InlineCode>{" "}
              (column name: <InlineCode>monthyear</InlineCode>) for easier
              sorting and filtering
            </li>
            <li>
              Use number converted to a use_id that includes the date and
              geographic identifier. This enhances the CalPip{" "}
              <InlineCode>USE_NUMBER</InlineCode> column, which has collisions
              across years.
            </li>
            <li>
              Data are joined to active ingredient classes, types, and other
              characteristics based on the AI Categories table provided by the
              California Department of Pesticide Regulation (DPR)
            </li>
          </ol>
          For section-level data, no further processing is applied.
          <br />
          <br />
          For census geographic units, additional processing is required to
          connect the PUR data census areas. The data are processed using areal
          interpolation, a method to estimate the proportion of a section that
          falls within each census geography. This method is widely used in
          spatial data analysis to estimate the proportion of an area that falls
          within a specific area of interest. This process has been used in
          numerous scholarly publications <Reference id="areal-interpolation" />
          .
          <br />
          <br />
          Use the below interactive tool for a simplified explanation of the
          approach to areal interpolation:
          <ArealExplainer />
          {/* section level PUR data was joined to the
          relevant geographic units. This process applied area interpolation to
          calculate the proportion of each section that falls within each
          geographic unit. The following geoprocessing steps were applied:
          <br />
          <ol>
            <li>
              Convert all geospatial data to NAD83 / California Albers
              projection (EPSG:3310)
            </li>
            <li>Calculate original area of each section (roughly 1 sq mi)</li>
            <li>Overlay section areas with census geographies</li>
            <li>
              Calculate the proportion of the section in each census geography
            </li>
            <li>
              To resolve topological data errors and optimize data, any section
              with at least 95% of its area in one census geography was applied
              fully to that census geography
            </li>
            <li>
              If a section was split between two census geographies, its pounds
              of chemical applied and pounds of product applied would be split
              between those two geographies as a portion of the area within
            </li>
          </ol> */}
          <br />
          <i>Technical Notes</i>
          <ul>
            <li>
              Geoprocessing was done in CRS EPSG:3310, California Albers Equal
              Area / NAD83.
            </li>
            <li>
              As with any data processing, there is inherent uncertainty added.
              Below the section level, we do not have specific data on where
              pesticide application occurs. Additionally, there is a roughly
              ~0.02% data uncertainty added to census tracts and school
              districts from rounding and geometry errors.
            </li>
            <li>
              For Zip Code Tabulation Areas (ZCTAs), around 2% of data are
              missing due to lack of total coverage from ZCTA boundaries.
            </li>
            <li>
              County, township, and section data are directly mapped to PUR data
              and have effectively no data uncertainty added in our processing.
            </li>
            <li>
              Census demographic data are joined based on relevant geographic
              identifier (GEOID, FIPS, or ZCTA).
            </li>
            <li>
              Pounds of product used are de-duplicated per each pesticide use based on a use
              id generated from the use number, date, and geography.
            </li>
          </ul>
          <br />
        </Typography>
        <Typography component={"h4"} fontWeight={"bold"}>
          Data Filtering
        </Typography>
        <Typography variant="body1">
          In filtering the data, the following filters match using a SQL{" "}
          <InlineCode>IN</InlineCode> where clause:
          <ol>
<li>
          Agricultural use: <InlineCode>usetype</InlineCode> (
              <InlineCode>AG_NONAG</InlineCode>) equals selected
            </li>
            <li>
              Application Method: <InlineCode>aerial_ground</InlineCode> (
              <InlineCode>AERIAL_GROUND_INDICATOR</InlineCode>) equals selected
            </li>
            <li>
              Crop or Site: <InlineCode>site_code</InlineCode> in selected site codes
            </li>

            <li>
              Active Ingredient Chemical Class: <InlineCode>ai_class</InlineCode> in
              selected active ingredient classes
            </li>
            <li>
              Active Ingredient (AI): <InlineCode>CHEMICAL_CODE</InlineCode> in
              selected active ingredient identifiers
            </li>
            <li>
              Product: <InlineCode>prodno</InlineCode> in selected product codes
            </li>
            <li>
              Active Ingredient Use Type: <InlineCode>ai_type</InlineCode> in
              selected active ingredient types
            </li>
            <li>
              Health / Environmental Impact: <InlineCode>health</InlineCode> contains one of the selected health or environmental impacts
            </li>
            <li>
              Geography: <InlineCode>county_fips</InlineCode> area within selected county
            </li>
          </ol>
          The following filters use a SQL greater than{" "}
          <InlineCode>{">"}</InlineCode> or less than{" "}
          <InlineCode>{"<"}</InlineCode> where clause:
          <ol>
            <li>
              Percent Black or African American:{" "}
              <InlineCode>pctblack</InlineCode> calculated from American
              Community Survey (ACS) 2021 5 Year-Average data Non-Hispanic Black
              or African American population divided by Total Population
            </li>
            <li>
              Percent Hispanic or Latino: <InlineCode>pcthispanic</InlineCode>{" "}
              calculated from American Community Survey (ACS) 2021 5
              Year-Average data Non-Hispanic Hispanic or Latino population
              divided by Total Population
            </li>
            <li>
              Median household income: <InlineCode>hhincome</InlineCode>{" "}
              American Community Survey (ACS) 2021 5 Year-Average data
            </li>
          </ol>
        </Typography>
        <Typography component={"h4"} fontWeight={"bold"}>
          Data Grouping
        </Typography>
        <Typography variant="body1">
          After filtering, the following data groupings are applied:
          <br />
          <br />
          <b>Map View</b>
          <br />
          <ol>
            <li>
              Township range: Grouped by Township range identifier and pounds of
              chemical and product summed
            </li>
            <li>
              County: Grouped by county identifier and pounds of chemical and
              product summed
            </li>
            <li>
              Tract: Grouped by tract identifier and pounds of chemical and
              product summed
            </li>
            <li>
              School district: Grouped by School district identifier and pounds
              of chemical and product summed
            </li>
            <li>
              Zip code tabulation area (ZCTA): Grouped by Zip code tabulation
              area (ZCTA) identifier and pounds of chemical and product summed
            </li>
            <li>
              Section: Grouped by COMTRS identifier and pounds of chemical and
              product summed
            </li>
          </ol>
          <b>Time series view</b>
          <br />
          <ol>
            <li>
              Chemical Class: Grouped by active ingredient Chemical Class and
              date (monthyear) and pounds of active ingredient summed
            </li>
            <li>
              Use Type: Grouped by active ingredient Use Type and date
              (monthyear) and pounds of active ingredient summed
            </li>
            <li>
              Active Ingredient: Grouped by active ingredient identifier and
              date (monthyear) and pounds of active ingredient summed
            </li>
            <li>
              Product: Grouped by product identifier and date (monthyear) and
              pounds of product summed
            </li>
          </ol>
        </Typography>
        <br />
      </Box>
    </WidgetContainer>
  );
};
