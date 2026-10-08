import { END_YEAR, START_YEAR } from "../dates";
import { type FilterSpec } from "../types/state";

export type FilterValue = string | string[] | number | number[] | null;

type FilterSection = {
  title: string;
  subtitle?: string;
  defaultOpen: boolean;
  filters: FilterSpec[];
};

const dateSection: FilterSection = {
  title: "Date Range",
  defaultOpen: true,
  filters: [
    {
      queryParam: ["start", "end"],
      label: "Date Range",
      alwaysInclude: true,
      default: [`${END_YEAR}-01`, `${END_YEAR}-12`],
      options: {
        type: "static",
        values: [
          {
            value: `${END_YEAR}-12`,
            label: `max`,
          },
          {
            value: `${START_YEAR}-01`,
            label: `min`,
          },
        ],
      },
      component: "month-range",
    },
  ],
};

export const applicationFilters: FilterSection = {
  title: "Pesticide Application",
  subtitle: `Pounds used under label name reflects the ${START_YEAR} to ${END_YEAR} annual average`,
  defaultOpen: false,
  filters: [
    {
      queryParam: "usetype",
      label: "Agricultural Use",
      default: "AG",
      defaultLabel: "Agricultural",
      alwaysInclude: true,
      options: {
        type: "static",
        values: [
          {
            value: "AG",
            label: "Agricultural",
          },
          {
            value: "NON-AG",
            label: "Non-Agricultural (County only)",
          },
          {
            value: "*",
            label: "Both Agricultural and Non-Agricultural",
          },
        ],
      },
      component: "dropdown",
    },
    {
      queryParam: "site",
      label: "Crop or Site",
      options: {
        type: "dynamic",
        value: "site_code",
        label: "site_name",
        lookup: "sites",
      },
      component: "autocomplete",
      subLabel: "Annual Average Pounds of Chemical Applied",
      subcolumn: "yearly_average"
    },
    {
      queryParam: "aerial_ground",
      label: "Application Method",
      options: {
        type: "static",
        values: [
          {
            label: "All",
            value: "*",
          },
          {
            value: "A",
            label: "Aerial",
          },
          {
            value: "G",
            label: "Ground",
          },
          {
            value: "F",
            label: "Fumigation",
          },
          {
            value: "O",
            label: "Other",
          },
        ],
      },
      component: "dropdown",
    },
  ],
};

export const pesticideInfoFilters: FilterSection = {
  title: "Chemical and Product Information",
  subtitle: `Pounds used under label name reflects the ${START_YEAR} to ${END_YEAR} annual average`,
  defaultOpen: false,
  filters: [
    {
      queryParam: "category",
      label: "Chemical Class",
      options: {
        type: "dynamic",
        value: "id",
        label: "label",
        lookup: "chemical_classes",
      },
      component:"autocomplete"
    },
    {
      queryParam: "chemical",
      label: "Active Ingredient (AI)",
      options: {
        type: "dynamic",
        value: "chem_code",
        label: "chem_name",
        lookup: "chemicals",
      },
      component: "autocomplete-no-list",
      subLabel: "Annual Average Pounds of Chemical Applied",
      subcolumn: "yearly_average"
      // optionFilter: {
      //   interface: "slider",
      //   type: ">",
      //   range: [0, 1000000],
      //   column: "lbs_chm_used",
      //   title: "Minimum Pounds Used",
      // }
    },
    {
      queryParam: "product",
      label: "Product",
      options: {
        type: "dynamic",
        value: "product_code",
        label: "product_name",
        // @ts-ignore
        lookup: "products",
      },
      subLabel: "Annual Average Pounds of Chemical Applied",
      subcolumn: "yearly_average",
      component: "autocomplete-no-list",
    },
    {
      queryParam: "ai_type",
      label: "Use Type",
      options: {
        type: "dynamic",
        value: "ai_type_ID",
        label: "ai_type",
        // @ts-ignore
        lookup: "use_types",
      },
      component: "autocomplete",
    },
  ]
}

export const impactFilters: FilterSection = {
  title: "Risk and Impact",
  defaultOpen: false,
  filters: [
    {
      queryParam: "health",
      label: "Health/Environmental Impact",
      options: {
        type: "dynamic",
        lookup: "health",
        value: "id",
        label: "label",
      },
      component: "autocomplete",
    },
    // {
    //   queryParam: "risk",
    //   label: "Risk Category",
    //   options: {
    //     type: "static",
    //     values: [
    //       {
    //         label: "All",
    //         value: "*",
    //       },
    //       {
    //         value: "HIGH",
    //         label: "High",
    //       },
    //       {
    //         value: "LOW",
    //         label: "Low",
    //       },
    //       {
    //         value: "OTHER",
    //         label: "Other",
    //       },
    //     ],
    //   },
    //   component: "dropdown",
    // },
  ]
}

