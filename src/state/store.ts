import { create } from "zustand";
import { FilterState, State } from "../types/state";
import {
  allFilterSections,
  timeseriesFiltersNotDateRange,
  timeseriesViews,
} from "../config/filters";
import { getMapConfig } from "../config/map";
import { exportData } from "../utils/packageAndZipData";
import { infillTimeseries } from "../utils/timeseries";
import { wrapper } from "../utils/stateUtils";
import { findExistingFilter } from "../utils/findExistingFilter";
import { buildParams, mapQuery, timeseriesQuery } from "../utils/queries";
import { query } from "../utils/db";
import { deepCloneRecords } from "../utils/deepCloneRecords";
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

export let staticData: any = [];
// ACS columns joined onto every geography: Median HH Income, Pop *, Pct *
const isDemographicColumn = (key: string) =>
  key === "Median HH Income" || /^(Pop|Pct) /.test(key);

// demographic filter label -> the ACS columns it relates to
const demographicColumnsByFilter: Record<string, string[]> = {
  "Median Household Income": ["Median HH Income"],
  "Percent Black or African American": ["Pop NH Black", "Pct NH Black"],
  "Percent Hispanic or Latino": ["Pop Hispanic", "Pct Hispanic"],
  "Percent Non-Hispanic White": ["Pop NH White", "Pct NH White"],
  "Percent Asian": ["Pop NH Asian", "Pct NH Asian"],
  "Percent Native American": ["Pop NH AIAN", "Pct NH AIAN"],
  "Percent Native Hawaiian or Pacific Islander": ["Pop NH NHPI", "Pct NH NHPI"],
};

// rows as shown in the data table and downloads
export const cleanRowsForView = (
  view: string,
  rows: Record<string, unknown>[],
  filters: FilterState[] = []
) => {
  if (view !== "map" && view !== "mapDualView") return rows;
  // drop areas with no pesticide use for the current filters
  const used = rows.filter((row) => row.lbs_chm_used != null);
  // demographic columns only ship with the demographic view, and only for applied demographic filters
  const keep = new Set(
    view === "mapDualView"
      ? filters
          .filter((f) => f.value != null)
          .flatMap((f) => demographicColumnsByFilter[f.label] || [])
      : []
  );
  return used.map((row) =>
    Object.fromEntries(
      Object.entries(row).filter(
        ([key]) => !isDemographicColumn(key) || keep.has(key)
      )
    )
  );
};
const timeoutDuration = 500;
let timeoutFn: any = null;
// bumped per query, so a slower superseded query can't overwrite newer staticData
let latestQuery = 0;

const defaultMapConfig = getMapConfig("map");

const defaultViewConfig = {
  view: "map",
  config: {
    filterKeys: defaultMapConfig[0].filterKeys
  } as any
};