const timeseriesDefaultFilterKeys = ["Date Range", "Agricultural Use", "Crop or Site", "County", "Health/Environmental Impact"]
export const timeseriesViews = [
  {
    label: "Chemical Class",
    mainFilterKey: "Chemical Class",
    filterKeys: [...timeseriesDefaultFilterKeys, "Chemical Class"],
    series: "class",
    dataCol: ["lbs_chm_used"],
    keyCol: "ai_class",
    dateCol: "monthyear",
    sortKeys: ["monthyear","ai_class"],
    labelMapping: "Chemical Class",
    isMultipleCategory: true
    // defaultFilterOptions: [
    //   {
    //     label: "Use Type",
    //     queryParam: "ai_type",
    //     value: [4, 0, 5, 2],
    //     valueLabels: ["Adjuvant", "Fungicide", "Herbicide", "Inseticide"],
    //   },
    // ],
  },
  {
    label: "Use Type",
    mainFilterKey: "Use Type",
    filterKeys: [...timeseriesDefaultFilterKeys, "Use Type"],
    series: "usetype",
    dataCol: ["lbs_chm_used"],
    keyCol: "ai_type",
    dateCol: "monthyear",
    sortKeys: ["monthyear","ai_type"],
    labelMapping: "Use Type",
    // defaultFilterOptions: [
    //   {
    //     label: "Use Type",
    //     queryParam: "ai_type",
    //     value: [4, 0, 5, 2],
    //     valueLabels: ["Adjuvant", "Fungicide", "Herbicide", "Inseticide"],
    //   },
    // ],
  },

  {
    label: "Active Ingredient",
    mainFilterKey: "Active Ingredient (AI)",
    filterKeys: [...timeseriesDefaultFilterKeys, "Active Ingredient (AI)"],
    series: "ai",
    dataCol: ["lbs_chm_used"],
    keyCol: "chem_code",
    dateCol: "monthyear",
    sortKeys: ["monthyear","chem_code"],
    labelMapping: "Active Ingredient (AI)",
    // defaultFilterOptions: [
    //   {
    //     label: "Active Ingredient (AI)",
    //     queryParam: "chemical",
    //     value: ["560", "136"],
    //     valueLabels: ["Sulfur", "Chloropicrin"]
    //   },
    // ],
  },
  {
    label: "Product",
    mainFilterKey: "Product",
    filterKeys: [...timeseriesDefaultFilterKeys, "Product"],
    series: "product",
    dataCol: ["lbs_prd_used"],
    keyCol: "prodno",
    dateCol: "monthyear",
    sortKeys: ["monthyear","prodno"],
    labelMapping: "Product",
    // defaultFilterOptions: [
    //   {
    //     label: "Product",
    //     queryParam: "product",
    //     value: ["62963", "44330"],
    //     valueLabels: ["IAP SUMMER 415 SPRAY OIL", "K-PAM HL"],
    //   },
    // ],
  },
] as const;

export const excludeKeys = ["Date Range", "Agricultural Use", "County", "Crop or Site"];

export const timeseriesFiltersNotDateRange: any[] = timeseriesViews.map((config) => config.filterKeys)
  .flat().filter((key) => !excludeKeys.includes(key));

export const timeseriesFilterSpec: FilterSpec = {
  queryParam: "na",
  label: "Filter Type",
  component: "dropdown",
  options: {
    type: 'static',
    values: timeseriesViews.map((config) => ({
      value: config.label!,
      label: config.label!,
    }))
  }
}
export const geographyFilters: FilterSection = {
  title: "Geography",
  defaultOpen: false,
  filters: [
    {
      queryParam: "county",
      label: "County",
      options: {
        type: "dynamic",
        value: "CountyCode",
        label: "Name",
        // @ts-ignore
        lookup: "counties",
      },
      component: "autocomplete",
    },
  ],
};
const demographyFilters: FilterSection = {
  title: "Demographics",
  defaultOpen: false,
  filters: [
    {
      queryParam: "pctblack",
      label: "Percent Black or African American",
      subLabel: "(minimum percent of population)",
      options: {
        type: "static",
        values: [
          {
            value: 0,
            label: "0%",
          },
          {
            value: 100,
            label: "100%",
          },
        ],
      },
      component: "range",
    },
    {
      queryParam: "pcthispanic",
      label: "Percent Hispanic or Latino",
      subLabel: "(minimum percent of population)",
      options: {
        type: "static",
        values: [
          {
            value: 0,
            label: "0%",
          },
          {
            value: 100,
            label: "100%",
          },
        ],
      },
      component: "range",
    },

    {
      queryParam: "pctwhite",
      label: "Percent Non-Hispanic White",
      subLabel: "(minimum percent of population)",
      options: {
        type: "static",
        values: [
          {
            value: 0,
            label: "0%",
          },
          {
            value: 100,
            label: "100%",
          },
        ],
      },
      component: "range",
    },
    {
      queryParam: "pctasian",
      label: "Percent Asian",
      subLabel: "(minimum percent of population)",
      options: {
        type: "static",
        values: [
          {
            value: 0,
            label: "0%",
          },
          {
            value: 100,
            label: "100%",
          },
        ],
      },
      component: "range",
    },

    {
      queryParam: "pctnativeamerican",
      label: "Percent Native American",
      subLabel: "(minimum percent of population)",
      options: {
        type: "static",
        values: [
          {
            value: 0,
            label: "0%",
          },
          {
            value: 100,
            label: "100%",
          },
        ],
      },
      component: "range",
    },
    {
      queryParam: "pctnativehawaiian",
      label: "Percent Native Hawaiian or Pacific Islander",
      subLabel: "(minimum percent of population)",
      options: {
        type: "static",
        values: [
          {
            value: 0,
            label: "0%",
          },
          {
            value: 100,
            label: "100%",
          },
        ],
      },
      component: "range",
    },
    {
      queryParam: "income",
      label: "Median Household Income",
      subLabel: "(maximum median 2021 household income)",
      options: {
        type: "static",
        values: [
          {
            value: "0",
            label: "0",
          },
          {
            value: "150000",
            label: "150000",
          },
        ],
      },
      component: "range",
    },
  ],
};

export const allFilterSections: FilterSection[] = [
  dateSection,
  applicationFilters,
  pesticideInfoFilters,
  impactFilters,
  geographyFilters,
  demographyFilters,
]

export const allFilterSpecs = allFilterSections.flatMap((section) => section.filters);