export const useStore = create<State>(
  wrapper((set, get) => ({
    download: (format, indices, sortKeys) => {
      const view = get().view;

      const info: any = {
        map: {
          Geography: get().geography,
        },
        timeseries: {
          "Time Series Grouping": get().timeseriesType,
        },
      };
      const filterKeys = get().filterKeys;
      const filters = get().queriedFilters.filter((f) =>
        filterKeys.includes(f.label)
      );
      const availableFiltersNotUsed = filterKeys
        .filter((f) => !filters.find((u) => u.label === f))
        .map((f) => ({
          label: f,
          value: "Not Used",
        }));

      const allFilters = [...filters, ...availableFiltersNotUsed];

      const outputData = cleanRowsForView(
        view,
        indices ? indices.map((i) => staticData[i]) : staticData,
        filters
      );

      const sortFn = !sortKeys
        ? null
        : Array.isArray(sortKeys)
        ? (a: any, b: any) => {
            const aKey = sortKeys.map((key) => a[key]).join("");
            const bKey = sortKeys.map((key) => b[key]).join("");
            return aKey.localeCompare(bKey);
          }
        : (a: any, b: any) => a[sortKeys].localeCompare(b[sortKeys]);

      const sortedOutputData = sortFn ? outputData.sort(sortFn) : outputData;

      exportData(
        format,
        get().view,
        allFilters,
        sortedOutputData,
        view in info ? info[view] : undefined
      );
    },
    timestamp: 0,
    alwaysApplyFilters: localStorage.getItem("alwaysApplyFilters") === "true",
    toggleAlwaysApplyFilters: () => {
      set((state) => {
        const newValue = !state.alwaysApplyFilters;
        localStorage.setItem("alwaysApplyFilters", newValue.toString());
        return { alwaysApplyFilters: newValue };
      });
    },
    loadingState: "unloaded" as State["loadingState"],
    geography: defaultMapConfig[0].layer!,
    mapLayer: "pesticide-use",
    view: defaultViewConfig.view,
    setView: (view: string) => {
      let loadingState: any = 'settings-changed'
      let timeseriesConfig: any = {}

      let uiFilters = get().uiFilters;

      const geography = get().geography;
      const mapViewConfig =
        view === "map" || view === "mapDualView"
          ? getMapConfig(view)?.find((f) => f.layer == geography) ||
            defaultMapConfig[0]
          : ({} as any);

      let filterKeys = timeseriesConfig?.filterKeys || [];
      if (view === "timeseries") {
        const existingFilter = uiFilters.find(
          (f) =>
            timeseriesFiltersNotDateRange.includes(f.label) &&
            (((Array.isArray(f.value || f.valueLabels) ||
              typeof (f.value || f.valueLabels) === "string") &&
              ((f.value as any[])?.length ||
                (f.valueLabels as any[])?.length)) ||
              typeof f.value === "number")
        );
        const existingLabel = existingFilter?.label as string;

        if (existingLabel) {
          timeseriesConfig = timeseriesViews.find((view) =>
            view.filterKeys.includes(existingLabel as any)
          );
          filterKeys = timeseriesConfig.filterKeys || [];
        } else {
          // const newFilters: FilterState[] =
          //   timeseriesConfig?.defaultFilterOptions || [];
          // uiFilters = uiFilters.filter((f) =>
          //   newFilters.every((nf) => nf.queryParam !== f.queryParam)
          // );

          // uiFilters = [...uiFilters, ...newFilters];
          loadingState = 'timeseries-none'
        }
      } else if (view.toLowerCase().includes("map")) {
        filterKeys = mapViewConfig.filterKeys || [];
      }

      const timeseriesType = timeseriesConfig?.label || get()?.timeseriesType;

      set({
        view,
        loadingState,
        geography,
        uiFilters,
        // @ts-ignore
        filterKeys,
        timeseriesType,
      });

      get().executeQuery();
    },
    timeseriesType: undefined,//timeseriesViews[0].label,
    setTimeseriesType: (type: string) => {
      const timeseriesConfig = timeseriesViews.find(
        (view) => view.label === type
      );
      if (timeseriesConfig) {
        const filterKeys = (timeseriesConfig.filterKeys ||
          []) as unknown as string[];
        const previousFilters = get().uiFilters.filter((f) =>
          filterKeys.includes(f.label)
        );
        // const defaultFilter =
        //   timeseriesConfig?.defaultFilterOptions &&
        //   !previousFilters.find(
        //     (f) => f.label === timeseriesConfig?.defaultFilterOptions?.[0].label
        //   )
        //     ? (timeseriesConfig?.defaultFilterOptions as unknown as FilterState[])
        //     : ([] as FilterState[]);
        set({
          timeseriesType: type,
          filterKeys,
          uiFilters: [
            ...previousFilters,
            //  ...defaultFilter
          ],
          loadingState: "timeseries-none",
        });
      }
    },
    queriedFilters: [],
    uiFilters: allFilterSections.flatMap((section) =>
      section.filters
        .filter((f) => f.alwaysInclude)
        .map((filter) => ({
          queryParam: filter.queryParam,
          value: filter.default || null,
          label: filter.label,
          valueLabels: filter.defaultLabel || filter.default || null,
        }))
    ),
    filterKeys: defaultViewConfig.config.filterKeys || [],
    setFilterKeys: (keys) => set({ filterKeys: keys }),
    tooltip: undefined,
    setTooltip: (tooltip) => set({ tooltip }),
    setFilter: (filter: FilterState & { index?: number }) =>
      set((state) => {
        const filterKey = filter.queryParam;
        const existingFilterByKey = findExistingFilter(
          state.uiFilters,
          filterKey
        );
        if (existingFilterByKey) {
          return {
            loadingState: "settings-changed",
            uiFilters: state.uiFilters.map((f) =>
              JSON.stringify(f.queryParam) === JSON.stringify(filterKey)
                ? filter
                : f
            ),
          };
        } else {
          return {
            loadingState: "settings-changed",
            uiFilters: [...state.uiFilters, filter],
          };
        }
      }),
    setLoadingState: (loadingState) => set({ loadingState }),
    executeQuery: async () => {
      const { uiFilters, filterKeys, timeseriesType, view, geography } = get();
      const isMap = view.toLowerCase().includes("map");
      if (!isMap && view !== "timeseries") return;
      const queryId = ++latestQuery;
      set({ loadingState: "loading" });
      const timeseriesConfig = timeseriesViews.find(
        (view) => view.label === timeseriesType
      );
      // if is timeseries and filters that are not date ragen is empty or greater than 10
      // error
      if (view === "timeseries") {
        if (!timeseriesConfig) return;
        const filterState = uiFilters.find(
          (filter) => filter.label === timeseriesConfig.mainFilterKey
        );
        const filterExists = Array.isArray(filterState?.value)
          ? filterState?.value.length > 0
          : filterState?.value !== null;

        if (!filterExists || !filterState) {
          set({
            loadingState: "timeseries-none",
          });
          return;
        }
        const filterGoodLength = Array.isArray(filterState?.value)
          ? filterState?.value.length <= 10
          : true;
        if (!filterGoodLength) {
          set({
            loadingState: "timeseries-too-many",
          });
          return;
        }
      }

      const timestamp = performance.now();
      const agFilter =
        uiFilters.find((f) => f.queryParam === "usetype")?.value !== "AG";

      if (isMap && geography !== "Counties" && agFilter) {
        set({
          loadingState: "ag-on-not-counties",
          queriedFilters: deepCloneRecords(uiFilters),
          timestamp,
        });
        return;
      }

      try {
        const params = buildParams(uiFilters, filterKeys);
        let data = await query(
          view === "timeseries"
            ? timeseriesQuery(timeseriesConfig!.series, params)
            : mapQuery(
                getMapConfig(view).find((c) => c.layer === geography)!.geo,
                params
              )
        );
        // superseded by a newer query, or the filters/layer changed while this one ran (the UI shows "apply changes")
        if (queryId !== latestQuery || get().loadingState !== "loading") return;
        if (view === "timeseries") {
          const dateRange = uiFilters.find(
            (filter) => filter.label === "Date Range"
          );
          data = infillTimeseries(
            data,
            timeseriesConfig,
            dateRange?.value as string[],
            uiFilters
          );
        }
        staticData = data;
        // @ts-ignore
        window.staticData = staticData;
        set({
          loadingState: staticData.length === 0 ? "no-data" : "loaded",
          queriedFilters: deepCloneRecords(uiFilters),
          timestamp,
        });
      } catch (e) {
        if (queryId !== latestQuery || get().loadingState !== "loading") return;
        console.error(e);
        set({ loadingState: "error", timestamp });
      }
    },
    setGeography: (geography) => {
      const view = get().view;
      const geoData = getMapConfig(view).find(
        (config) => config.layer === geography
      );
      if (geoData) {
        set({
          geography,
          loadingState: "settings-changed",
          filterKeys: geoData.filterKeys || [],
        });
      }
    },
    setMapLayer: (mapLayer) => set({ mapLayer }),
    setSaveMessage: (message) => set({ saveMessage: message }),
    saveMessage: undefined,
    saveQueries: (title, format) => {
      const output = {
        uiFilters: get().uiFilters,
        view: get().view,
        geography: get().geography,
        timeseriesType: get().timeseriesType,
        mapLayer: get().mapLayer,
      };

      const date = new Date().toISOString();
      const cleanTitle = title?.length
        ? title
        : `Pesticide Explorer Query ${date}`;
      const compressed = compressToEncodedURIComponent(JSON.stringify(output));
      switch (format) {
        case "download":
          const blob = new Blob([JSON.stringify(output)], {
            type: "application/json",
          });
          const saveUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = saveUrl;
          a.download = `${cleanTitle}.json`;
          a.click();
          set({ saveMessage: "Query JSON downloaded" });
          break;
        case "url":
          const url = new URL(window.location.href);
          url.searchParams.set("query", compressed);
          window.history.pushState({}, "", url.toString());
          // copy to clipboard
          navigator.clipboard.writeText(url.toString());
          set({
            saveMessage: `Use this URL to share your data filter selections with others:\n\n ${url}\n\n(The URL has been copied to your clipboard)`,
          });
          break;
        case "localStorage":
          let prev = JSON.parse(localStorage.getItem("saved-queries") || "[]");
          const titleInUse = prev?.find((f: any) => f.title === cleanTitle);
          if (titleInUse) {
            prev = prev.filter((f: any) => f.title !== cleanTitle);
          }
          prev = [
            ...prev,
            {
              title,
              date: new Date().toISOString(),
              data: compressed,
            },
          ];
          localStorage.setItem("saved-queries", JSON.stringify(prev));
          set({ saveMessage: "Queried saved to your browser" });
          break;
      }
    },
    loadQueries: (title, format, _args) => {
      let args = {
        ...(_args || {}),
      };
      switch (format) {
        case "url":
          const url = new URL(window.location.href);
          const urlQuery = url.searchParams.get("query");
          if (urlQuery) {
            args = JSON.parse(decompressFromEncodedURIComponent(urlQuery));
          }
          break;
        case "download":
          break;
        case "localStorage":
          const prev = JSON.parse(
            localStorage.getItem("saved-queries") || "[]"
          );
          const localStorageQuery = prev.find((f: any) => f.title === title);
          if (localStorageQuery) {
            args = JSON.parse(
              decompressFromEncodedURIComponent(localStorageQuery.data)
            );
          }
          break;
      }
      switch (args.view) {
        case "timeseries":
          const timeseriesType = timeseriesViews.find(
            (view) => view.label === args.timeseriesType
          );
          if (timeseriesType) {
            args = {
              ...args,
              // @ts-ignore
              filterKeys: timeseriesType.filterKeys || [],
            };
          }
          break;
        case "mapDualView":
        case "map":
          const view = args.view || "map";
          const geoData = getMapConfig(view).find(
            (config) => config.layer === args.geography
          );
          if (geoData) {
            args = {
              ...args,
              filterKeys: geoData.filterKeys || [],
            };
            break;
          }
      }
      set({
        ...args,
        loadingState: "settings-changed",
      });
    },
  }))
);

useStore.subscribe((state, prev) => {
  const somethingChanged =
    state.uiFilters !== prev.uiFilters ||
    state.alwaysApplyFilters !== prev.alwaysApplyFilters ||
    state.geography !== prev.geography ||
    state.view !== prev.view;
  if (state.alwaysApplyFilters && somethingChanged) {
    if (timeoutFn) {
      clearTimeout(timeoutFn);
    }
    timeoutFn = setTimeout(() => {
      state.executeQuery();
    }, timeoutDuration);
  }
});
